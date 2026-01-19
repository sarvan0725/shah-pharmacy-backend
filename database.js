const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = path.join(__dirname, 'pharmacy.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.initialize();
      }
    });
  }

  initialize() {
    this.db.serialize(() => {
      this.createTables();
      this.insertDefaultSettings();
      this.insertDefaultDiscounts();
      this.insertDefaultCategories();
      this.insertSubCategories();
      this.insertSubSubCategories();
    });
  }

  createTables() {
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
        parent_id INTEGER,
        level INTEGER DEFAULT 1,
        image TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, parent_id)
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cat_parent ON categories(parent_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cat_level ON categories(level)`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        price REAL NOT NULL,
        discount_price REAL DEFAULT 0,
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
      CREATE TABLE IF NOT EXISTS orders (
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
        is_next_day_order INTEGER DEFAULT 0,
        delivery_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS discounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        auto_apply INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);
  }

  insertDefaultSettings() {
    const settings = [
      ['free_delivery_radius', '3'],
      ['delivery_charge_per_km', '15'],
      ['max_delivery_distance', '25'],
      ['coin_rate', '100'],
      ['shop_name', 'Shah Pharmacy & Mini Mart'],
      ['shop_phone1', '9792997667'],
      ['shop_phone2', '7905190933']
    ];

    settings.forEach(s => {
      this.db.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
        s
      );
    });
  }

  insertDefaultDiscounts() {
    const discounts = [
      ['Shopping Discount 2%', 'percentage', 2, 500, 1],
      ['Shopping Discount 3%', 'percentage', 3, 1000, 1]
    ];

    discounts.forEach(d => {
      this.db.run(
        `INSERT OR IGNORE INTO discounts 
        (title, type, amount, min_order_amount, auto_apply)
        VALUES (?, ?, ?, ?, ?)`,
        d
      );
    });
  }

  insertDefaultCategories() {
    const cats = ['Healthcare', 'Groceries', 'Personal Care', 'Baby Care'];
    cats.forEach((c, i) => {
      this.db.run(
        `INSERT OR IGNORE INTO categories (name, parent_id, level, sort_order)
         VALUES (?, NULL, 1, ?)`,
        [c, i + 1]
      );
    });
  }

  insertSubCategories() {
    const subs = [
      ['Medicines', 'Healthcare'],
      ['Medical Devices', 'Healthcare'],
      ['Food Items', 'Groceries'],
      ['Beverages', 'Groceries'],
      ['Skincare', 'Personal Care'],
      ['Hair Care', 'Personal Care'],
      ['Baby Food', 'Baby Care'],
      ['Diapers', 'Baby Care']
    ];

    subs.forEach(([name, parent]) => {
      this.db.run(`
        INSERT OR IGNORE INTO categories (name, parent_id, level)
        SELECT ?, id, 2 FROM categories WHERE name = ?
      `, [name, parent]);
    });
  }

  insertSubSubCategories() {
    const subs = [
      ['Pain Relief', 'Medicines'],
      ['Antibiotics', 'Medicines'],
      ['Rice & Grains', 'Food Items'],
      ['Cooking Oil', 'Food Items'],
      ['Face Wash', 'Skincare'],
      ['Moisturizers', 'Skincare']
    ];

    subs.forEach(([name, parent]) => {
      this.db.run(`
        INSERT OR IGNORE INTO categories (name, parent_id, level)
        SELECT ?, id, 3 FROM categories WHERE name = ?
      `, [name, parent]);
    });
  }

  getDB() {
    return this.db;
  }
}

module.exports = new Database();
