const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { requireSubscription, checkLimit }           = require('../middleware/checkSubscription');
const ctrl       = require('../controllers/staffController');

const { validate }           = require('../middleware/validate');
const { addStaffSchema, updateStaffSchema } = require('../validators/staffValidators');

router.use(protect);
router.use(adminOnly); // all staff routes are admin-only
router.use(requireSubscription);

router.get('/',                   ctrl.getStaff);
router.post('/', checkLimit('staff'),   validate(addStaffSchema),           ctrl.addStaff);
router.put('/:id',                      validate(updateStaffSchema),        ctrl.updateStaff);
router.patch('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.removeStaff);

module.exports = router;