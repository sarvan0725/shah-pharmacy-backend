const db = require('../db'); // same db jo product use karta hai

exports.getAllCategories = (req, res) => {
  db.all(
    "SELECT id, name, parent_id FROM categories",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

exports.getCategoryTree = (req, res) => {
  db.all(
    "SELECT id, name, parent_id FROM categories",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const map = {};
      const tree = [];

      rows.forEach(c => {
        map[c.id] = { ...c, children: [] };
      });

      rows.forEach(c => {
        if (c.parent_id === null) {
          tree.push(map[c.id]);
        } else if (map[c.parent_id]) {
          map[c.parent_id].children.push(map[c.id]);
        }
      });

      res.json(tree);
    }
  );
};
