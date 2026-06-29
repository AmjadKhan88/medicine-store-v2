const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl       = require('../controllers/staffController');

router.use(protect);
router.use(adminOnly); // all staff routes are admin-only

router.get('/',                   ctrl.getStaff);
router.post('/',                  ctrl.addStaff);
router.put('/:id',                ctrl.updateStaff);
router.patch('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.removeStaff);

module.exports = router;