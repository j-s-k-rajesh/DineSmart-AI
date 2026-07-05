const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Table = require('../models/Table');
const Session = require('../models/Session');
const RefreshToken = require('../models/RefreshToken');
const env = require('../config/env');
const { authCookieOptions, clearCookieOptions } = require('../config/cookies');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: '15m'
  });
};

const generateRefreshTokenString = () => crypto.randomBytes(40).toString('hex');

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, authCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken', clearCookieOptions(true));
  res.clearCookie('refreshToken', clearCookieOptions(true));
  res.clearCookie('csrfToken', clearCookieOptions(false));
};

exports.registerStaff = async (req, res) => {
  try {
    const { restaurantId, name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    if (role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to create superadmin accounts' });
    }

    const newUser = new User({
      restaurantId,
      name,
      email,
      passwordHash: password,
      role
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Staff user registered successfully',
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('restaurantId');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const tokenPayload = {
      id: user._id,
      restaurantId: user.restaurantId._id,
      role: user.role,
      name: user.name
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenString = generateRefreshTokenString();

    const refreshToken = new RefreshToken({
      token: refreshTokenString,
      userId: user._id,
      restaurantId: user.restaurantId._id,
      role: user.role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await refreshToken.save();
    setTokenCookies(res, accessToken, refreshTokenString);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user._id,
        restaurantId: user.restaurantId._id,
        restaurantName: user.restaurantId.name,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.loginTable = async (req, res) => {
  try {
    const { restaurantId, tableId, nickname } = req.body;

    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table registration not found' });
    }

    const sessionDuration = 4 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionDuration);

    const session = new Session({
      restaurantId,
      tableId,
      expiresAt,
      customerNickname: nickname || `Table ${table.tableNumber} Guest`
    });

    await session.save();

    table.status = 'occupied';
    table.currentSessionId = session._id;
    await table.save();

    const tokenPayload = {
      id: session._id,
      sessionId: session._id,
      tableId: table._id,
      restaurantId,
      role: 'customer',
      name: session.customerNickname
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshTokenString = generateRefreshTokenString();

    const refreshToken = new RefreshToken({
      token: refreshTokenString,
      sessionId: session._id,
      restaurantId,
      role: 'customer',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await refreshToken.save();
    setTokenCookies(res, accessToken, refreshTokenString);

    return res.status(200).json({
      success: true,
      message: 'Dining session activated',
      user: tokenPayload,
      session: {
        id: session._id,
        tableId: table._id,
        tableNumber: table.tableNumber,
        nickname: session.customerNickname,
        expiresAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.refreshTokens = async (req, res) => {
  try {
    let tokenString = req.body.refreshToken;

    if (!tokenString && req.cookies) {
      tokenString = req.cookies.refreshToken;
    }

    if (!tokenString) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const refreshToken = await RefreshToken.findOne({ token: tokenString });
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not recognized' });
    }

    if (refreshToken.isRevoked) {
      if (refreshToken.userId) {
        await RefreshToken.updateMany({ userId: refreshToken.userId }, { isRevoked: true });
      } else if (refreshToken.sessionId) {
        await RefreshToken.updateMany({ sessionId: refreshToken.sessionId }, { isRevoked: true });
      }

      return res.status(401).json({ success: false, message: 'Breach detected: Refresh token already used' });
    }

    if (Date.now() >= refreshToken.expiresAt) {
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please re-authenticate' });
    }

    let tokenPayload = {};
    if (refreshToken.role === 'customer') {
      const session = await Session.findById(refreshToken.sessionId).populate('tableId');
      if (!session || !session.isActive || Date.now() >= session.expiresAt) {
        return res.status(401).json({ success: false, message: 'Associated customer session expired' });
      }

      tokenPayload = {
        id: session._id,
        sessionId: session._id,
        tableId: session.tableId._id,
        restaurantId: refreshToken.restaurantId,
        role: 'customer',
        name: session.customerNickname
      };
    } else {
      const user = await User.findById(refreshToken.userId).populate('restaurantId');
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: 'Associated staff account disabled' });
      }

      tokenPayload = {
        id: user._id,
        restaurantId: refreshToken.restaurantId,
        role: user.role,
        name: user.name,
        restaurantName: user.restaurantId ? user.restaurantId.name : undefined
      };
    }

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshTokenString = generateRefreshTokenString();

    refreshToken.isRevoked = true;
    refreshToken.replacedByToken = newRefreshTokenString;
    await refreshToken.save();

    const newRefreshToken = new RefreshToken({
      token: newRefreshTokenString,
      userId: refreshToken.userId,
      sessionId: refreshToken.sessionId,
      restaurantId: refreshToken.restaurantId,
      role: refreshToken.role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await newRefreshToken.save();
    setTokenCookies(res, newAccessToken, newRefreshTokenString);

    return res.status(200).json({
      success: true,
      user: tokenPayload
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    let tokenString = req.body.refreshToken;

    if (!tokenString && req.cookies) {
      tokenString = req.cookies.refreshToken;
    }

    if (tokenString) {
      const refreshToken = await RefreshToken.findOne({ token: tokenString });
      if (refreshToken) {
        refreshToken.isRevoked = true;
        await refreshToken.save();

        if (refreshToken.role === 'customer' && refreshToken.sessionId) {
          const session = await Session.findById(refreshToken.sessionId);
          if (session) {
            session.isActive = false;
            await session.save();

            await Table.updateOne(
              { _id: session.tableId },
              { $set: { status: 'vacant', currentSessionId: null } }
            );
          }
        }
      }
    }

    clearTokenCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
