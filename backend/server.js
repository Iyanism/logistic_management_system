const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize database (creates tables + seeds admin)
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────── Middleware ────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────── API Routes ────────────────
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const vehicleRoutes = require('./routes/vehicles');
const warehouseRoutes = require('./routes/warehouse');
const routeRoutes = require('./routes/routes');
const customerRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ──────────────── Health Check ────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────── Error Handler ────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────── Start Server ────────────────
app.listen(PORT, () => {
  console.log(`🚀 LMS Backend running on http://localhost:${PORT}`);
});

module.exports = app;
