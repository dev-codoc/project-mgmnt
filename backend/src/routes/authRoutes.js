const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, getAllUsers, updateUserRole } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../middleware/validators');

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/role', protect, authorize('admin'), updateUserRole);

module.exports = router;
