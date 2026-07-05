const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant reference is required'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Menu category (e.g. Appetizers, Desserts) is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Item name must be at least 2 characters'],
      maxlength: [100, 'Item name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative']
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    tags: {
      type: [String],
      default: [], // e.g. ['vegan', 'gluten-free', 'spicy', 'chef-special']
      index: true
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },
    estimatedPreparationTime: {
      type: Number,
      default: 15, // in minutes
      min: [0, 'Prep time cannot be negative']
    },
    allergens: {
      type: [String],
      default: [] // e.g. ['nuts', 'dairy', 'shellfish', 'soy']
    },
    calories: {
      type: Number,
      min: [0, 'Calories cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Indexes optimized for frontend categorization and search
MenuItemSchema.index({ restaurantId: 1, category: 1, isAvailable: 1 });
MenuItemSchema.index({ restaurantId: 1, price: 1 });
MenuItemSchema.index({ name: 'text', description: 'text' }); // Text search capabilities

module.exports = mongoose.model('MenuItem', MenuItemSchema);
