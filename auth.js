const express = require('express');
const Database = require('./database');
const router = express.Router();

// Send OTP (Mock implementation)
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: 'Valid 10-digit phone number required' });
  }

  // Mock OTP - In production, integrate with SMS service
  const otp = '123456';
  
  res.json({ 
    success: true, 
    message: 'OTP sent successfully',
    otp: otp // Remove in production
  });
});

// Verify OTP and login
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP required' });
  }

  // Mock verification - In production, verify actual OTP
  if (otp !== '123456') {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  const db = Database.getDB();
  
  // Check if user exists
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      // Existing user
      res.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          coins: user.coins,
          totalSpent: user.total_spent,
          totalOrders: user.total_orders
        }
      });
    } else {
      // New user - create account
      db.run(
        'INSERT INTO users (phone, name) VALUES (?, ?)',
        [phone, 'User'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          res.json({
            success: true,
            user: {
              id: this.lastID,
              phone: phone,
              name: 'User',
              coins: 0,
              totalSpent: 0,
              totalOrders: 0
            }
          });
        }
      );
    }
  });
});

// Get user profile
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const db = Database.getDB();

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      address: user.address,
      coins: user.coins,
      totalSpent: user.total_spent,
      totalOrders: user.total_orders,
      memberSince: user.created_at
    });
  });
});

// Update user profile
router.put('/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const { name, email, address } = req.body;
  const db = Database.getDB();

  db.run(
    'UPDATE users SET name = ?, email = ?, address = ? WHERE id = ?',
    [name, email, address, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.json({ success: true, message: 'Profile updated successfully' });
    }
  );
});

module.exports = router;
