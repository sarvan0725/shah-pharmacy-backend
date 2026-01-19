const db = require('../database');

// GET /api/categories
exports.getCategories = (req, res) => {
  db.all(
    'SELECT id, name, parent_id FROM categories',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
};

// GET /api/categories/tree
exports.getCategoryTree = (req, res) => {
  db.all(
    'SELECT id, name, parent_id FROM categories',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const map = {};
      const tree = [];

      rows.forEach(row => {
        map[row.id] = { ...row, children: [] };
      });

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
