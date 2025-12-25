const express = require('express');
const Database = require('./database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Create new order
router.post('/', (req, res) => {
  const {
    userId,
    items,
    totalAmount,
    deliveryCharge,
    coinsUsed,
    deliveryAddress,
    deliveryDistance,
    paymentMethod,
    notes
  } = req.body;

  const db = Database.getDB();
  const orderNumber = 'SP' + Date.now();
  const coinsEarned = Math.floor(totalAmount / 100); // 1 coin per ₹100

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Create order
    db.run(
      `INSERT INTO orders (user_id, order_number, total_amount, delivery_charge, coins_used, coins_earned, 
       delivery_address, delivery_distance, payment_method, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, orderNumber, totalAmount, deliveryCharge, coinsUsed, coinsEarned, 
       deliveryAddress, deliveryDistance, paymentMethod, notes],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to create order' });
        }

        const orderId = this.lastID;

        // Add order items
        const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)');
        
        items.forEach(item => {
          stmt.run([orderId, item.productId, item.quantity, item.price, item.total]);
        });
        
        stmt.finalize();

        // Update user coins and stats
        db.run(
          'UPDATE users SET coins = coins + ? - ?, total_spent = total_spent + ?, total_orders = total_orders + 1 WHERE id = ?',
          [coinsEarned, coinsUsed, totalAmount, userId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update user stats' });
            }

            // Update product stock
            const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            items.forEach(item => {
              updateStock.run([item.quantity, item.productId]);
            });
            updateStock.finalize();

            db.run('COMMIT');
            res.json({
              success: true,
              orderId,
              orderNumber,
              coinsEarned
            });
          }
        );
      }
    );
  });
});

// Get user orders
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const db = Database.getDB();

  db.all(
    `SELECT o.*, COUNT(oi.id) as item_count 
     FROM orders o 
     LEFT JOIN order_items oi ON o.id = oi.order_id 
     WHERE o.user_id = ? 
     GROUP BY o.id 
     ORDER BY o.created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(orders);
    }
  );
});

// Get order details
router.get('/:orderId', (req, res) => {
  const { orderId } = req.params;
  const db = Database.getDB();

  db.get(
    'SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?',
    [orderId],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get order items
      db.all(
        `SELECT oi.*, p.name as product_name, p.image as product_image 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            ...order,
            items
          });
        }
      );
    }
  );
});

// Update order status (Admin only)
router.put('/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const db = Database.getDB();

  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }

      res.json({ success: true });
    }
  );
});

// Delete order (User can delete their own orders)
router.delete('/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { userId } = req.query;
  const db = Database.getDB();

  // Check if order belongs to user or if admin
  let whereClause = 'id = ?';
  let params = [orderId];
  
  if (userId) {
    whereClause = 'id = ? AND user_id = ?';
    params = [orderId, userId];
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Get order details first
    db.get(`SELECT * FROM orders WHERE ${whereClause}`, params, (err, order) => {
      if (err || !order) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      // Restore product stock
      db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }

        const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        items.forEach(item => {
          updateStock.run([item.quantity, item.product_id]);
        });
        updateStock.finalize();

        // Restore user coins and stats
        db.run(
          'UPDATE users SET coins = coins - ? + ?, total_spent = total_spent - ?, total_orders = total_orders - 1 WHERE id = ?',
          [order.coins_earned, order.coins_used, order.total_amount, order.user_id],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update user stats' });
            }

            // Delete order items
            db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete order items' });
              }

              // Delete order
              db.run('DELETE FROM orders WHERE id = ?', [orderId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to delete order' });
                }

                db.run('COMMIT');
                res.json({ success: true, message: 'Order deleted successfully' });
              });
            });
          }
        );
      });
    });
  });
});

// Get all orders (Admin only)
router.get('/', (req, res) => {
  const { page = 1, limit = 20, status = '', search = '' } = req.query;
  const offset = (page - 1) * limit;
  const db = Database.getDB();

  let sql = `
    SELECT o.*, u.name as user_name, u.phone as user_phone, COUNT(oi.id) as item_count
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.id 
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(orders);
  });
});

module.exports = router;
