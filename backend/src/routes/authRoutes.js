const express = require('express');
const router = express.Router();
const {
  initiateRegistration,
  verifyRegistration,
  resendOTP,
  initiateForgotPassword,
  verifyForgotPassword,
  login,
  getMe,
  updateProfile,
  deleteAccount
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Registration & OTP Routes
router.post('/register/initiate', initiateRegistration);
router.post('/register/verify', verifyRegistration);
router.post('/register', initiateRegistration); // Default register initiates OTP flow

// Resend OTP & Forgot Password Routes
router.post('/otp/resend', resendOTP);
router.post('/forgot-password/initiate', initiateForgotPassword);
router.post('/forgot-password/verify', verifyForgotPassword);

// Authentication & Profile Routes
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;
