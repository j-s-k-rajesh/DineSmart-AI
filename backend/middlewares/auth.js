const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Middleware to authenticate incoming JWT tokens.
 * Supports token extraction from Authorization header (Bearer) or secure cookies.
 */
const authenticateJWT = async (req, res, next) => {
  try {
    let token = null;

    // 1. Attempt header extraction
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to cookie extraction
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing' });
    }

    // Decode and verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret');

    // Attach identity payload to request
    req.user = {
      id: decoded.id,
      restaurantId: decoded.restaurantId,
      role: decoded.role,
      name: decoded.name
    };

    // For customers, attach session-specific fields
    if (decoded.role === 'customer') {
      req.user.tableId = decoded.tableId;
      req.user.sessionId = decoded.sessionId;

      // Verify customer session is still active in database
      const activeSession = await Session.findOne({ _id: decoded.sessionId, isActive: true });
      if (!activeSession || Date.now() >= activeSession.expiresAt) {
        return res.status(401).json({ success: false, message: 'Customer dining session has expired or is invalid' });
      }
    } else {
      // Verify staff member is active
      const activeUser = await User.findOne({ _id: decoded.id, isActive: true });
      if (!activeUser) {
        return res.status(401).json({ success: false, message: 'User account is inactive or deleted' });
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ success: false, message: 'Access token is invalid' });
  }
};

/**
 * Middleware to restrict access by role.
 * @param {...string} allowedRoles Roles allowed to pass.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
};

/**
 * Middleware to restrict access to a tenant (restaurantId validation).
 * Ensures users/customers cannot view or write data outside their scoped restaurant tenant.
 */
const requireTenantAccess = (req, res, next) => {
  const paramRestaurantId = req.params.restaurantId || req.query.restaurantId || req.body.restaurantId;
  
  if (!paramRestaurantId) {
    // Fallback if endpoint is directly structured but tenantId isn't sent
    return next();
  }

  if (req.user.restaurantId.toString() !== paramRestaurantId.toString() && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Tenant boundary violation'
    });
  }

  next();
};

module.exports = {
  authenticateJWT,
  authorizeRoles,
  requireTenantAccess
};
