const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

// Public authentication routes
router.post('/login', authController.loginStaff);
router.post('/table-session', authController.loginTable);
router.post('/refresh', authController.refreshTokens);
router.post('/logout', authController.logout);

// Protected administrative route for staff registration
router.post(
  '/register',
  authenticateJWT,
  authorizeRoles('admin', 'superadmin'),
  authController.registerStaff
);

module.exports = router;
