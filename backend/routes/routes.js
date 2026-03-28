const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/routes
router.get('/', authenticate, (req, res) => {
  try {
    let routes;
    if (req.user.role === 'admin') {
      routes = db.prepare(`
        SELECT r.*, o.tracking_id, o.status as order_status,
          u.full_name as driver_name,
          v.plate_number as vehicle_plate
        FROM routes r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN users u ON r.driver_id = u.id
        LEFT JOIN vehicles v ON r.vehicle_id = v.id
        ORDER BY r.created_at DESC
      `).all();
    } else {
      routes = db.prepare(`
        SELECT r.*, o.tracking_id, o.status as order_status,
          v.plate_number as vehicle_plate
        FROM routes r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN vehicles v ON r.vehicle_id = v.id
        WHERE r.driver_id = ?
        ORDER BY r.created_at DESC
      `).all(req.user.id);
    }

    // Calculate simulation progress for active routes
    routes = routes.map(route => {
      if (route.status === 'active' && route.simulation_started_at && route.planned_duration) {
        const startedAt = new Date(route.simulation_started_at).getTime();
        const now = Date.now();
        const elapsed = (now - startedAt) / 1000; // seconds
        const progress = Math.min((elapsed / (route.planned_duration * 60)) * 100, 100);
        return { ...route, simulation_progress: Math.round(progress * 10) / 10 };
      }
      return route;
    });

    res.json({ routes });
  } catch (err) {
    console.error('Get routes error:', err);
    res.status(500).json({ error: 'Failed to fetch routes.' });
  }
});

// POST /api/routes — Create route for an order
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { order_id, start_point, end_point, planned_distance, planned_duration, waypoints } = req.body;

    if (!order_id || !start_point || !end_point) {
      return res.status(400).json({ error: 'Order ID, start point, and end point are required.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Check if route already exists for this order
    const existingRoute = db.prepare('SELECT id FROM routes WHERE order_id = ?').get(order_id);
    if (existingRoute) {
      return res.status(409).json({ error: 'Route already exists for this order.' });
    }

    const result = db.prepare(`
      INSERT INTO routes (order_id, vehicle_id, driver_id, start_point, end_point, planned_distance, planned_duration, waypoints_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order_id, order.assigned_vehicle_id, order.assigned_driver_id, start_point, end_point, planned_distance || 0, planned_duration || 0, JSON.stringify(waypoints || []));

    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ route });
  } catch (err) {
    console.error('Create route error:', err);
    res.status(500).json({ error: 'Failed to create route.' });
  }
});

// GET /api/routes/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const route = db.prepare(`
      SELECT r.*, o.tracking_id, o.status as order_status,
        o.pickup_address, o.delivery_address,
        u.full_name as driver_name,
        v.plate_number as vehicle_plate, v.type as vehicle_type
      FROM routes r
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN users u ON r.driver_id = u.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found.' });
    }

    // Calculate live simulation progress
    if (route.status === 'active' && route.simulation_started_at && route.planned_duration) {
      const startedAt = new Date(route.simulation_started_at).getTime();
      const now = Date.now();
      const elapsed = (now - startedAt) / 1000;
      route.simulation_progress = Math.min(Math.round((elapsed / (route.planned_duration * 60)) * 1000) / 10, 100);

      // Auto-complete if simulation done
      if (route.simulation_progress >= 100) {
        db.prepare("UPDATE routes SET status = 'completed', simulation_progress = 100, updated_at = datetime('now') WHERE id = ?").run(route.id);
        db.prepare("UPDATE orders SET status = 'delivered', actual_delivery = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(route.order_id);
        if (route.vehicle_id) {
          db.prepare("UPDATE vehicles SET status = 'available', assigned_driver_id = NULL, updated_at = datetime('now') WHERE id = ?").run(route.vehicle_id);
        }
        route.status = 'completed';
        route.simulation_progress = 100;
      }
    }

    res.json({ route });
  } catch (err) {
    console.error('Get route error:', err);
    res.status(500).json({ error: 'Failed to fetch route.' });
  }
});

// PUT /api/routes/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const { actual_distance, actual_duration, status, waypoints } = req.body;

    db.prepare(`
      UPDATE routes SET 
        actual_distance = COALESCE(?, actual_distance),
        actual_duration = COALESCE(?, actual_duration),
        status = COALESCE(?, status),
        waypoints_json = COALESCE(?, waypoints_json),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(actual_distance || null, actual_duration || null, status || null, waypoints ? JSON.stringify(waypoints) : null, req.params.id);

    const updated = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
    res.json({ route: updated });
  } catch (err) {
    console.error('Update route error:', err);
    res.status(500).json({ error: 'Failed to update route.' });
  }
});

module.exports = router;
