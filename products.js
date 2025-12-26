const express = require('express');
const Database = require('./database');
const router = express.Router();

/* ================================
   GET ALL PRODUCTS
================================ */
router.get('/', (req, res) => {
  const { page = 1, limit = 20, search = '', category = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = Database.getDB();

  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  let params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }

  sql += ' ORDER BY p.name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    let countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    let countParams = [];

    if (search) {
      countSql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
      const s = `%${search}%`;
      countParams.push(s, s, s);
    }

    if (category) {
      countSql += ' AND c.name = ?';
      countParams.push(category);
    }

    db.get(countSql, countParams, (err, count) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count.total,
          pages: Math.ceil(count.total / limit)
        }
      });
    });
  });
});

/* ================================
   ADD PRODUCT (ADMIN)
================================ */
router.post('/', (req, res) => {
  const {
    name,
    category_id,
    price,
    discount_price,
    stock,
    image,
    description,
    brand,
    unit
  } = req.body;

  if (!name || !category_id || !price || !stock) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = Database.getDB();

  db.run(
    `
    INSERT INTO products
    (name, category_id, price, discount_price, stock, image, description, brand, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      category_id,
      price,
      discount_price || price,
      stock,
      image || null,
      description || '',
      brand || '',
      unit || ''
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to add product' });
      }
      res.json({ success: true, productId: this.lastID });
    }
  );
});

/* ================================
   GET CATEGORIES
================================ */
router.get('/categories', (req, res) => {
  const db = Database.getDB();
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

/* ================================
   GET PRODUCT BY ID
================================ */
router.get('/:id', (req, res) => {
  const db = Database.getDB();
  db.get(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ?`,
    [req.params.id],
    (err, product) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    }
  );
});

/* ================================
   UPDATE PRODUCT
================================ */
router.put('/:id', (req, res) => {
  const {
    name,
    category_id,
    price,
    discount_price = price,
    stock,
    image = '',
    description = '',
    brand = '',
    unit = ''
  } = req.body;

  const db = Database.getDB();

  db.run(
    `
    UPDATE products SET
      name = ?, category_id = ?, price = ?, discount_price = ?,
      stock = ?, image = ?, description = ?, brand = ?, unit = ?
    WHERE id = ?
    `,
    [
      name,
      category_id,
      price,
      discount_price,
      stock,
      image,
      description,
      brand,
      unit,
      req.params.id
    ],
    err => {
      if (err) return res.status(500).json({ error: 'Failed to update product' });
      res.json({ success: true });
    }
  );
});

/* ================================
   DELETE PRODUCT (SOFT)
================================ */
router.delete('/:id', (req, res) => {
  const db = Database.getDB();
  db.run(
    'UPDATE products SET is_active = 0 WHERE id = ?',
    [req.params.id],
    err => {
      if (err) return res.status(500).json({ error: 'Failed to delete product' });
      res.json({ success: true });
    }
  );
});

/* ================================
   BULK IMPORT
================================ */
router.post('/bulk-import', (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Products must be an array' });
  }

  const db = Database.getDB();
  const stmt = db.prepare(`
    INSERT INTO products
    (name, category_id, price, discount_price, stock, image, description, brand, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let success = 0;
  let failed = 0;

  products.forEach(p => {
    stmt.run(
      [
        p.name,
        p.category_id,
        p.price,
        p.discount_price || p.price,
        p.stock || 0,
        p.image || null,
        p.description || '',
        p.brand || '',
        p.unit || 'piece'
      ],
      err => (err ? failed++ : success++)
    );
  });

  stmt.finalize();
  res.json({ success: true, imported: success, errors: failed, total: products.length });
});

module.exports = router;
