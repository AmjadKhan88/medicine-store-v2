const express = require('express');
const router  = express.Router();
const { protect, canDelete } = require('../middleware/auth');
const { requireSubscription, checkLimit }           = require('../middleware/checkSubscription');
const ctrl    = require('../controllers/billingController');
const Bill = require('../models/Bill');
const emailService = require('../utils/emailService');

const { validate, validateQuery }   = require('../middleware/validate');
const { createBillSchema, updatePaymentSchema } = require('../validators/billingValidators');
const { billingQuerySchema }        = require('../validators/queryValidators');

router.use(protect);
router.use(requireSubscription);

router.get('/',  validateQuery(billingQuerySchema),  ctrl.getAllBills);
router.get('/:id', ctrl.getBill);
router.post('/', checkLimit('billsPerMonth'), validate(createBillSchema),  ctrl.createBill);             // all roles can bill
router.patch('/:id/payment',  validate(updatePaymentSchema), ctrl.updatePayment);
router.delete('/:id', canDelete, ctrl.deleteBill); // admin only
router.post('/:id/email', protect, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('patient', 'email name phone');
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const patEmail = bill.patient?.email;
    if (!patEmail)
      return res.status(400).json({ success: false, message: 'Patient has no email address' });

    const storeOwner = await require('../models/User').findOne({ _id: req.storeId });
    await emailService.sendInvoiceEmail({
      email:       patEmail,
      patientName: bill.patientName,
      bill,
      storeName:   storeOwner?.storeName || 'MediStore Pharmacy',
      storePhone:  storeOwner?.phone     || '',
    });

    res.json({ success: true, message: `Invoice emailed to ${patEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


