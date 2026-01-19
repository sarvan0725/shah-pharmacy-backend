const express = require('express');
const Database = require('./database');
const router = express.Router();

/* =========================
   GET USER PROFILE
========================= */
router.get('/:id', (req, res) => {
  const db = Database.getDB();
  const userId = req.params.id;

  db.get(
    `SELECT 
      id, name, phone, email, address,
      coins, total_spent, total_orders, created_at
     FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

/* =========================
   USER STATS (FRONTEND NEED)
========================= */
router.get('/:id/stats', (req, res) => {
  const db = Database.getDB();
  const userId = req.params.id;

  db.get(
    `SELECT 
      total_orders,
      total_spent,
      coins
     FROM users WHERE id = ?`,
    [userId],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        totalOrders: stats?.total_orders || 0,
        totalSpent: stats?.total_spent || 0,
        coins: stats?.coins || 0
      });
    }
  );
});

/* =========================
   USER WALLET (FRONTEND NEED)
========================= */
router.get('/:id/wallet', (req, res) => {
  const db = Database.getDB();
  const userId = req.params.id;

  db.get(
    `SELECT coins FROM users WHERE id = ?`,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        coins: row?.coins || 0
      });
    }
  );
});

/* =========================
   ACTIVE DISCOUNT (FRONTEND NEED)
========================= */
router.get('/:id/active-discount', (req, res) => {
  const db = Database.getDB();

  db.get(
    `SELECT 
      id, title, type, amount, min_order_amount
     FROM discounts
     WHERE is_active = 1
     AND auto_apply = 1
     ORDER BY amount DESC
     LIMIT 1`,
    [],
    (err, discount) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!discount) {
        return res.json(null);
      }

      res.json(discount);
    }
  );
});

/* =========================
   UPDATE USER PROFILE
========================= */
router.put('/:id', (req, res) => {
  const db = Database.getDB();
  const userId = req.params.id;
  const { name, email, address } = req.body;

  db.run(
    `UPDATE users 
     SET name = ?, email = ?, address = ?
     WHERE id = ?`,
    [name, email, address, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update user' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
