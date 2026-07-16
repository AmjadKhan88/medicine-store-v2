const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/bloodBankController');

router.use(protect, requireSubscription);

// Inventory
router.get('/inventory',           ctrl.getInventory);
router.get('/stats',               ctrl.getStats);
router.get('/units',               ctrl.getUnits);
router.post('/units',              ctrl.addUnit);
router.put('/units/:id',           ctrl.updateUnit);
router.post('/units/:id/issue',    ctrl.issueUnit);
router.post('/units/:id/reserve',  ctrl.reserveUnit);
router.patch('/units/:id/release', ctrl.releaseReservation);
router.patch('/units/:id/discard', ctrl.discardUnit);

// Donors
router.get('/donors',              ctrl.getDonors);
router.get('/donors/:id',          ctrl.getDonor);
router.post('/donors',             ctrl.addDonor);
router.put('/donors/:id',          ctrl.updateDonor);

module.exports = router;