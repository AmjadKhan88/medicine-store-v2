const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const superAdmin  = require('../middleware/superAdmin');
const ctrl        = require('../controllers/superAdminController');

// All super admin routes require auth + super admin check
router.use(protect, superAdmin);

// Analytics
router.get('/analytics',          ctrl.getPlatformAnalytics);

// Store management
router.get('/stores',             ctrl.getAllStores);
router.patch('/stores/toggle',    ctrl.toggleStoreStatus);
router.post('/stores/extend',     ctrl.extendSubscription);

// Payment requests
router.get('/payments',              ctrl.getPaymentRequests);
router.patch('/payments/:id/approve',ctrl.approvePayment);
router.patch('/payments/:id/reject', ctrl.rejectPayment);

// Support tickets
router.get('/tickets',               ctrl.getAllTickets);
router.get('/tickets/:id',           ctrl.getTicket);
router.post('/tickets/:id/reply',    ctrl.replyToTicket);
router.patch('/tickets/:id/status',  ctrl.updateTicketStatus);

module.exports = router;