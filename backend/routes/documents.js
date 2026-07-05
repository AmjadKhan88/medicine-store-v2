const express    = require('express');
const router     = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const { requireSubscription }    = require('../middleware/checkSubscription');
const upload     = require('../middleware/upload');
const ctrl       = require('../controllers/documentController');

router.use(protect);
router.use(requireSubscription);

router.get('/',                              ctrl.getAll);
router.get('/stats',                         ctrl.getStats);
router.get('/:entityType/:entityId',         ctrl.getForEntity);

router.post('/', upload.single('file'),      ctrl.upload);
router.put('/:id', notPharmacist,            ctrl.update);
router.patch('/:id/archive',                 ctrl.toggleArchive);
router.delete('/:id', notPharmacist,         ctrl.remove);

module.exports = router;