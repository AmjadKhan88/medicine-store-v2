const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllMedicines, getMedicine, createMedicine, updateMedicine,
  deleteMedicine, getExpiryAlert, getLowStock, updateStock,
} = require('../controllers/medicineController');

router.use(protect);
router.get('/', getAllMedicines);
router.get('/expiry-alerts', getExpiryAlert);
router.get('/low-stock', getLowStock);
router.get('/:id', getMedicine);
router.post('/', createMedicine);
router.put('/:id', updateMedicine);
router.patch('/:id/stock', updateStock);
router.delete('/:id', deleteMedicine);

module.exports = router;
