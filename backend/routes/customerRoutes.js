const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

// Public Scan verification endpoint
router.get('/scan/:restaurantId/:tableId', customerController.verifyScan);

// Public menu lookup endpoint
router.get('/menu/:restaurantId', customerController.getCustomerMenu);

// Protected routes (Requires table session authorization)
router.use(authenticateJWT);
router.use(authorizeRoles('customer'));

// Place a new order
router.post('/orders', customerController.placeOrder);

// Retrieve all orders submitted within the current active session
router.get('/orders/session', customerController.getSessionOrders);

// AI search route
router.get('/ai-search', customerController.aiSearch);

module.exports = router;
