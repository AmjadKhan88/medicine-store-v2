const express = require('express');
const router  = express.Router();
const { protect, notPharmacist, canDelete } = require('../middleware/auth');
const ctrl    = require('../controllers/patientController');

router.use(protect);
router.get('/',          ctrl.getAllPatients);
router.get('/balances',  ctrl.getAllPatientBalances);
router.get('/:id',       ctrl.getPatient);
router.get('/:id/balance', ctrl.getPatientBalance);
router.post('/',  notPharmacist, ctrl.createPatient);
router.put('/:id', notPharmacist, ctrl.updatePatient);
router.delete('/:id', canDelete, ctrl.deletePatient);

module.exports = router;
