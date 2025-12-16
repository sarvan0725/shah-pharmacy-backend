const express = require('express');
const Database = require('../models/database');
const router = express.Router();

// Dashboard analytics
router.get('/dashboard', (req, res) => {
  const db = Database.getDB();
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  db.serialize(() => {
    let analytics = {};

    // Today's sales
    db.get(
      "SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE DATE(created_at) = ?",
      [today],
      (err, todayStats) => {
        analytics.today = todayStats || { orders: 0, revenue: 0 };

        // This month's sales
        db.get(
          "SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE strftime('%Y-%m', created_at) = ?",
          [thisMonth],
          (err, monthStats) => {
            analytics.thisMonth = monthStats || { orders: 0, revenue: 0 };

            // Total stats
            db.get(
              "SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders",
              (err, totalStats) => {
                analytics.total = totalStats || { total_orders: 0, total_revenue: 0 };

                // Active users
                db.get(
                  "SELECT COUNT(*) as active_users FROM users WHERE total_orders > 0",
                  (err, userStats) => {
                    analytics.activeUsers = userStats?.active_users || 0;

                    // Low stock products
                    db.all(
                      "SELECT name, stock FROM products WHERE stock < 10 AND is_active = 1 ORDER BY stock ASC LIMIT 10",
                      (err, lowStock) => {
                        analytics.lowStock = lowStock || [];

                        // Recent orders
                        db.all(
                          `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, u.name as user_name 
                           FROM orders o LEFT JOIN users u ON o.user_id = u.id 
                           ORDER BY o.created_at DESC LIMIT 10`,
                          (err, recentOrders) => {
                            analytics.recentOrders = recentOrders || [];

                            // Top products
                            db.all(
                              `SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.total) as revenue
                               FROM order_items oi 
                               LEFT JOIN products p ON oi.product_id = p.id 
                               GROUP BY oi.product_id 
                               ORDER BY total_sold DESC LIMIT 10`,
                              (err, topProducts) => {
                                analytics.topProducts = topProducts || [];

                                res.json(analytics);
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Sales analytics with date range
router.get('/analytics/sales', (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  const db = Database.getDB();

  let dateFormat;
  switch (groupBy) {
    case 'month':
      dateFormat = '%Y-%m';
      break;
    case 'week':
      dateFormat = '%Y-%W';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  let sql = `
    SELECT 
      strftime('${dateFormat}', created_at) as period,
      COUNT(*) as orders,
      SUM(total_amount) as revenue,
      AVG(total_amount) as avg_order_value
    FROM orders 
    WHERE 1=1
  `;
  let params = [];

  if (startDate) {
    sql += ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  sql += ' GROUP BY period ORDER BY period DESC';

  db.all(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Product analytics
router.get('/analytics/products', (req, res) => {
  const db = Database.getDB();

  db.serialize(() => {
    let analytics = {};

    // Product performance
    db.all(
      `SELECT 
        p.id, p.name, p.price, p.stock,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total), 0) as revenue,
        COUNT(DISTINCT oi.order_id) as order_count
       FROM products p 
       LEFT JOIN order_items oi ON p.id = oi.product_id 
       WHERE p.is_active = 1
       GROUP BY p.id 
       ORDER BY total_sold DESC`,
      (err, productPerformance) => {
        analytics.productPerformance = productPerformance || [];

        // Category performance
        db.all(
          `SELECT 
            c.name as category,
            COUNT(DISTINCT p.id) as product_count,
            COALESCE(SUM(oi.quantity), 0) as total_sold,
            COALESCE(SUM(oi.total), 0) as revenue
           FROM categories c 
           LEFT JOIN products p ON c.id = p.category_id 
           LEFT JOIN order_items oi ON p.id = oi.product_id 
           GROUP BY c.id 
           ORDER BY revenue DESC`,
          (err, categoryPerformance) => {
            analytics.categoryPerformance = categoryPerformance || [];

            res.json(analytics);
          }
        );
      }
    );
  });
});

// User analytics
router.get('/analytics/users', (req, res) => {
  const db = Database.getDB();

  db.serialize(() => {
    let analytics = {};

    // Top customers
    db.all(
      `SELECT 
        u.id, u.name, u.phone, u.total_orders, u.total_spent, u.coins,
        DATE(u.created_at) as join_date
       FROM users u 
       WHERE u.total_orders > 0 
       ORDER BY u.total_spent DESC 
       LIMIT 20`,
      (err, topCustomers) => {
        analytics.topCustomers = topCustomers || [];

        // User registration trends
        db.all(
          `SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users
           FROM users 
           WHERE created_at >= date('now', '-30 days')
           GROUP BY DATE(created_at) 
           ORDER BY date DESC`,
          (err, registrationTrends) => {
            analytics.registrationTrends = registrationTrends || [];

            res.json(analytics);
          }
        );
      }
    );
  });
});

// Settings management
router.get('/settings', (req, res) => {
  const db = Database.getDB();

  db.all('SELECT * FROM settings', (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json(settingsObj);
  });
});

router.put('/settings', (req, res) => {
  const settings = req.body;
  const db = Database.getDB();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run([key, value]);
    });

    stmt.finalize((err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update settings' });
      }

      db.run('COMMIT');
      res.json({ success: true, message: 'Settings updated successfully' });
    });
  });
});

// Export data
router.get('/export/:type', (req, res) => {
  const { type } = req.params;
  const { startDate, endDate } = req.query;
  const db = Database.getDB();

  let sql, filename;

  switch (type) {
    case 'orders':
      sql = `
        SELECT 
          o.order_number, o.total_amount, o.delivery_charge, o.status, o.created_at,
          u.name as customer_name, u.phone as customer_phone,
          o.delivery_address, o.payment_method
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id
      `;
      filename = 'orders_export.csv';
      break;

    case 'products':
      sql = `
        SELECT 
          p.name, p.price, p.discount_price, p.stock, p.brand, p.unit,
          c.name as category, p.created_at
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.is_active = 1
      `;
      filename = 'products_export.csv';
      break;

    case 'users':
      sql = `
        SELECT 
          name, phone, email, total_orders, total_spent, coins, created_at
        FROM users 
        WHERE total_orders > 0
      `;
      filename = 'users_export.csv';
      break;

    default:
      return res.status(400).json({ error: 'Invalid export type' });
  }

  let params = [];
  if (startDate && (type === 'orders' || type === 'users')) {
    sql += ' WHERE DATE(created_at) >= ?';
    params.push(startDate);
  }

  if (endDate && (type === 'orders' || type === 'users')) {
    sql += startDate ? ' AND DATE(created_at) <= ?' : ' WHERE DATE(created_at) <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (data.length === 0) {
      return res.json({ data: [], message: 'No data found' });
    }

    // Convert to CSV format
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  });
});

module.exports = router;