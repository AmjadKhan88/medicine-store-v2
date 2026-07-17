const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/vitalsController');

router.use(protect, requireSubscription);

router.get('/stats',                          ctrl.getStats);
router.get('/critical-alerts',                ctrl.getCriticalAlerts);
router.get('/patient/:patientId',             ctrl.getPatientVitals);
router.get('/patient/:patientId/latest',      ctrl.getLatest);
router.post('/',                              ctrl.record);
router.delete('/:id',                         ctrl.remove);

module.exports = router;