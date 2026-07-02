const express = require('express');
const router  = express.Router();
const { protect, canDelete } = require('../middleware/auth');
const { requireSubscription, checkLimit }           = require('../middleware/checkSubscription');
const ctrl    = require('../controllers/billingController');

router.use(protect);
router.use(requireSubscription);

router.get('/',    ctrl.getAllBills);
router.get('/:id', ctrl.getBill);
router.post('/', checkLimit('billsPerMonth'),  ctrl.createBill);             // all roles can bill
router.patch('/:id/payment', ctrl.updatePayment);
router.delete('/:id', canDelete, ctrl.deleteBill); // admin only

module.exports = router;


