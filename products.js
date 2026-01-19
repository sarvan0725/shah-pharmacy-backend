const express = require('express');
const Database = require('./database');
const router = express.Router();

/* =========================
   GET ALL PRODUCTS
========================= */
router.get('/', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const db = Database.getDB();

  const sql = `
    SELECT *
    FROM products
    WHERE is_active = 1
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  db.all(sql, [Number(limit), Number(offset)], (err, products) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(products);
  });
});

/* =========================
   CATEGORY TREE (USER SIDE)
   FIX FOR FRONTEND 404
========================= */
router.get('/categories/tree', (req, res) => {
  try {
    const db = Database.getDB();

    /*
      NOTE:
      Abhi products table hai, categories table future me aa sakta hai.
      Frontend ko crash hone se bachane ke liye
      valid API response diya ja raha hai.
    */

    res.json([]);
  } catch (err) {
    console.error('Category tree error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

/* =========================
   GET PRODUCT BY ID
========================= */
router.get('/:id', (req, res) => {
  const db = Database.getDB();

  db.get(
    'SELECT * FROM products WHERE id = ? AND is_active = 1',
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
   ADD PRODUCT
========================= */
router.post('/', (req, res) => {
  const {
    name,
    category_id,
    price,
    stock,
    discount_price = 0,
    image = null,
    description = '',
    brand = '',
    unit = 'piece'
  } = req.body;

  if (
    !name ||
    category_id === undefined ||
    price === undefined ||
    stock === undefined
  ) {
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
      Number(category_id),
      Number(price),
      Number(discount_price),
      Number(stock),
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
   UPDATE PRODUCT
========================= */
router.put('/:id', (req, res) => {
  const {
    name,
    category_id,
    price,
    stock,
    discount_price = 0,
    image = null,
    description = '',
    brand = '',
    unit = 'piece'
  } = req.body;

  const db = Database.getDB();

  const sql = `
    UPDATE products SET
      name = ?,
      category_id = ?,
      price = ?,
      discount_price = ?,
      stock = ?,
      image = ?,
      description = ?,
      brand = ?,
      unit = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      name,
      Number(category_id),
      Number(price),
      Number(discount_price),
      Number(stock),
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
