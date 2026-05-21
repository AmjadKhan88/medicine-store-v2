const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllPatients, getPatient, createPatient, updatePatient,
  deletePatient, getPatientBalance, getAllPatientBalances,
} = require('../controllers/patientController');

router.use(protect);
router.get('/', getAllPatients);
router.get('/balances', getAllPatientBalances);
router.get('/:id', getPatient);
router.get('/:id/balance', getPatientBalance);
router.post('/', createPatient);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

module.exports = router;
