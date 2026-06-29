const express = require('express');
const router  = express.Router();
const { protect, notPharmacist, canDelete } = require('../middleware/auth');
const ctrl    = require('../controllers/medicineController');

router.use(protect);
router.get('/',                ctrl.getAllMedicines);
router.get('/expiry-alerts',   ctrl.getExpiryAlert);
router.get('/low-stock',       ctrl.getLowStock);
router.get('/:id',             ctrl.getMedicine);
router.post('/',    notPharmacist, ctrl.createMedicine);   // pharmacist blocked
router.put('/:id',  notPharmacist, ctrl.updateMedicine);   // pharmacist blocked
router.patch('/:id/stock', notPharmacist, ctrl.updateStock);
router.delete('/:id', canDelete,   ctrl.deleteMedicine);   // admin only

module.exports = router;
