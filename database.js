const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = path.join(__dirname, '../pharmacy.db');

    this.db = new sqlite3.Database(dbPath, err => {
      if (err) {
        console.error('❌ DB error:', err.message);
        return;
      }

      console.log('✅ Connected to SQLite');
      this.createTables();
    });
  }

  createTables() {
    this.db.serialize(() => {

      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          name TEXT,
          email TEXT,
          address TEXT,
          coins INTEGER DEFAULT 0,
          total_spent REAL DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category_id INTEGER,
          price REAL NOT NULL,
          discount_price REAL,
          stock INTEGER DEFAULT 0,
          image TEXT,
          description TEXT,
          brand TEXT,
          unit TEXT DEFAULT 'piece',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      this.insertDefaultSettings();
    });
  }

  insertDefaultSettings() {
    const defaults = [
      ['shop_name', 'Shah Pharmacy & Mini Mart'],
      ['shop_phone1', '9792997667'],
      ['shop_phone2', '7905190933'],
      ['delivery_charge_per_km', '15'],
      ['free_delivery_radius', '3']
    ];

    defaults.forEach(([key, value]) => {
      this.db.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
        [key, value],
        err => {
          if (err) console.error('❌ settings insert:', err.message);
        }
      );
    });
  }

  getDB() {
    return this.db;
  }
}

module.exports = new Database();


