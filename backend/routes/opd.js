const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/opdController');

// Public display — no auth
router.get('/display/:storeId', ctrl.getDisplay);

// All other routes require auth
router.use(protect, requireSubscription);

router.get('/',                ctrl.getToday);
router.get('/stats',           ctrl.getStats);
router.get('/:date',           ctrl.getByDate);

router.post('/register',       ctrl.registerToken);
router.post('/call-next',      ctrl.callNext);
router.post('/:tokenId/call',  ctrl.callToken);
router.patch('/:tokenId/status', ctrl.updateStatus);

router.patch('/queue/toggle',  adminOnly, ctrl.toggleQueue);
router.delete('/queue/reset',  adminOnly, ctrl.resetQueue);

module.exports = router;