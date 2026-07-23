const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const ctrl = require('../controllers/broadcastController');

router.use(protect, requireSubscription);

router.get('/',                       ctrl.getAll);
router.get('/stats',                  ctrl.getStats);
router.get('/:id',                    ctrl.getOne);
router.post('/preview',               ctrl.previewAudience);
router.post('/',    notPharmacist,    ctrl.create);
router.patch('/:id/cancel', notPharmacist, ctrl.cancel);
router.patch('/:id/mark-all-sent',    ctrl.markAllSent);
router.patch('/:id/recipients/:recipientId', ctrl.markRecipient);
router.delete('/:id', notPharmacist,  ctrl.remove);

module.exports = router;