const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl       = require('../controllers/auditLogController');

router.use(protect);
router.get('/',                    ctrl.getLogs);
router.get('/stats',               ctrl.getStats);
router.get('/entity/:entityId',    ctrl.getEntityLogs);
router.delete('/clear', adminOnly, ctrl.clearOldLogs);

module.exports = router;