const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/appointmentController');

router.use(protect);
router.use(requireSubscription);

router.get('/',                       ctrl.getAll);
router.get('/today',                  ctrl.getToday);
router.get('/calendar',               ctrl.getCalendar);
router.get('/stats',                  ctrl.getStats);
router.get('/patient/:patientId',     ctrl.getPatientHistory);
router.get('/:id',                    ctrl.getOne);
router.post('/',                      ctrl.create);
router.put('/:id',                    ctrl.update);
router.patch('/:id/complete',         ctrl.completeVisit);
router.patch('/:id/cancel',           ctrl.cancel);

module.exports = router;