const express    = require('express');
const router     = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl       = require('../controllers/backupController');

router.use(protect);
router.use(adminOnly);

router.get('/stats',            ctrl.getBackupStats);
router.get('/export',           ctrl.exportBackup);
router.get('/export/medicines', ctrl.exportMedicines);
router.get('/export/patients',  ctrl.exportPatients);
router.post('/import',          ctrl.importBackup);

module.exports = router;