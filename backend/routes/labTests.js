const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const upload     = require('../middleware/upload');
const ctrl       = require('../controllers/labTestController');

router.use(protect);
router.use(requireSubscription);

router.get('/',                     ctrl.getAll);
router.get('/stats',                ctrl.getStats);
router.get('/patient/:patientId',   ctrl.getPatientHistory);
router.get('/:id',                  ctrl.getOne);
router.get('/:id/file',             ctrl.downloadFile);

router.post('/',                    ctrl.create);
router.put('/:id',                  ctrl.update);
router.post('/:id/upload',          upload.single('file'), ctrl.uploadFile);
router.delete('/:id/file',          ctrl.deleteFile);
router.patch('/:id/cancel',         ctrl.cancel);

module.exports = router;