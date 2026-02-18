const express = require('express');
const Product = require('./models/Product');
const router = express.Router();


/* =========================
   GET ALL PRODUCTS
========================= */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const products = await Product.find({ is_active: true })
      .sort({ _id: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

/* =========================
   GET PRODUCT BY ID
========================= */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.is_active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

/* =========================
   ADD PRODUCT
========================= */
router.post('/', async (req, res) => {
  try {
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

    const newProduct = await Product.create({
      name,
      category_id: Number(category_id),
      price: Number(price),
      discount_price: Number(discount_price),
      stock: Number(stock),
      image,
      description,
      brand,
      unit
    });

    res.json({ success: true, productId: newProduct._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

/* =========================
   UPDATE PRODUCT
========================= */
router.put('/:id', async (req, res) => {
  try {
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

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      category_id: Number(category_id),
      price: Number(price),
      discount_price: Number(discount_price),
      stock: Number(stock),
      image,
      description,
      brand,
      unit
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/* =========================
   DELETE PRODUCT (SOFT)
========================= */
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      is_active: false
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
