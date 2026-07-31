const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { protect }          = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/ragController');

/* ── Multer — memory storage (no disk writes) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },  // 20MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/json',
    ];
    const allowedExt = ['pdf','docx','txt','md','json'];
    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, MD, JSON`));
    }
  },
});

router.use(protect);

/* ── Super admin only ── */
router.post('/upload',       upload.single('file'), ctrl.uploadDocument);
router.post('/upload-text',  ctrl.uploadText);
router.get('/documents',     ctrl.getDocuments);
router.delete('/documents/:id', ctrl.deleteDocument);
router.get('/collection',    ctrl.getCollectionInfo);

/* ── All authenticated users ── */
router.get('/medicine/:name',  requireSubscription, ctrl.getMedicineInfo);
router.post('/search',         requireSubscription, ctrl.search);
router.post('/chunks',         requireSubscription, ctrl.retrieveChunks);

module.exports = router;