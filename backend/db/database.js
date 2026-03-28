const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'lms.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  // ──────────────── Users ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'driver', 'customer')),
      full_name TEXT,
      phone TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ──────────────── Vehicles ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('truck', 'van', 'bike', 'car')),
      capacity_kg REAL DEFAULT 0,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'on_route', 'maintenance')),
      fuel_level REAL DEFAULT 100,
      mileage REAL DEFAULT 0,
      last_maintenance TEXT,
      next_maintenance TEXT,
      assigned_driver_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_driver_id) REFERENCES users(id)
    )
  `);

  // ──────────────── Orders ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      pickup_address TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      weight REAL,
      dimensions TEXT,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'express', 'urgent')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')),
      assigned_driver_id INTEGER,
      assigned_vehicle_id INTEGER,
      estimated_delivery TEXT,
      actual_delivery TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (assigned_driver_id) REFERENCES users(id),
      FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // ──────────────── Warehouses ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER DEFAULT 1000,
      current_utilization INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ──────────────── Warehouse Items ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouse_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      order_id INTEGER,
      item_description TEXT,
      zone TEXT,
      shelf TEXT,
      pallet TEXT,
      status TEXT DEFAULT 'stored' CHECK(status IN ('stored', 'dispatched', 'returned')),
      received_at TEXT DEFAULT (datetime('now')),
      dispatched_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // ──────────────── Routes ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      vehicle_id INTEGER,
      driver_id INTEGER,
      start_point TEXT NOT NULL,
      end_point TEXT NOT NULL,
      planned_distance REAL,
      planned_duration INTEGER,
      actual_distance REAL,
      actual_duration INTEGER,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'active', 'completed', 'cancelled')),
      waypoints_json TEXT DEFAULT '[]',
      simulation_progress REAL DEFAULT 0,
      simulation_started_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )
  `);

  // ──────────────── Notifications ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      reference_type TEXT,
      reference_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ──────────────── Maintenance Logs ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      cost REAL DEFAULT 0,
      date TEXT DEFAULT (datetime('now')),
      next_due TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // ──────────────── Feedback ────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES users(id)
    )
  `);

  // ──────────────── Seed Admin User ────────────────
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ? AND username = ?').get('admin', 'admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, email, password, role, full_name, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@lms.com', hashedPassword, 'admin', 'System Administrator', '+1234567890');
    console.log('✅ Default admin user created (admin@lms.com / admin123)');
  }

  console.log('✅ Database initialized successfully');
}

// Initialize on first import
initializeDatabase();

module.exports = db;
