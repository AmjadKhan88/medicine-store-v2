const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/bookingController');

/* ── Public routes (no auth) ── */
router.get('/public/:slug',          ctrl.getPublicConfig);
router.get('/public/slots',          ctrl.getAvailableSlots);
router.post('/public/book',          ctrl.submitBooking);
router.get('/public/cancel/:cancelToken',  ctrl.getCancelInfo);
router.post('/public/cancel/:cancelToken', ctrl.cancelBooking);

/* ── Admin routes ── */
router.use(protect, requireSubscription);

router.get('/config',                ctrl.getConfig);
router.put('/config',  notPharmacist,ctrl.updateConfig);
router.get('/stats',                 ctrl.getStats);

router.post('/config/doctors',              notPharmacist, ctrl.addDoctor);
router.put('/config/doctors/:doctorId',     notPharmacist, ctrl.updateDoctor);
router.delete('/config/doctors/:doctorId',  notPharmacist, ctrl.removeDoctor);

module.exports = router;