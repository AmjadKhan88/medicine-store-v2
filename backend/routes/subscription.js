const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const superAdmin  = require('../middleware/superAdmin');
const ctrl        = require('../controllers/subscriptionController');

// Public - no auth needed
router.get('/plans', ctrl.getPlans);

// Store routes - auth required
router.use(protect);
router.get('/',              ctrl.getSubscription);
router.post('/pay',          ctrl.submitPaymentRequest);
router.delete('/pay',        ctrl.cancelPaymentRequest);

// Super admin routes
router.get('/admin/stores',                  superAdmin, ctrl.getAllStores);
router.get('/admin/requests',                superAdmin, ctrl.getAllRequests);
router.patch('/admin/approve/:id',           superAdmin, ctrl.approvePayment);
router.patch('/admin/reject/:id',            superAdmin, ctrl.rejectPayment);
router.post('/admin/activate',               superAdmin, ctrl.manualActivate);

module.exports = router;