const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers — List all customers (Admin only)
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.address, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id) as total_orders,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id AND o.status = 'delivered') as delivered_orders,
        (SELECT AVG(f.rating) FROM feedback f WHERE f.customer_id = u.id) as avg_rating
      FROM users u
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `).all();
    res.json({ customers });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id — Customer detail with order history
router.get('/:id', authenticate, (req, res) => {
  try {
    const customer = db.prepare(`
      SELECT id, username, email, full_name, phone, address, is_active, created_at
      FROM users WHERE id = ? AND role = 'customer'
    `).get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Access check
    if (req.user.role === 'customer' && req.user.id !== customer.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const orders = db.prepare(`
      SELECT id, tracking_id, status, priority, pickup_address, delivery_address, created_at, actual_delivery
      FROM orders WHERE customer_id = ?
      ORDER BY created_at DESC
    `).all(customer.id);

    const feedbacks = db.prepare(`
      SELECT f.*, o.tracking_id 
      FROM feedback f
      JOIN orders o ON f.order_id = o.id
      WHERE f.customer_id = ?
      ORDER BY f.created_at DESC
    `).all(customer.id);

    res.json({ customer, orders, feedbacks });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to fetch customer.' });
  }
});

// POST /api/customers/:id/feedback
router.post('/:id/feedback', authenticate, (req, res) => {
  try {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
      return res.status(400).json({ error: 'Order ID and rating are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    // Verify order belongs to this customer
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(order_id, req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found for this customer.' });
    }

    // Check if feedback already exists
    const existing = db.prepare('SELECT id FROM feedback WHERE order_id = ?').get(order_id);
    if (existing) {
      return res.status(409).json({ error: 'Feedback already submitted for this order.' });
    }

    const result = db.prepare('INSERT INTO feedback (order_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)')
      .run(order_id, req.params.id, rating, comment || '');

    const feedback = db.prepare('SELECT * FROM feedback WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ feedback });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', authenticate, (req, res) => {
  try {
    if (req.user.role === 'customer' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const orders = db.prepare(`
      SELECT o.*, u.full_name as driver_name, v.plate_number as vehicle_plate
      FROM orders o
      LEFT JOIN users u ON o.assigned_driver_id = u.id
      LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `).all(req.params.id);

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

module.exports = router;
