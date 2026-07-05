const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table reference is required'],
      index: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    customerNickname: {
      type: String,
      trim: true,
      maxlength: [20, 'Nickname cannot exceed 20 characters']
    }
  },
  {
    timestamps: true
  }
);

// Virtual to determine if the session is expired
SessionSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt;
});

module.exports = mongoose.model('Session', SessionSchema);
