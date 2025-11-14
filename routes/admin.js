const express = require('express');
const { protect } = require('../middleware/auth');
const { getPendingUsers, approveUser, rejectUser } = require('../controllers/adminController');
const router = express.Router();

router.get('/pending', protect, getPendingUsers);
router.post('/approve/:userId', protect, approveUser);
router.post('/reject/:userId', protect, rejectUser);

module.exports = router;