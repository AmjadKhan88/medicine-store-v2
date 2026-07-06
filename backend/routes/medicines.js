const express = require('express');
const router  = express.Router();
const { protect, notPharmacist, canDelete } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { requireSubscription, checkLimit }           = require('../middleware/checkSubscription');
const ctrl    = require('../controllers/medicineController');

router.use(protect);
router.use(requireSubscription);
router.get('/',      cache(10),          ctrl.getAllMedicines);
router.get('/expiry-alerts', cache(60),  ctrl.getExpiryAlert);
router.get('/low-stock',       ctrl.getLowStock);
router.get('/find-alternatives', ctrl.findAlternativesByName);
router.get('/:id',             ctrl.getMedicine);
router.get('/:id/substitutes', ctrl.getSubstitutes);
router.post('/',    notPharmacist, checkLimit('medicines'), ctrl.createMedicine);   // pharmacist blocked
router.put('/:id',  notPharmacist, ctrl.updateMedicine);   // pharmacist blocked
router.put('/:id/substitutes', notPharmacist, ctrl.updateSubstitutes); // pharmacist blocked
router.patch('/:id/stock', notPharmacist, ctrl.updateStock);
router.delete('/:id', canDelete,   ctrl.deleteMedicine);   // admin only

module.exports = router;
