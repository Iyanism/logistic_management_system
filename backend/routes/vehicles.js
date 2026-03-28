const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/vehicles
router.get('/', authenticate, (req, res) => {
  try {
    const vehicles = db.prepare(`
      SELECT v.*, u.full_name as driver_name
      FROM vehicles v
      LEFT JOIN users u ON v.assigned_driver_id = u.id
      ORDER BY v.created_at DESC
    `).all();
    res.json({ vehicles });
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// POST /api/vehicles
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { plate_number, type, capacity_kg, fuel_level, mileage, next_maintenance } = req.body;

    if (!plate_number || !type) {
      return res.status(400).json({ error: 'Plate number and type are required.' });
    }

    const existing = db.prepare('SELECT id FROM vehicles WHERE plate_number = ?').get(plate_number);
    if (existing) {
      return res.status(409).json({ error: 'Vehicle with this plate number already exists.' });
    }

    const result = db.prepare(`
      INSERT INTO vehicles (plate_number, type, capacity_kg, fuel_level, mileage, next_maintenance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(plate_number, type, capacity_kg || 0, fuel_level || 100, mileage || 0, next_maintenance || null);

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ vehicle });
  } catch (err) {
    console.error('Create vehicle error:', err);
    res.status(500).json({ error: 'Failed to create vehicle.' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const vehicle = db.prepare(`
      SELECT v.*, u.full_name as driver_name
      FROM vehicles v
      LEFT JOIN users u ON v.assigned_driver_id = u.id
      WHERE v.id = ?
    `).get(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Get maintenance history
    const maintenanceLogs = db.prepare('SELECT * FROM maintenance_logs WHERE vehicle_id = ? ORDER BY date DESC').all(vehicle.id);

    res.json({ vehicle, maintenance_logs: maintenanceLogs });
  } catch (err) {
    console.error('Get vehicle error:', err);
    res.status(500).json({ error: 'Failed to fetch vehicle.' });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { plate_number, type, capacity_kg, status, fuel_level, mileage, next_maintenance, assigned_driver_id } = req.body;

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    db.prepare(`
      UPDATE vehicles SET 
        plate_number = COALESCE(?, plate_number),
        type = COALESCE(?, type),
        capacity_kg = COALESCE(?, capacity_kg),
        status = COALESCE(?, status),
        fuel_level = COALESCE(?, fuel_level),
        mileage = COALESCE(?, mileage),
        next_maintenance = COALESCE(?, next_maintenance),
        assigned_driver_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(plate_number || null, type || null, capacity_kg || null, status || null, fuel_level || null, mileage || null, next_maintenance || null, assigned_driver_id !== undefined ? assigned_driver_id : vehicle.assigned_driver_id, req.params.id);

    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json({ vehicle: updated });
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// POST /api/vehicles/:id/maintenance — Log maintenance
router.post('/:id/maintenance', authenticate, authorize('admin'), (req, res) => {
  try {
    const { type, description, cost, next_due } = req.body;

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    db.prepare(`
      INSERT INTO maintenance_logs (vehicle_id, type, description, cost, next_due)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, type || 'routine', description || '', cost || 0, next_due || null);

    // Update vehicle maintenance dates
    db.prepare(`
      UPDATE vehicles SET 
        last_maintenance = datetime('now'),
        next_maintenance = COALESCE(?, next_maintenance),
        status = 'available',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(next_due || null, req.params.id);

    const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json({ vehicle: updated, message: 'Maintenance logged successfully.' });
  } catch (err) {
    console.error('Maintenance error:', err);
    res.status(500).json({ error: 'Failed to log maintenance.' });
  }
});

module.exports = router;
