const express = require('express');
const Database = require('./database');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const router = express.Router();

/* =========================
   JWT CONFIG
========================= */
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET missing in environment');
}
const JWT_SECRET = process.env.JWT_SECRET;

/* =========================
   OTP STORE (IN-MEMORY)
========================= */
const otpStore = new Map();

/* =========================
   TOKEN HELPERS
========================= */
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

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/* =========================
   OTP HELPERS
========================= */
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/* =========================
   EMAIL CONFIG
========================= */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

async function sendEmailOTP(email, otp) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Shah Pharmacy Login OTP',
    html: `<h3>Your OTP is <b>${otp}</b></h3><p>Valid for 5 minutes</p>`
  });
}

/* =========================
   SEND OTP
========================= */
router.post('/send-otp', async (req, res) => {
  const { contact, type } = req.body;
  if (!contact) return res.status(400).json({ error: 'Contact required' });

  const otp = generateOTP();
  otpStore.set(contact, { otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    if (type === 'email') {
      if (process.env.NODE_ENV === 'production') {
        await sendEmailOTP(contact, otp);
      }
      return res.json({ success: true });
    }

    // Phone OTP (simple)
    res.json({ success: true, otp });
  } catch {
    res.status(500).json({ error: 'OTP failed' });
  }
});

/* =========================
   VERIFY OTP & LOGIN
========================= */
router.post('/verify-otp', (req, res) => {
  const { contact, otp } = req.body;
  const data = otpStore.get(contact);

  if (!data || Date.now() > data.expires || data.otp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(contact);
  const db = Database.getDB();

  db.get(
    'SELECT * FROM users WHERE phone = ? OR email = ?',
    [contact, contact],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'DB error' });

      if (user) {
        return res.json({
          success: true,
          token: generateToken(user),
          user
        });
      }

      const isEmail = contact.includes('@');
      db.run(
        'INSERT INTO users (phone, email, name, coins, total_orders, total_spent) VALUES (?, ?, ?, 0, 0, 0)',
        [isEmail ? null : contact, isEmail ? contact : null, 'User'],
        function () {
          const newUser = {
            id: this.lastID,
            phone: isEmail ? null : contact,
            email: isEmail ? contact : null,
            name: 'User',
            coins: 0,
            total_orders: 0,
            total_spent: 0
          };

          res.json({
            success: true,
            token: generateToken(newUser),
            user: newUser
          });
        }
      );
    }
  );
});

/* =========================
   USER PROFILE
========================= */
router.get('/profile/:id', verifyToken, (req, res) => {
  if (req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = Database.getDB();
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  });
});

/* =========================
   USER STATS (FIXED)
   /users/:id/stats
========================= */
router.get('/users/:id/stats', verifyToken, (req, res) => {
  const db = Database.getDB();
  db.get(
    'SELECT total_orders, total_spent FROM users WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({
        cartItems: 0,
        wishlistItems: 0,
        totalOrders: row?.total_orders || 0,
        totalSpent: row?.total_spent || 0
      });
    }
  );
});

/* =========================
   USER WALLET (FIXED)
   /users/:id/wallet
========================= */
router.get('/users/:id/wallet', verifyToken, (req, res) => {
  const db = Database.getDB();
  db.get(
    'SELECT coins FROM users WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ coins: row?.coins || 0 });
    }
  );
});

/* =========================
   ACTIVE DISCOUNT (FIXED)
   /users/:id/active-discount
========================= */
router.get('/users/:id/active-discount', verifyToken, (req, res) => {
  res.json({
    active: false,
    discountPercent: 0
  });
});

/* =========================
   REFRESH TOKEN
========================= */
router.post('/refresh-token', verifyToken, (req, res) => {
  res.json({ token: generateToken(req.user) });
});

/* =========================
   EXPORT
========================= */
router.verifyToken = verifyToken;
module.exports = router;
