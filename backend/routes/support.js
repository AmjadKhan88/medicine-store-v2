const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const ctrl        = require('../controllers/superAdminController');

router.use(protect);

router.get('/',          ctrl.getMyTickets);
router.post('/',         ctrl.createTicket);
router.post('/:id/reply',ctrl.replyToMyTicket);

module.exports = router;