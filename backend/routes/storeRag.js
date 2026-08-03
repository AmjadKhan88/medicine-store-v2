const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect }             = require('../middleware/auth');
const { requireSubscription } = require('../middleware/checkSubscription');
const ctrl = require('../controllers/storeRagController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/markdown', 'application/json'];
    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (allowed.includes(file.mimetype) || ['pdf','docx','txt','md','json'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, DOCX, TXT, MD, JSON'));
    }
  },
});

router.use(protect, requireSubscription);

/* ── Management (owner only) ── */
router.get('/stats',                 ctrl.getStats);
router.get('/documents',             ctrl.getDocuments);
router.post('/upload',    upload.single('file'), ctrl.uploadDocument);
router.post('/upload-text',          ctrl.uploadText);
router.delete('/documents/:id',      ctrl.deleteDocument);

/* ── Query (all authenticated users of this store) ── */
router.post('/query',                ctrl.query);
router.get('/medicine/:name',        ctrl.queryMedicine);

module.exports = router;