const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/nurseController');

router.use(protect, requireSubscription);

// Nurse station — patient list + alerts
router.get('/patients',     ctrl.getPatients);
router.get('/alerts',       ctrl.getAlerts);

// Per-admission actions
router.get('/:admissionId',             ctrl.getPatientDetail);
router.post('/:admissionId/vitals',     ctrl.recordVitals);
router.get('/:admissionId/vitals',      ctrl.getVitals);
router.post('/:admissionId/request',    ctrl.requestMedicine);

// Medicine requests
router.get('/requests/pending',         ctrl.getPendingRequests);
router.patch('/requests/:requestId/dispense', ctrl.dispenseMedicine);
router.patch('/requests/:requestId/cancel',   ctrl.cancelRequest);

module.exports = router;