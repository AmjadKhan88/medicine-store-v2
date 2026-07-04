const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/portalController');

// Protected — doctor/admin manages portal links
router.post('/patients/:id/generate-token', protect, ctrl.generateToken);
router.delete('/patients/:id/token',        protect, ctrl.revokeToken);

// PUBLIC — no auth, token-based access
router.get('/:token',            ctrl.getPortalData);
router.get('/:token/bill/:billId', ctrl.getPortalBill);

module.exports = router;