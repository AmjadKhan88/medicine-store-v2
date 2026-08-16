const express = require('express');
const router  = express.Router();
const {
  protect,
  nurseOrAbove,
  requirePermission,
} = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/nurseController');

/* ── All nurse routes need auth + subscription ── */
router.use(protect, requireSubscription);

/* ════════════════════════════════
   PATIENT LIST & ALERTS
   Visible to: nurse, doctor, admin
════════════════════════════════ */
router.get('/patients', nurseOrAbove, ctrl.getPatients);
router.get('/alerts',   nurseOrAbove, ctrl.getAlerts);

/* ════════════════════════════════
   MEDICINE REQUESTS
   GET pending  → pharmacist + admin see this to dispense
   DISPENSE     → pharmacist/admin only (not nurse — they only request)
   CANCEL       → nurse who made request OR admin
════════════════════════════════ */
router.get(
  '/requests/pending',
  nurseOrAbove,              // nurse can see their own requests
  ctrl.getPendingRequests
);

router.patch(
  '/requests/:requestId/dispense',
  requirePermission('manageInventory'),  // pharmacist + admin only
  ctrl.dispenseMedicine
);

router.patch(
  '/requests/:requestId/cancel',
  nurseOrAbove,
  ctrl.cancelRequest
);

/* ════════════════════════════════
   PER-ADMISSION ACTIONS
   View detail → nurse/doctor/admin
   Record vitals → nurse/doctor/admin
   Request medicine → nurse/doctor/admin
════════════════════════════════ */
router.get(
  '/:admissionId',
  nurseOrAbove,
  ctrl.getPatientDetail
);

router.get(
  '/:admissionId/vitals',
  nurseOrAbove,
  ctrl.getVitals
);

router.post(
  '/:admissionId/vitals',
  nurseOrAbove,              // nurse records vitals — this is correct
  ctrl.recordVitals
);

router.post(
  '/:admissionId/request',
  nurseOrAbove,
  ctrl.requestMedicine
);

module.exports = router;

// const express = require('express');
// const router  = express.Router();
// const { protect, nurseOrAbove } = require('../middleware/auth');
// const { requireSubscription } = require('../middleware/checkSubscription');
// const ctrl = require('../controllers/nurseController');

// router.use(protect, requireSubscription);

// // Nurse station — patient list + alerts
// router.get('/patients',     ctrl.getPatients);
// router.get('/alerts',       ctrl.getAlerts);

// // Per-admission actions
// router.get('/:admissionId',             ctrl.getPatientDetail);
// router.post('/:admissionId/vitals',     ctrl.recordVitals);
// router.get('/:admissionId/vitals',      ctrl.getVitals);
// router.post('/:admissionId/request',    ctrl.requestMedicine);

// Medicine requests
// router.get('/requests/pending',         ctrl.getPendingRequests);
// router.patch('/requests/:requestId/dispense', ctrl.dispenseMedicine);
// router.patch('/requests/:requestId/cancel',   ctrl.cancelRequest);

// module.exports = router;