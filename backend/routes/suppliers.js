const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/supplierController');

router.use(protect);
router.use(requireSubscription);

router.get('/',                          ctrl.getAll);
router.get('/stats',                     ctrl.getStats);
router.get('/outstanding',               ctrl.getOutstandingDashboard);
router.get('/:id',                       ctrl.getOne);
router.get('/:id/purchase-history',      ctrl.getPurchaseHistory);

router.post('/',          adminOnly,     ctrl.create);
router.put('/:id',        adminOnly,     ctrl.update);
router.delete('/:id',     adminOnly,     ctrl.remove);
router.put('/:id/medicines', adminOnly,  ctrl.linkMedicines);
router.post('/:id/payment',  adminOnly,  ctrl.recordPayment);
router.post('/:id/performance',          ctrl.logPerformance);

module.exports = router;