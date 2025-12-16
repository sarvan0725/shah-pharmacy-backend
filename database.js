const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = path.join(__dirname, '../pharmacy.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT,
        address TEXT,
        coins INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
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
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_number TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        delivery_charge REAL DEFAULT 0,
        coins_used INTEGER DEFAULT 0,
        coins_earned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        delivery_address TEXT,
        delivery_distance REAL,
        payment_method TEXT DEFAULT 'cod',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Order items table
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        invoice_number TEXT UNIQUE NOT NULL,
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`,

      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) console.error('Table creation error:', err.message);
      });
    });

    // Insert default settings
    this.insertDefaultSettings();
  }

  insertDefaultSettings() {
    const defaultSettings = [
      ['free_delivery_radius', '3'],
      ['delivery_charge_per_km', '15'],
      ['max_delivery_distance', '25'],
      ['coin_rate', '100'],
      ['shop_name', 'Shah Pharmacy & Mini Mart'],
      ['shop_address', 'Banjariya Road, Near Nacal\'s National Academy Junior, Khalilabad - Sant Kabir Nagar'],
      ['shop_phone1', '9792997667'],
      ['shop_phone2', '7905190933']
    ];

    defaultSettings.forEach(([key, value]) => {
      this.db.run(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    });
  }

  getDB() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) console.error('Database close error:', err.message);
        else console.log('Database connection closed');
      });
    }
  }
}

module.exports = new Database();