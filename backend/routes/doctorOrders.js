const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/doctorOrderController');

router.use(protect, requireSubscription);

/* ── Stats + global nurse view ── */
router.get('/stats',                              ctrl.getStats);
router.get('/pending',                            ctrl.getPendingOrders);
router.get('/handovers',                          ctrl.getHandovers);

/* ── Per-admission orders ── */
router.get('/:admissionId/orders',                ctrl.getOrders);
router.post('/:admissionId/orders',  notPharmacist, ctrl.createOrder);
router.post('/:admissionId/orders/acknowledge-all', ctrl.acknowledgeAll);

/* ── Per-order actions ── */
router.put('/orders/:orderId',       notPharmacist, ctrl.updateOrder);
router.patch('/orders/:orderId/acknowledge',        ctrl.acknowledgeOrder);
router.patch('/orders/:orderId/complete',           ctrl.completeOrder);
router.patch('/orders/:orderId/cancel', notPharmacist, ctrl.cancelOrder);

/* ── Nursing notes ── */
router.get('/:admissionId/notes',                 ctrl.getNotes);
router.post('/notes',                             ctrl.createNote);
router.put('/notes/:noteId',                      ctrl.updateNote);
router.delete('/notes/:noteId',                   ctrl.deleteNote);

module.exports = router;