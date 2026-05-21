const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllBills, getBill, createBill, updatePayment, deleteBill } = require('../controllers/billingController');

router.use(protect);
router.get('/', getAllBills);
router.get('/:id', getBill);
router.post('/', createBill);
router.patch('/:id/payment', updatePayment);
router.delete('/:id', deleteBill);

module.exports = router;
