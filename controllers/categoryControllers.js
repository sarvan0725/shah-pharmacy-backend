const db = require('../database');

/**
 * GET /api/categories
 * Flat list of categories
 */
exports.getCategories = (req, res) => {
  db.getDB().all(
    `
    SELECT id, name, parent_id, level, image, sort_order
    FROM categories
    WHERE is_active = 1
    ORDER BY level ASC, sort_order ASC, name ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
};

/**
 * GET /api/categories/tree
 * Nested category tree
 */
exports.getCategoryTree = (req, res) => {
  db.getDB().all(
    `
    SELECT id, name, parent_id, level, image, sort_order
    FROM categories
    WHERE is_active = 1
    ORDER BY level ASC, sort_order ASC, name ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const map = {};
      const tree = [];

      // Step 1: map bana lo
      rows.forEach(row => {
        map[row.id] = {
          ...row,
          children: []
        };
      });

      // Step 2: tree build karo
      rows.forEach(row => {
        if (row.parent_id === null) {
          tree.push(map[row.id]);
        } else if (map[row.parent_id]) {
          map[row.parent_id].children.push(map[row.id]);
        }
      });

      res.json(tree);
    }
  );
};
