const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { authenticateJWT, authorizeRoles, requireTenantAccess } = require('../middlewares/auth');

// Require authentication and scoped kitchen/waitstaff/admin access for all kitchen monitor paths
router.use(authenticateJWT);
router.use(authorizeRoles('kitchen', 'waiter', 'admin', 'superadmin'));

// Fetch active order lines
router.get('/orders/active', kitchenController.getActiveOrders);

// Transition whole order state (e.g. Accept, Ready, Complete)
router.patch('/orders/:id/status', requireTenantAccess, kitchenController.updateOrderStatus);

// Transition individual item cooking state (e.g. Preparing, Completed)
router.patch(
  '/orders/:id/items/:itemId/status',
  requireTenantAccess,
  authorizeRoles('kitchen', 'admin', 'superadmin'),
  kitchenController.updateOrderItemStatus
);

module.exports = router;
