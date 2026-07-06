const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { getDashboard, getAdvancedReport, getReportExportData } = require('../controllers/dashboardController');

router.get('/', protect,cache(30), getDashboard);
router.get('/advanced-report',protect,cache(120), getAdvancedReport);
router.get('/report-export',  protect, getReportExportData);
module.exports = router;
