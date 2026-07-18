const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/accountingController');

router.use(protect, requireSubscription, notPharmacist);

router.get('/stats',            ctrl.getStats);
router.get('/pnl',              ctrl.getPnL);
router.get('/margins',          ctrl.getMedicineMargins);
router.get('/trend',            ctrl.getMonthlyTrend);
router.get('/fbr',              ctrl.getFBRSummary);

router.get('/expenses',         ctrl.getExpenses);
router.post('/expenses',        ctrl.addExpense);
router.put('/expenses/:id',     ctrl.updateExpense);
router.delete('/expenses/:id',  ctrl.deleteExpense);

module.exports = router;