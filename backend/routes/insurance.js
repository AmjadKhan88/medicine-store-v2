const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/insuranceController');

router.use(protect, requireSubscription);

/* ── Stats & Reports ── */
router.get('/stats',                     ctrl.getStats);
router.get('/report',                    ctrl.getPanelReport);

/* ── Panels ── */
router.get('/panels',                    ctrl.getPanels);
router.get('/panels/:id',                ctrl.getPanel);
router.post('/panels',  notPharmacist,   ctrl.createPanel);
router.put('/panels/:id', notPharmacist, ctrl.updatePanel);
router.delete('/panels/:id', notPharmacist, ctrl.deletePanel);

/* ── Patient linking ── */
router.post('/link-patient',             ctrl.linkPatient);
router.delete('/unlink-patient/:patientId', ctrl.unlinkPatient);

/* ── Claims ── */
router.get('/claims',                    ctrl.getClaims);
router.get('/claims/:id',                ctrl.getClaim);
router.post('/claims', notPharmacist,    ctrl.createClaim);
router.patch('/claims/:id/status',       ctrl.updateClaimStatus);
router.delete('/claims/:id', notPharmacist, ctrl.deleteClaim);

/* ── Coverage calculator ── */
router.post('/calculate',                ctrl.calculateCoverage);

module.exports = router;