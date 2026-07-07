const express    = require('express');
const router     = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/prescriptionController');

const { validate }                  = require('../middleware/validate');
const { createPrescriptionSchema }  = require('../validators/prescriptionValidators');

router.use(protect);
router.use(requireSubscription);

router.get('/',                          ctrl.getAll);
router.get('/stats',                     ctrl.getStats);
router.get('/patient/:patientId',        ctrl.getPatientHistory);
router.get('/:id',                       ctrl.getOne);
router.post('/',        notPharmacist, validate(createPrescriptionSchema),  ctrl.create);
router.put('/:id',      notPharmacist,   ctrl.update);
router.patch('/:id/cancel', notPharmacist, ctrl.cancel);
router.post('/:id/convert-to-bill',      ctrl.convertToBill);

module.exports = router;