const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/appointmentController');

const { validate }                  = require('../middleware/validate');
const { createAppointmentSchema, updateAppointmentSchema, completeVisitSchema } = require('../validators/appointmentValidators');

router.use(protect);
router.use(requireSubscription);

router.get('/',                       ctrl.getAll);
router.get('/today',                  ctrl.getToday);
router.get('/calendar',               ctrl.getCalendar);
router.get('/stats',                  ctrl.getStats);
router.get('/patient/:patientId',     ctrl.getPatientHistory);
router.get('/:id',                    ctrl.getOne);
router.post('/',              validate(createAppointmentSchema),        ctrl.create);
router.put('/:id',            validate(updateAppointmentSchema),        ctrl.update);
router.patch('/:id/complete', validate(completeVisitSchema),        ctrl.completeVisit);
router.patch('/:id/cancel',           ctrl.cancel);

module.exports = router;