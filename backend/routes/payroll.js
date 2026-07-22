const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/payrollController');

router.use(protect, requireSubscription, notPharmacist);

/* ── Stats ── */
router.get('/stats',                        ctrl.getStats);

/* ── Employee Profiles ── */
router.get('/profiles',                     ctrl.getProfiles);
router.get('/profiles/:id',                 ctrl.getProfile);
router.post('/profiles',                    ctrl.createProfile);
router.put('/profiles/:id',                 ctrl.updateProfile);

/* ── Payroll ── */
router.get('/',                             ctrl.getMonthlyPayroll);
router.post('/generate',                    ctrl.generatePayroll);
router.put('/records/:id',                  ctrl.updateRecord);
router.patch('/records/:id/paid',           ctrl.markPaid);
router.patch('/mark-all-paid',              ctrl.markAllPaid);
router.get('/annual',                       ctrl.getAnnualSummary);

/* ── Advances ── */
router.get('/advances',                     ctrl.getAdvances);
router.post('/advances',                    ctrl.addAdvance);
router.put('/advances/:id',                 ctrl.updateAdvance);
router.delete('/advances/:id',              ctrl.deleteAdvance);

module.exports = router;