const mongoose = require('mongoose');

const PopularItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  revenue: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
});

const AnalyticsSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Analytics date marker is required'],
      index: true
    },
    metrics: {
      totalRevenue: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      totalOrders: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      averageOrderValue: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      popularItems: [PopularItemSchema]
    }
  },
  {
    timestamps: true
  }
);

// Optimize metrics queries by date ranges per restaurant tenant
AnalyticsSchema.index({ restaurantId: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
