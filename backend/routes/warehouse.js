const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/warehouses
router.get('/', authenticate, (req, res) => {
  try {
    const warehouses = db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM warehouse_items wi WHERE wi.warehouse_id = w.id AND wi.status = 'stored') as items_count
      FROM warehouses w
      ORDER BY w.created_at DESC
    `).all();
    res.json({ warehouses });
  } catch (err) {
    console.error('Get warehouses error:', err);
    res.status(500).json({ error: 'Failed to fetch warehouses.' });
  }
});

// POST /api/warehouses
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Warehouse name is required.' });
    }

    const result = db.prepare('INSERT INTO warehouses (name, location, capacity) VALUES (?, ?, ?)').run(name, location || '', capacity || 1000);
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ warehouse });
  } catch (err) {
    console.error('Create warehouse error:', err);
    res.status(500).json({ error: 'Failed to create warehouse.' });
  }
});

// GET /api/warehouses/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found.' });
    }
    res.json({ warehouse });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch warehouse.' });
  }
});

// PUT /api/warehouses/:id
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    db.prepare(`
      UPDATE warehouses SET name = COALESCE(?, name), location = COALESCE(?, location), capacity = COALESCE(?, capacity), updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, location || null, capacity || null, req.params.id);
    const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    res.json({ warehouse: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update warehouse.' });
  }
});

// GET /api/warehouses/:id/items
router.get('/:id/items', authenticate, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT wi.*, o.tracking_id,
        ROUND((julianday('now') - julianday(wi.received_at)) * 24, 1) as dwell_hours
      FROM warehouse_items wi
      LEFT JOIN orders o ON wi.order_id = o.id
      WHERE wi.warehouse_id = ?
      ORDER BY wi.received_at DESC
    `).all(req.params.id);
    res.json({ items });
  } catch (err) {
    console.error('Get warehouse items error:', err);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});

// POST /api/warehouses/:id/items — Receive item
router.post('/:id/items', authenticate, authorize('admin'), (req, res) => {
  try {
    const { order_id, item_description, zone, shelf, pallet } = req.body;

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found.' });
    }

    const result = db.prepare(`
      INSERT INTO warehouse_items (warehouse_id, order_id, item_description, zone, shelf, pallet)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, order_id || null, item_description || '', zone || '', shelf || '', pallet || '');

    // Update utilization
    const count = db.prepare("SELECT COUNT(*) as cnt FROM warehouse_items WHERE warehouse_id = ? AND status = 'stored'").get(req.params.id);
    db.prepare("UPDATE warehouses SET current_utilization = ?, updated_at = datetime('now') WHERE id = ?").run(count.cnt, req.params.id);

    const item = db.prepare('SELECT * FROM warehouse_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ item });
  } catch (err) {
    console.error('Receive item error:', err);
    res.status(500).json({ error: 'Failed to receive item.' });
  }
});

// PUT /api/warehouses/items/:id/dispatch
router.put('/items/:id/dispatch', authenticate, authorize('admin'), (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM warehouse_items WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    db.prepare("UPDATE warehouse_items SET status = 'dispatched', dispatched_at = datetime('now') WHERE id = ?").run(req.params.id);

    // Update utilization
    const count = db.prepare("SELECT COUNT(*) as cnt FROM warehouse_items WHERE warehouse_id = ? AND status = 'stored'").get(item.warehouse_id);
    db.prepare("UPDATE warehouses SET current_utilization = ?, updated_at = datetime('now') WHERE id = ?").run(count.cnt, item.warehouse_id);

    const updated = db.prepare('SELECT * FROM warehouse_items WHERE id = ?').get(req.params.id);
    res.json({ item: updated });
  } catch (err) {
    console.error('Dispatch item error:', err);
    res.status(500).json({ error: 'Failed to dispatch item.' });
  }
});

module.exports = router;
