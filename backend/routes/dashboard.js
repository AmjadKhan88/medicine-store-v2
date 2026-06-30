const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboard, getAdvancedReport, getReportExportData } = require('../controllers/dashboardController');

router.get('/', protect, getDashboard);
router.get('/advanced-report',protect, getAdvancedReport);
router.get('/report-export',  protect, getReportExportData);
module.exports = router;
