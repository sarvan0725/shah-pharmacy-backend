const express = require('express');
const Database = require('../models/database');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const router = express.Router();

// JWT Secret
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing in environment");
}
const JWT_SECRET = process.env.JWT_SECRET;
// Store OTPs temporarily
const otpStore = new Map();

// Generate JWT Token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      phone: user.phone, 
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT Token Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Generate simple 4-digit OTP
function generateSimpleOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'your-email@gmail.com',
    pass: process.env.GMAIL_PASS || 'your-app-password'
  }
});

// Send Email OTP
async function sendEmailOTP(email, otp) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Shah Pharmacy - Login OTP',
    html: `
      <h2>Shah Pharmacy & Mini Mart</h2>
      <p>Your login OTP is: <strong>${otp}</strong></p>
      <p>Valid for 5 minutes.</p>
      <p>Thank you for choosing Shah Pharmacy!</p>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

// Send OTP (Email or Phone)
router.post('/send-otp', async (req, res) => {
  const { contact, type } = req.body; // type: 'email' or 'phone'
  
  if (!contact) {
    return res.status(400).json({ error: 'Contact required' });
  }

  try {
    const otp = generateSimpleOTP();
    
    // Store OTP with 5-minute expiry
    otpStore.set(contact, {
      otp: otp,
      expires: Date.now() + 5 * 60 * 1000
    });

    if (type === 'email') {
      // Send email OTP
      if (process.env.NODE_ENV === 'production') {
        await sendEmailOTP(contact, otp);
      } else {
        console.log(`Email OTP for ${contact}: ${otp}`);
      }
      res.json({ 
        success: true, 
        message: 'OTP sent to your email'
      });
    } else {
      // For phone - show OTP directly (simple approach)
      res.json({ 
        success: true, 
        message: 'Your OTP is: ' + otp,
        showOTP: true,
        otp: otp
      });
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and login
router.post('/verify-otp', (req, res) => {
  const { contact, otp } = req.body;
  
  if (!contact || !otp) {
    return res.status(400).json({ error: 'Contact and OTP required' });
  }

  // Check stored OTP
  const storedData = otpStore.get(contact);
  
  if (!storedData) {
    return res.status(400).json({ error: 'OTP expired or not found' });
  }
  
  if (Date.now() > storedData.expires) {
    otpStore.delete(contact);
    return res.status(400).json({ error: 'OTP expired' });
  }
  
  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  // OTP verified, remove from store
  otpStore.delete(contact);

  const db = Database.getDB();
  
  // Check if user exists
  db.get('SELECT * FROM users WHERE phone = ? OR email = ?', [contact, contact], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      // Existing user - generate JWT token
      const token = generateToken(user);
      
      res.json({
        success: true,
        token: token,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          coins: user.coins,
          totalSpent: user.total_spent,
          totalOrders: user.total_orders
        }
      });
    } else {
      // New user - create account and generate token
      const isEmail = contact.includes('@');
      db.run(
        'INSERT INTO users (phone, email, name) VALUES (?, ?, ?)',
        [isEmail ? null : contact, isEmail ? contact : null, 'User'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const newUser = {
            id: this.lastID,
            phone: isEmail ? null : contact,
            email: isEmail ? contact : null,
            name: 'User'
          };
          
          const token = generateToken(newUser);

          res.json({
            success: true,
            token: token,
            user: {
              id: newUser.id,
              phone: newUser.phone,
              email: newUser.email,
              name: newUser.name,
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

// Get user profile (Protected)
router.get('/profile/:userId', verifyToken, (req, res) => {
  const { userId } = req.params;
  
  // Check if user is accessing their own profile
  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
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

// Update user profile (Protected)
router.put('/profile/:userId', verifyToken, (req, res) => {
  const { userId } = req.params;
  const { name, email, address } = req.body;
  
  // Check if user is updating their own profile
  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
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

// Refresh Token
router.post('/refresh-token', verifyToken, (req, res) => {
  const newToken = generateToken(req.user);
  res.json({ success: true, token: newToken });
});

// Logout (Optional - client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Export middleware for other routes
router.verifyToken = verifyToken;

module.exports = router;
