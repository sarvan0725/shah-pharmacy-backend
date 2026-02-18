const express = require('express');
const router = express.Router();
const Category = require('../models/Category');


// GET all categories (simple list)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Category fetch failed' });
  }
});








// GET category tree
router.get('/tree', async (req, res) => {
  try {
    const categories = await Category.find().lean();

    const map = {};
    categories.forEach(cat => {
      map[cat._id] = { ...cat, children: [] };
    });

    const tree = [];
    categories.forEach(cat => {
      if (cat.parent) {
        if (map[cat.parent]) {
          map[cat.parent].children.push(map[cat._id]);
        }
      } else {
        tree.push(map[cat._id]);
      }
    });

    res.json(tree);
  } catch (err) {
    console.error('Category tree error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
