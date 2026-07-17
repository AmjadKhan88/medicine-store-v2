const express = require('express');
const router  = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const upload  = require('../middleware/upload');
const ctrl    = require('../controllers/radiologyController');

/* ── Public share route — no auth ── */
router.get('/shared/:token', ctrl.getShared);

/* ── All other routes require auth ── */
router.use(protect, requireSubscription);

router.get('/',                      ctrl.getAll);
router.get('/stats',                 ctrl.getStats);
router.get('/patient/:patientId',    ctrl.getPatientHistory);
router.get('/:id',                   ctrl.getOne);

router.post('/',     notPharmacist,  ctrl.create);
router.delete('/:id',notPharmacist,  ctrl.remove);

/* ── Image upload — multer array (up to 10 images per study) ── */
router.post('/:id/images',
  upload.array('files', 10),
  ctrl.uploadImages
);
router.delete('/:id/images/:imageId', notPharmacist, ctrl.deleteImage);

/* ── Report ── */
router.post('/:id/report',   ctrl.submitReport);
router.patch('/:id/verify',  ctrl.verifyReport);
router.patch('/:id/status',  ctrl.updateStatus);

/* ── Share ── */
router.post('/:id/share',    ctrl.generateShareLink);
router.delete('/:id/share',  ctrl.revokeShareLink);

module.exports = router;