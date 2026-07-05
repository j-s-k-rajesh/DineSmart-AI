const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    itemName: {
      type: String,
      required: [true, 'Inventory item name is required'],
      trim: true,
      maxlength: [120, 'Inventory item name cannot exceed 120 characters']
    },
    unit: {
      type: String,
      required: [true, 'Measurement unit is required'],
      trim: true,
      default: 'pcs'
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Current stock cannot be negative'],
      default: 0
    },
    reorderPoint: {
      type: Number,
      required: [true, 'Reorder point is required'],
      min: [0, 'Reorder point cannot be negative'],
      default: 0
    }
  },
  {
    timestamps: true
  }
);

InventorySchema.index({ restaurantId: 1, itemName: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', InventorySchema);
