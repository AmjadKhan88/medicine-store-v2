const express = require('express');
const router  = express.Router();
const { protect, notPharmacist, canDelete } = require('../middleware/auth');
const { requireSubscription, checkLimit }           = require('../middleware/checkSubscription');
const ctrl    = require('../controllers/patientController');

const { validate, validateQuery }   = require('../middleware/validate');
const { createPatientSchema, updatePatientSchema } = require('../validators/patientValidators');
const { patientQuerySchema }        = require('../validators/queryValidators');

router.use(protect);
router.use(requireSubscription);

router.get('/',     validateQuery(patientQuerySchema),     ctrl.getAllPatients);
router.get('/balances',  ctrl.getAllPatientBalances);
router.get('/:id',       ctrl.getPatient);
router.get('/:id/balance', ctrl.getPatientBalance);
router.post('/',  notPharmacist,checkLimit('patients'),     validate(createPatientSchema), ctrl.createPatient);
router.put('/:id', notPharmacist, validate(updatePatientSchema), ctrl.updatePatient);
router.delete('/:id', canDelete, ctrl.deletePatient);

module.exports = router;
