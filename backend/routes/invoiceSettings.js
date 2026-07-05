const express    = require('express');
const router     = express.Router();
const { protect, notPharmacist } = require('../middleware/auth');
const upload     = require('../middleware/upload');
const ctrl       = require('../controllers/invoiceSettingsController');

router.use(protect);

router.get('/',              ctrl.getSettings);
router.put('/', notPharmacist, ctrl.updateSettings);
router.post('/logo', notPharmacist, upload.single('logo'), ctrl.uploadLogo);
router.delete('/logo', notPharmacist, ctrl.removeLogo);

module.exports = router;