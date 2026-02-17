const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

/* =========================
   CATEGORY TREE
========================= */
router.get("/tree", async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).lean();

    const map = {};
    const tree = [];

    categories.forEach(cat => {
      map[cat._id] = {
        id: cat._id,
        name: cat.name,
        parent_id: cat.parent_id,
        children: []
      };
    });

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
    console.error("Category tree error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

/* =========================
   ADD CATEGORY
========================= */
router.post("/", async (req, res) => {
  try {
    const { name, parent_id = null } = req.body;

    const category = new Category({
      name,
      parent_id: parent_id || null
    });

    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ error: "Failed to add category" });
  }
});

module.exports = router;
