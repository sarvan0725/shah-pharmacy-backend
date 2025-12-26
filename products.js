const express = require('express');
const Database = require('./database');
const router = express.Router();

/* =========================
   GET ALL PRODUCTS
========================= */
router.get('/', (req, res) => {
  const { page = 1, limit = 20, search = '', category = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = Database.getDB();

  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  let params = [];

  if (search) {
    const s = `%${search}%`;
    sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
    params.push(s, s, s);
  }

  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }

  sql += ' ORDER BY p.name LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  db.all(sql, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.get(
      'SELECT COUNT(*) as total FROM products WHERE is_active = 1',
      [],
      (err, count) => {
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
      }
    );
  });
});

/* =========================
   ADD PRODUCT (ADMIN)
========================= */
router.post('/', (req, res) => {
  const {
    name,
    category_id,
    price,
    stock,
    image = null,
    description = '',
    brand = '',
    unit = 'piece',
    discount_price = 0
  } = req.body;

  if (!name || !category_id || !price || !stock) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = Database.getDB();

  const sql = `
    INSERT INTO products
    (name, category_id, price, discount_price, stock, image, description, brand, unit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      name,
      category_id,
      price,
      discount_price,
      stock,
      image,
      description,
      brand,
      unit
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

/* =========================
   GET PRODUCT BY ID
========================= */
router.get('/:id', (req, res) => {
  const db = Database.getDB();

  db.get(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND p.is_active = 1`,
    [req.params.id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    }
  );
});

/* =========================
   UPDATE PRODUCT
========================= */
router.put('/:id', (req, res) => {
  const {
    name,
    category_id,
    price,
    discount_price = price,
    stock,
    image = null,
    description = '',
    brand = '',
    unit = 'piece'
  } = req.body;

  const db = Database.getDB();

  db.run(
    `UPDATE products SET
      name = ?,
      category_id = ?,
      price = ?,
      discount_price = ?,
      stock = ?,
      image = ?,
      description = ?,
      brand = ?,
      unit = ?
     WHERE id = ?`,
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
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update product' });
      }
      res.json({ success: true });
    }
  );
});

/* =========================
   DELETE PRODUCT (SOFT)
========================= */
router.delete('/:id', (req, res) => {
  const db = Database.getDB();

  db.run(
    'UPDATE products SET is_active = 0 WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete product' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
