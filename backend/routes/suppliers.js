const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/supplierController');

const { validate }           = require('../middleware/validate');
const { createSupplierSchema, updateSupplierSchema, recordPaymentSchema } = require('../validators/supplierValidators');

router.use(protect);
router.use(requireSubscription);

router.get('/',                          ctrl.getAll);
router.get('/stats',                     ctrl.getStats);
router.get('/outstanding',               ctrl.getOutstandingDashboard);
router.get('/:id',                       ctrl.getOne);
router.get('/:id/purchase-history',      ctrl.getPurchaseHistory);

router.post('/',          adminOnly,     validate(createSupplierSchema),  ctrl.create);
router.put('/:id',        adminOnly,     validate(updateSupplierSchema), ctrl.update);
router.delete('/:id',     adminOnly,     ctrl.remove);
router.put('/:id/medicines', adminOnly,  ctrl.linkMedicines);
router.post('/:id/payment',  adminOnly,  validate(recordPaymentSchema), ctrl.recordPayment);
router.post('/:id/performance',          ctrl.logPerformance);

module.exports = router;