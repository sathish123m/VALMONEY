'use strict';

const router = require('express').Router();

const controller = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, mailLimiter } = require('../middleware/rate-limit');
const v = require('../validators');

// Public
router.post('/register', authLimiter, validate(v.registerSchema), controller.register);
router.post('/login', authLimiter, validate(v.loginSchema), controller.login);
router.post('/forgot-password', mailLimiter, validate(v.forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.resetPasswordSchema), controller.resetPassword);

// Authenticated
router.get('/me', requireAuth, controller.me);
router.patch('/me', requireAuth, validate(v.updateProfileSchema), controller.updateProfile);
router.delete('/me', requireAuth, validate(v.deleteAccountSchema), controller.deleteAccount);
router.post('/change-password', requireAuth, authLimiter, validate(v.changePasswordSchema), controller.changePassword);
router.post('/verify-email', requireAuth, mailLimiter, controller.requestEmailVerification);
router.put('/verify-email', requireAuth, validate(v.verifyEmailSchema), controller.confirmEmailVerification);

module.exports = router;
