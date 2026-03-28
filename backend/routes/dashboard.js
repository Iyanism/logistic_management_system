const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, authorize('admin'), (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
    const inTransitOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'in_transit'").get().count;
    const deliveredOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'").get().count;

    const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
    const availableVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'").get().count;
    const onRouteVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_route'").get().count;
    const maintenanceVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'maintenance'").get().count;

    const totalDrivers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get().count;
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;

    // On-time delivery rate
    const deliveredWithEstimate = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered' AND estimated_delivery IS NOT NULL").get().count;
    const onTimeDeliveries = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered' AND estimated_delivery IS NOT NULL AND actual_delivery <= estimated_delivery").get().count;
    const onTimeRate = deliveredWithEstimate > 0 ? Math.round((onTimeDeliveries / deliveredWithEstimate) * 100) : 100;

    // Warehouse stats
    const warehouses = db.prepare('SELECT SUM(capacity) as total_capacity, SUM(current_utilization) as total_utilized FROM warehouses').get();
    const warehouseUtilization = warehouses.total_capacity > 0
      ? Math.round((warehouses.total_utilized / warehouses.total_capacity) * 100)
      : 0;

    // Recent orders (last 7 days)
    const recentOrdersByDay = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Orders by priority
    const ordersByPriority = db.prepare(`
      SELECT priority, COUNT(*) as count FROM orders GROUP BY priority
    `).all();

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `).all();

    // Unread notifications count
    const unreadNotifications = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0").get(req.user.id).count;

    res.json({
      stats: {
        orders: { total: totalOrders, pending: pendingOrders, in_transit: inTransitOrders, delivered: deliveredOrders },
        vehicles: { total: totalVehicles, available: availableVehicles, on_route: onRouteVehicles, maintenance: maintenanceVehicles },
        users: { drivers: totalDrivers, customers: totalCustomers },
        onTimeRate,
        warehouseUtilization,
        unreadNotifications
      },
      charts: {
        recentOrdersByDay,
        ordersByPriority,
        ordersByStatus
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// GET /api/dashboard/alerts — Rule-based alerts
router.get('/alerts', authenticate, authorize('admin'), (req, res) => {
  try {
    const alerts = [];

    // 1. Shipments behind schedule
    const delayedOrders = db.prepare(`
      SELECT tracking_id, estimated_delivery, status
      FROM orders
      WHERE status IN ('assigned', 'in_transit')
        AND estimated_delivery IS NOT NULL
        AND estimated_delivery < datetime('now')
    `).all();
    for (const order of delayedOrders) {
      alerts.push({
        type: 'shipment_delayed',
        severity: 'high',
        title: 'Shipment Delayed',
        message: `Order ${order.tracking_id} is past its estimated delivery time.`,
        reference: order.tracking_id
      });
    }

    // 2. Vehicles due for maintenance
    const maintenanceDue = db.prepare(`
      SELECT plate_number, next_maintenance
      FROM vehicles
      WHERE next_maintenance IS NOT NULL
        AND next_maintenance <= datetime('now', '+3 days')
        AND status != 'maintenance'
    `).all();
    for (const vehicle of maintenanceDue) {
      alerts.push({
        type: 'maintenance_due',
        severity: 'medium',
        title: 'Vehicle Maintenance Due',
        message: `Vehicle ${vehicle.plate_number} is due for maintenance by ${vehicle.next_maintenance}.`,
        reference: vehicle.plate_number
      });
    }

    // 3. Warehouse dwell time exceeded (items stored > 48 hours)
    const longDwellItems = db.prepare(`
      SELECT wi.id, wi.item_description, w.name as warehouse_name,
        ROUND((julianday('now') - julianday(wi.received_at)) * 24, 1) as dwell_hours
      FROM warehouse_items wi
      JOIN warehouses w ON wi.warehouse_id = w.id
      WHERE wi.status = 'stored'
        AND julianday('now') - julianday(wi.received_at) > 2
    `).all();
    for (const item of longDwellItems) {
      alerts.push({
        type: 'dwell_time',
        severity: 'low',
        title: 'Excessive Dwell Time',
        message: `Item "${item.item_description || 'Unknown'}" has been in ${item.warehouse_name} for ${item.dwell_hours} hours.`,
        reference: `warehouse_item_${item.id}`
      });
    }

    // 4. High warehouse utilization (>80%)
    const fullWarehouses = db.prepare(`
      SELECT name, current_utilization, capacity,
        ROUND((CAST(current_utilization AS REAL) / capacity) * 100, 1) as utilization_pct
      FROM warehouses
      WHERE CAST(current_utilization AS REAL) / capacity > 0.8
    `).all();
    for (const wh of fullWarehouses) {
      alerts.push({
        type: 'warehouse_capacity',
        severity: 'medium',
        title: 'High Warehouse Utilization',
        message: `${wh.name} is at ${wh.utilization_pct}% capacity.`,
        reference: wh.name
      });
    }

    // 5. Pending orders without assignment
    const unassignedOrders = db.prepare(`
      SELECT tracking_id, created_at,
        ROUND((julianday('now') - julianday(created_at)) * 24, 1) as hours_pending
      FROM orders
      WHERE status = 'pending' AND assigned_driver_id IS NULL
        AND julianday('now') - julianday(created_at) > 0.5
    `).all();
    for (const order of unassignedOrders) {
      alerts.push({
        type: 'unassigned_order',
        severity: 'medium',
        title: 'Order Awaiting Assignment',
        message: `Order ${order.tracking_id} has been pending for ${order.hours_pending} hours.`,
        reference: order.tracking_id
      });
    }

    res.json({ alerts: alerts.sort((a, b) => {
      const severity = { high: 0, medium: 1, low: 2 };
      return (severity[a.severity] || 3) - (severity[b.severity] || 3);
    })});
  } catch (err) {
    console.error('Dashboard alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// GET /api/dashboard/drivers — List drivers (for Admin assignments)
router.get('/drivers', authenticate, authorize('admin'), (req, res) => {
  try {
    const drivers = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.phone, u.is_active,
        (SELECT COUNT(*) FROM orders o WHERE o.assigned_driver_id = u.id AND o.status IN ('assigned', 'in_transit')) as active_orders
      FROM users u
      WHERE u.role = 'driver' AND u.is_active = 1
      ORDER BY active_orders ASC
    `).all();
    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

module.exports = router;
