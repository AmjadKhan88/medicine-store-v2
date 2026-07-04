const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/pushController');

// Public — frontend needs VAPID key before auth
router.get('/vapid-public-key', ctrl.getVapidKey);

// Protected
router.post('/subscribe',   protect, ctrl.subscribe);
router.post('/unsubscribe', protect, ctrl.unsubscribe);
router.post('/test',        protect, ctrl.sendTest);

module.exports = router;