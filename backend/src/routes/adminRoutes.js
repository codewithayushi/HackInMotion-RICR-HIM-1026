const express = require('express');
const router = express.Router();
const { getDashboardStats, getTrends } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard-stats', protect, authorize('admin'), getDashboardStats);
router.get('/trends', protect, authorize('admin'), getTrends);

module.exports = router;
