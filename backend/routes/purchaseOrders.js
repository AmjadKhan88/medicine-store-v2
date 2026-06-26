const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const ctrl       = require('../controllers/purchaseOrderController');

router.use(protect);
router.get('/',           ctrl.getAll);
router.get('/stats',      ctrl.getStats);
router.get('/:id',        ctrl.getOne);
router.post('/',          ctrl.create);
router.patch('/:id/receive', ctrl.receiveOrder);
router.patch('/:id/payment', ctrl.recordPayment);
router.patch('/:id/status',  ctrl.updateStatus);
router.delete('/:id',     ctrl.deleteOrder);

module.exports = router;