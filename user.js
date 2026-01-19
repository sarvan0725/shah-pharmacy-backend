const express = require('express');
const Database = require('./database');
const authRouter = require('./auth'); // for verifyToken
const router = express.Router();

const verifyToken = authRouter.verifyToken;

/* =========================
   USER STATS
   GET /api/users/:id/stats
========================= */
router.get('/:id/stats', verifyToken, (req, res) => {
  const userId = parseInt(req.params.id);

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = Database.getDB();

  const sql = `
    SELECT 
      total_orders AS totalOrders,
      total_spent AS totalSpent,
      coins
    FROM users
    WHERE id = ?
  `;

  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      totalOrders: row.totalOrders || 0,
      totalSpent: row.totalSpent || 0,
      coins: row.coins || 0
    });
  });
});

/* =========================
   USER WALLET
   GET /api/users/:id/wallet
========================= */
router.get('/:id/wallet', verifyToken, (req, res) => {
  const userId = parseInt(req.params.id);

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = Database.getDB();

  db.get(
    'SELECT coins FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        coins: row ? row.coins : 0
      });
    }
  );
});

/* =========================
   ACTIVE DISCOUNT (AUTO APPLY)
   GET /api/users/:id/active-discount
========================= */
router.get('/:id/active-discount', verifyToken, (req, res) => {
  const userId = parseInt(req.params.id);

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const db = Database.getDB();

  const sql = `
    SELECT *
    FROM discounts
    WHERE is_active = 1
      AND auto_apply = 1
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY min_order_amount ASC
    LIMIT 1
  `;

  db.get(sql, [], (err, discount) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!discount) {
      return res.json({ discount: null });
    }

    res.json({
      discount: {
        id: discount.id,
        title: discount.title,
        type: discount.type,
        amount: discount.amount,
        minOrderAmount: discount.min_order_amount
      }
    });
  });
});

module.exports = router;
