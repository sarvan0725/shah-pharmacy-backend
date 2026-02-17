const express = require('express');
const Database = require('../database');
const router = express.Router();

// CATEGORY TREE
router.get('/tree', (req, res) => {
  const db = Database.getDB();

  if (!db) {
    return res.status(500).json({ error: 'DB not initialized' });
  }

  const sql = `
    SELECT id, name, parent_id
    FROM categories
    WHERE is_active = 1
    ORDER BY parent_id ASC, name ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Category tree error:', err);
      return res.status(500).json({ error: 'Category query failed' });
    }

    const map = {};
    const tree = [];

    rows.forEach(c => {
      map[c.id] = { ...c, children: [] };
    });

    rows.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        tree.push(map[c.id]);
      }
    });

    res.json(tree);
  });
});

module.exports = router;
