const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT, authorizeRoles, requireTenantAccess } = require('../middlewares/auth');

// Super Admin only routes (e.g. system setup)
router.post(
  '/restaurants',
  authenticateJWT,
  authorizeRoles('superadmin'),
  adminController.createRestaurant
);

// All subsequent routes require JWT and Admin role, and are tenant-scoped
router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'superadmin'));

// Tables management
router.post('/tables', adminController.createTable);
router.get('/tables', adminController.getTables);

// Menu management
router.post('/menu/items', adminController.createMenuItem);
router.get('/menu/items', adminController.getMenu);
router.put('/menu/items/:id', requireTenantAccess, adminController.updateMenuItem);
router.delete('/menu/items/:id', requireTenantAccess, adminController.deleteMenuItem);

// Order tracking
router.get('/orders', adminController.getOrders);

// BI Operations
router.get('/analytics', adminController.getAnalytics);

// Staff profiles management
router.get('/staff', adminController.getStaff);
router.put('/staff/:id', requireTenantAccess, adminController.updateStaff);
router.delete('/staff/:id', requireTenantAccess, adminController.deleteStaff);

module.exports = router;
