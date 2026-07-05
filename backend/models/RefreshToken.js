const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null for customers
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null, // Null for staff
      index: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'kitchen', 'customer', 'superadmin', 'waiter']
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    isRevoked: {
      type: Boolean,
      default: false
    },
    replacedByToken: {
      type: String,
      default: null
    },
    ipAddress: String,
    userAgent: String
  },
  {
    timestamps: true
  }
);

// Virtual to check if token is expired
RefreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt;
});

// Virtual to check if token is active
RefreshTokenSchema.virtual('isActive').get(function () {
  return !this.isRevoked && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
