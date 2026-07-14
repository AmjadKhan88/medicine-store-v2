const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/ipdController');

router.use(protect, requireSubscription);

// Admissions
router.get('/',         ctrl.getAll);
router.get('/stats',    ctrl.getStats);
router.get('/:id',      ctrl.getOne);
router.post('/',        ctrl.create);
router.post('/:id/discharge',       notPharmacist, ctrl.discharge);
router.post('/:id/payment',                        ctrl.recordPayment);

// Medicine orders (doctor)
router.post('/:id/orders',                   notPharmacist, ctrl.addMedicineOrder);
router.patch('/:id/orders/:orderId/stop',    notPharmacist, ctrl.stopMedicineOrder);

// Charges
router.post('/:id/charges',                  ctrl.addCharge);
router.delete('/:id/charges/:chargeId',      notPharmacist, ctrl.removeCharge);

// MAR (nurse)
router.get('/:id/mar',                       ctrl.getMAR);
router.patch('/mar/:id/doses/:doseId',       ctrl.administerDose);

module.exports = router;