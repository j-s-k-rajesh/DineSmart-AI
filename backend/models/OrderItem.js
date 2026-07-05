const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true
    },
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu item reference is required']
    },
    name: {
      type: String,
      required: [true, 'Item name snapshot is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Item price snapshot is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    customizationNotes: {
      type: String,
      trim: true,
      maxlength: [200, 'Customization notes cannot exceed 200 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'preparing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid item status'
      },
      default: 'pending',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for analyzing items within a restaurant's orders
OrderItemSchema.index({ restaurantId: 1, menuItemId: 1, status: 1 });

module.exports = mongoose.model('OrderItem', OrderItemSchema);
