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


router.get('/tree', async (req, res) => {
  try {
    const categories = await Category.find().lean();

    const map = {};

    // Create map of all categories
    categories.forEach(cat => {
      map[cat._id] = { ...cat, children: [] };
    });

    const tree = [];

    categories.forEach(cat => {
      if (cat.parent_id) {
        if (map[cat.parent_id]) {
          map[cat.parent_id].children.push(map[cat._id]);
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






// ADD new category
router.post("/", async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    const category = new Category({
      name,
      parent_id: parent_id || null,
    });

    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    console.error("Category create error:", err);
    res.status(500).json({ error: "Category creation failed" });
  }
});




module.exports = router;
