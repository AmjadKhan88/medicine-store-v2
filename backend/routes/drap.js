const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/drapController');

router.use(protect, requireSubscription);

router.get('/stats',                ctrl.getStats);

/* ── Controlled medicines register ── */
router.get('/controlled',           ctrl.getControlledRegister);

/* ── Batch tracking ── */
router.get('/batch',                ctrl.getBatchReport);

/* ── Expiry destruction ── */
router.get('/destructions',         ctrl.getDestructions);
router.get('/destructions/expired', ctrl.getExpiredMedicines);
router.post('/destructions',        ctrl.addDestruction);
router.put('/destructions/:id',     ctrl.updateDestruction);
router.delete('/destructions/:id',  notPharmacist, ctrl.deleteDestruction);

/* ── Supplier purchase records ── */
router.get('/suppliers',            ctrl.getSupplierRecords);

/* ── Compliance report ── */
router.get('/report',               ctrl.getComplianceReport);

module.exports = router;