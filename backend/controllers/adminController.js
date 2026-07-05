const qrcode = require('qrcode');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Analytics = require('../models/Analytics');

/**
 * Super Admin Action: Create Restaurant Tenant
 */
exports.createRestaurant = async (req, res) => {
  try {
    const { name, contactNumber, address, settings } = req.body;

    // Check if slug is unique
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Restaurant.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Restaurant name generates a duplicate slug' });
    }

    const newRestaurant = new Restaurant({
      name,
      slug,
      contactNumber,
      address,
      settings
    });

    await newRestaurant.save();

    res.status(201).json({
      success: true,
      message: 'Restaurant tenant created successfully',
      data: newRestaurant
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Create Table & Auto Generate QR Code
 */
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, seatingCapacity } = req.body;
    const { restaurantId } = req.user;

    // Check duplicate table in same restaurant
    const existingTable = await Table.findOne({ restaurantId, tableNumber });
    if (existingTable) {
      return res.status(400).json({ success: false, message: 'Table number already exists in this restaurant' });
    }

    // Instantiate table
    const newTable = new Table({
      restaurantId,
      tableNumber,
      seatingCapacity
    });

    // Auto-generate QR code mapping to local/production Customer portal landing page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const qrTargetUrl = `${clientUrl}/menu/${restaurantId}/${newTable._id}`;
    
    // Generate QR code as Base64 Data URL
    const qrDataUrl = await qrcode.toDataURL(qrTargetUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2
    });

    newTable.qrCodeDataUrl = qrDataUrl;
    await newTable.save();

    res.status(201).json({
      success: true,
      message: 'Table allocated and QR Code generated successfully',
      data: newTable
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Get All Tables
 */
exports.getTables = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const tables = await Table.find({ restaurantId }).sort({ tableNumber: 1 });
    
    res.status(200).json({ success: true, data: tables });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Create Menu Item
 */
exports.createMenuItem = async (req, res) => {
  try {
    const { category, name, description, price, imageUrl, tags, allergens, calories, estimatedPreparationTime } = req.body;
    const { restaurantId } = req.user;

    const newItem = new MenuItem({
      restaurantId,
      category,
      name,
      description,
      price,
      imageUrl,
      tags,
      allergens,
      calories,
      estimatedPreparationTime
    });

    await newItem.save();

    res.status(201).json({ success: true, message: 'Menu item created successfully', data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Update Menu Item
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found in this tenant' });
    }

    res.status(200).json({ success: true, message: 'Menu item updated successfully', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Delete Menu Item
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;

    const item = await MenuItem.findOneAndDelete({ _id: id, restaurantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Get Restaurant Menu (All Items)
 */
exports.getMenu = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const items = await MenuItem.find({ restaurantId }).sort({ category: 1, name: 1 });
    
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: View Orders (With filtering capability)
 */
exports.getOrders = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { status, paymentStatus } = req.query;

    const filter = { restaurantId };
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber status')
      .populate('orderItems')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Retrieve Analytics Aggregations
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { startDate, endDate } = req.query;

    const dateFilter = { 
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      orderStatus: { $ne: 'cancelled' }
    };
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Aggregate key parameters from Order collection
    const orderAggregates = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const aggregates = orderAggregates[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: aggregates.totalRevenue,
        totalOrders: aggregates.totalOrders,
        averageOrderValue: Number(aggregates.averageOrderValue).toFixed(2),
        timeframe: { startDate, endDate }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: List Tenant Staff Users
 */
exports.getStaff = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const staff = await User.find({ restaurantId, role: { $ne: 'superadmin' } }).select('-passwordHash');
    
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Update Staff User Status/Role
 */
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;
    const { role, isActive, name } = req.body;

    // Restrict Admin from modifying their own roles down or modifying other admins
    if (id.toString() === req.user.id.toString() && role && role !== req.user.role) {
      return res.status(400).json({ success: false, message: 'Admins cannot modify their own privileges' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, restaurantId, role: { $ne: 'superadmin' } },
      { $set: { role, isActive, name } },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Staff user not found in this restaurant tenant' });
    }

    res.status(200).json({ success: true, message: 'Staff credentials adjusted', data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin Action: Delete Staff Account
 */
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;

    if (id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account' });
    }

    const deletedUser = await User.findOneAndDelete({ _id: id, restaurantId, role: { $ne: 'superadmin' } });
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    res.status(200).json({ success: true, message: 'Staff account successfully de-provisioned' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
