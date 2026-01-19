const express = require('express');
const router = express.Router();

// ✅ FILE NAME FIX (plural)
const {
  getCategories,
  getCategoryTree
} = require('../controllers/categoryControllers');

// GET /api/categories
router.get('/', getCategories);

// GET /api/categories/tree
router.get('/tree', getCategoryTree);

module.exports = router;
