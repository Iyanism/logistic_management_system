const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders — List orders (role-based)
router.get('/', authenticate, (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = db.prepare(`
        SELECT o.*, 
          u1.full_name as customer_name, u1.email as customer_email,
          u2.full_name as driver_name,
          v.plate_number as vehicle_plate
        FROM orders o
        LEFT JOIN users u1 ON o.customer_id = u1.id
        LEFT JOIN users u2 ON o.assigned_driver_id = u2.id
        LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
        ORDER BY o.created_at DESC
      `).all();
    } else if (req.user.role === 'driver') {
      orders = db.prepare(`
        SELECT o.*, 
          u1.full_name as customer_name,
          v.plate_number as vehicle_plate
        FROM orders o
        LEFT JOIN users u1 ON o.customer_id = u1.id
        LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
        WHERE o.assigned_driver_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.id);
    } else {
      orders = db.prepare(`
        SELECT o.*, 
          u2.full_name as driver_name,
          v.plate_number as vehicle_plate
        FROM orders o
        LEFT JOIN users u2 ON o.assigned_driver_id = u2.id
        LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
      `).all(req.user.id);
    }
    res.json({ orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// POST /api/orders — Create order
router.post('/', authenticate, (req, res) => {
  try {
    const { pickup_address, delivery_address, weight, dimensions, priority, notes, customer_id } = req.body;

    if (!pickup_address || !delivery_address) {
      return res.status(400).json({ error: 'Pickup and delivery addresses are required.' });
    }

    const trackingId = 'LMS-' + uuidv4().split('-')[0].toUpperCase();
    const actualCustomerId = req.user.role === 'admin' && customer_id ? customer_id : req.user.id;

    const result = db.prepare(`
      INSERT INTO orders (tracking_id, customer_id, pickup_address, delivery_address, weight, dimensions, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(trackingId, actualCustomerId, pickup_address, delivery_address, weight || null, dimensions || null, priority || 'normal', notes || null);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

    // Notify admins
    const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const notifyStmt = db.prepare('INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)');
    for (const admin of admins) {
      notifyStmt.run(admin.id, 'order_ready', 'New Order Placed', `Order ${trackingId} is ready for assignment.`, 'order', order.id);
    }

    res.status(201).json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// GET /api/orders/track/:trackingId — Public tracking
router.get('/track/:trackingId', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT tracking_id, status, pickup_address, delivery_address, priority, estimated_delivery, actual_delivery, created_at
      FROM orders WHERE tracking_id = ?
    `).get(req.params.trackingId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found with this tracking ID.' });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Tracking failed.' });
  }
});

// GET /api/orders/:id — Order detail
router.get('/:id', authenticate, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, 
        u1.full_name as customer_name, u1.email as customer_email, u1.phone as customer_phone,
        u2.full_name as driver_name, u2.phone as driver_phone,
        v.plate_number as vehicle_plate, v.type as vehicle_type
      FROM orders o
      LEFT JOIN users u1 ON o.customer_id = u1.id
      LEFT JOIN users u2 ON o.assigned_driver_id = u2.id
      LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Check access
    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'driver' && order.assigned_driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get route info if exists
    const route = db.prepare('SELECT * FROM routes WHERE order_id = ?').get(order.id);

    // Get feedback
    const feedback = db.prepare('SELECT * FROM feedback WHERE order_id = ?').get(order.id);

    res.json({ order, route, feedback });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// PUT /api/orders/:id — Update order (Admin: assign driver/vehicle)
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { assigned_driver_id, assigned_vehicle_id, status, estimated_delivery, priority, notes } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let newStatus = status || order.status;
    // Auto-set status to 'assigned' when driver and vehicle are assigned
    if (assigned_driver_id && assigned_vehicle_id && order.status === 'pending') {
      newStatus = 'assigned';
    }

    db.prepare(`
      UPDATE orders SET 
        assigned_driver_id = COALESCE(?, assigned_driver_id),
        assigned_vehicle_id = COALESCE(?, assigned_vehicle_id),
        status = ?,
        estimated_delivery = COALESCE(?, estimated_delivery),
        priority = COALESCE(?, priority),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(assigned_driver_id || null, assigned_vehicle_id || null, newStatus, estimated_delivery || null, priority || null, notes || null, req.params.id);

    // Notify driver if newly assigned
    if (assigned_driver_id && assigned_driver_id !== order.assigned_driver_id) {
      db.prepare('INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(assigned_driver_id, 'order_assigned', 'New Order Assigned', `Order ${order.tracking_id} has been assigned to you.`, 'order', order.id);

      // Update vehicle status
      if (assigned_vehicle_id) {
        db.prepare("UPDATE vehicles SET status = 'on_route', assigned_driver_id = ?, updated_at = datetime('now') WHERE id = ?")
          .run(assigned_driver_id, assigned_vehicle_id);
      }
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ order: updated });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// PUT /api/orders/:id/status — Driver updates status (start/complete trip)
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Drivers can only update their own orders
    if (req.user.role === 'driver' && order.assigned_driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your assigned order.' });
    }

    const validTransitions = {
      'assigned': ['in_transit'],
      'in_transit': ['delivered']
    };

    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({ error: `Cannot transition from '${order.status}' to '${status}'.` });
    }

    const updates = { status };
    if (status === 'delivered') {
      updates.actual_delivery = new Date().toISOString();
      // Free up vehicle
      if (order.assigned_vehicle_id) {
        db.prepare("UPDATE vehicles SET status = 'available', assigned_driver_id = NULL, updated_at = datetime('now') WHERE id = ?")
          .run(order.assigned_vehicle_id);
      }
      // Update route
      db.prepare("UPDATE routes SET status = 'completed', simulation_progress = 100, updated_at = datetime('now') WHERE order_id = ?")
        .run(order.id);
    }

    if (status === 'in_transit') {
      // Start simulation
      db.prepare("UPDATE routes SET status = 'active', simulation_started_at = datetime('now'), updated_at = datetime('now') WHERE order_id = ?")
        .run(order.id);
    }

    db.prepare(`
      UPDATE orders SET status = ?, actual_delivery = COALESCE(?, actual_delivery), updated_at = datetime('now')
      WHERE id = ?
    `).run(status, updates.actual_delivery || null, req.params.id);

    // Notify admin
    const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const notifyStmt = db.prepare('INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)');
    const msgType = status === 'in_transit' ? 'trip_started' : 'trip_completed';
    const msgTitle = status === 'in_transit' ? 'Trip Started' : 'Trip Completed';
    const msgBody = status === 'in_transit'
      ? `Driver has started trip for order ${order.tracking_id}.`
      : `Order ${order.tracking_id} has been delivered.`;
    for (const admin of admins) {
      notifyStmt.run(admin.id, msgType, msgTitle, msgBody, 'order', order.id);
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ order: updated });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

module.exports = router;
