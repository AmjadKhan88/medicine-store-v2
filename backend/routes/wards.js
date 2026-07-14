const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/wardController');

router.use(protect);
router.use(requireSubscription);

router.get('/',                                   ctrl.getAll);
router.get('/report',                             ctrl.getReport);
router.get('/:id',                                ctrl.getOne);
router.post('/',             notPharmacist,        ctrl.create);
router.put('/:id',           notPharmacist,        ctrl.update);
router.delete('/:id',        notPharmacist,        ctrl.remove);

// Bed actions
router.post('/:id/beds/:bedId/admit',             ctrl.admitPatient);
router.post('/:id/beds/:bedId/discharge',         ctrl.dischargePatient);
router.patch('/:id/beds/:bedId/status',           ctrl.updateBedStatus);

module.exports = router;