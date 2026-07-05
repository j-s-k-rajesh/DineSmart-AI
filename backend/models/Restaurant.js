const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      minlength: [2, 'Restaurant name must be at least 2 characters'],
      maxlength: [100, 'Restaurant name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    logoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      validate: {
        validator: function (v) {
          // General validation for standard international phone formats
          return /^\+?[1-9]\d{1,14}$/.test(v.replace(/[\s-()]/g, ''));
        },
        message: props => `${props.value} is not a valid contact phone number!`
      }
    },
    address: {
      street: { type: String, required: [true, 'Street address is required'], trim: true },
      city: { type: String, required: [true, 'City is required'], trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, required: [true, 'Zip code is required'], trim: true },
      country: { type: String, required: [true, 'Country is required'], trim: true }
    },
    settings: {
      currency: {
        type: String,
        default: 'INR',
        uppercase: true,
        minlength: 3,
        maxlength: 3
      },
      taxRate: {
        type: Number,
        default: 0.08,
        min: [0, 'Tax rate cannot be negative'],
        max: [1, 'Tax rate cannot exceed 100%']
      },
      serviceChargeRate: {
        type: Number,
        default: 0.10,
        min: [0, 'Service charge rate cannot be negative'],
        max: [1, 'Service charge rate cannot exceed 100%']
      },
      isOnline: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Virtual for formatted full address
RestaurantSchema.virtual('fullAddress').get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state || ''} ${this.address.zipCode}, ${this.address.country}`;
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
