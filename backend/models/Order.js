const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
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
    orderItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem',
        required: [true, 'At least one order item is required']
      }
    ],
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    taxAmount: {
      type: Number,
      required: [true, 'Tax amount is required'],
      min: [0, 'Tax amount cannot be negative']
    },
    serviceCharge: {
      type: Number,
      default: 0,
      min: [0, 'Service charge cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['received', 'processing', 'ready', 'served', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid order status'
      },
      default: 'received',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['unpaid', 'paid', 'refunded'],
        message: '{VALUE} is not a valid payment status'
      },
      default: 'unpaid',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['card', 'cash', 'applepay', 'googlepay'],
        message: '{VALUE} is not a valid payment method'
      }
    }
  },
  {
    timestamps: true
  }
);

// Optimize query patterns for dashboard queues and operations
OrderSchema.index({ restaurantId: 1, orderStatus: 1, createdAt: -1 });
OrderSchema.index({ restaurantId: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', OrderSchema);
