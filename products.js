const express = require('express');
const Database = require('./database');
const router = express.Router();

// Get all products with pagination and search
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
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
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

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    let countParams = [];

    if (search) {
      countSql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
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
          page: parseInt(page),
          limit: parseInt(limit),
          total: count.total,
          pages: Math.ceil(count.total / limit)
        }
      });
    });
  });
});

// Get categories
router.get('/categories', (req, res) => {
  const db = Database.getDB();

  db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(categories);
  });
});

// Get product by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = Database.getDB();

  db.get(
    'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
    [id],
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

// Add new product (Admin only)
router.post('/', (req, res) => {
  const { name, category_id, price, discount_price, stock, image, description, brand, unit } = req.body;
  const db = Database.getDB();

  db.run(
    'INSERT INTO products (name, category_id, price, discount_price, stock, image, description, brand, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, category_id, price, discount_price, stock, image, description, brand, unit],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add product' });
      }

      res.json({ success: true, productId: this.lastID });
    }
  );
});

// Update product (Admin only)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, category_id, price, discount_price, stock, image, description, brand, unit } = req.body;
  const db = Database.getDB();

  db.run(
    'UPDATE products SET name = ?, category_id = ?, price = ?, discount_price = ?, stock = ?, image = ?, description = ?, brand = ?, unit = ? WHERE id = ?',
    [name, category_id, price, discount_price, stock, image, description, brand, unit, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update product' });
      }

      res.json({ success: true });
    }
  );
});

// Delete product (Admin only)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = Database.getDB();

  db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    res.json({ success: true });
  });
});

// Bulk import products
router.post('/bulk-import', (req, res) => {
  const { products } = req.body;
  const db = Database.getDB();

  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Products must be an array' });
  }

  const stmt = db.prepare('INSERT INTO products (name, category_id, price, discount_price, stock, image, description, brand, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  let successCount = 0;
  let errorCount = 0;

  products.forEach(product => {
    stmt.run([
      product.name,
      product.category_id,
      product.price,
      product.discount_price || null,
      product.stock || 0,
      product.image || null,
      product.description || null,
      product.brand || null,
      product.unit || 'piece'
    ], function(err) {
      if (err) {
        errorCount++;
      } else {
        successCount++;
      }
    });
  });

  stmt.finalize();

  res.json({
    success: true,
    imported: successCount,
    errors: errorCount,
    total: products.length
  });
});

module.exports = router;
