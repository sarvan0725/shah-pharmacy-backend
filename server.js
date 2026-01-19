const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Database
Database.init();

// Routes
app.use('/api/auth', require('./auth'));
app.use('/api/products', require('./products'));
app.use('/api/orders', require('./orders'));
app.use('/api/users', require('./users'));
app.use('/api/admin', require('./admin'));
app.use('/api/upload', require('./upload'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Shah Pharmacy Backend Running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shah Pharmacy Backend running on port ${PORT}`);
  console.log(`📊 Health check: ${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT}/api/health`);
});
