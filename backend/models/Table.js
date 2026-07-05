const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    tableNumber: {
      type: String,
      required: [true, 'Table number/label is required'],
      trim: true
    },
    seatingCapacity: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [1, 'Table must seat at least 1 person'],
      default: 4
    },
    qrCodeDataUrl: {
      type: String,
      default: '' // Holds base64 data URL for easy direct embedding in frontends
    },
    status: {
      type: String,
      enum: {
        values: ['vacant', 'occupied', 'cleaning'],
        message: '{VALUE} is not a valid table status'
      },
      default: 'vacant'
    },
    currentSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique table numbers within a single restaurant
TableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

module.exports = mongoose.model('Table', TableSchema);
