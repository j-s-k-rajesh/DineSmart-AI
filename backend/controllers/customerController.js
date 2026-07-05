const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const socketService = require('../services/socketService');
const { getCustomerRecommendations } = require('../services/customerAgent');

/**
 * Public Scan Verification: Validate table QR scan and return metadata
 */
exports.verifyScan = async (req, res) => {
  try {
    const { restaurantId, tableId } = req.params;

    // Validate table exist and belongs to restaurant
    const table = await Table.findOne({ _id: tableId, restaurantId });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Invalid QR scan. Table configuration not found' });
    }

    const restaurant = await Restaurant.findById(restaurantId).select('name settings logoUrl');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        restaurantName: restaurant.name,
        currency: restaurant.settings.currency,
        tableNumber: table.tableNumber,
        tableStatus: table.status,
        isOccupied: table.status === 'occupied'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get Restaurant Menu (Categorized)
 */
exports.getCustomerMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Get available menu items
    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ category: 1, name: 1 });

    // Group items by category
    const groupedMenu = menuItems.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        restaurant: {
          name: restaurant.name,
          logoUrl: restaurant.logoUrl,
          settings: restaurant.settings
        },
        menu: groupedMenu
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Place Order (Customer Session)
 */
exports.placeOrder = async (req, res) => {
  try {
    const { items } = req.body; // Array of { menuItemId, quantity, customizationNotes }
    const { restaurantId, tableId, sessionId } = req.user; // Injected from validated JWT session token

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Fetch prices and names from db to protect against client-side pricing injection attacks
    let subtotal = 0;
    const orderItemDocs = [];

    // Create a temporary order reference to link orderItems prior to full order validation
    const tempOrderId = new mongoose.Types.ObjectId();

    for (const cartItem of items) {
      const menuItem = await MenuItem.findOne({ _id: cartItem.menuItemId, restaurantId, isAvailable: true });
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item ${cartItem.menuItemId} is currently unavailable or doesn't exist`
        });
      }

      const itemTotal = menuItem.price * cartItem.quantity;
      subtotal += itemTotal;

      const orderItem = new OrderItem({
        restaurantId,
        orderId: tempOrderId,
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price, // Snapshot price
        quantity: cartItem.quantity,
        customizationNotes: cartItem.customizationNotes || ''
      });

      orderItemDocs.push(orderItem);
    }

    // Calculate taxes and service charge based on restaurant configuration settings
    const taxRate = restaurant.settings.taxRate || 0;
    const serviceRate = restaurant.settings.serviceChargeRate || 0;

    const taxAmount = subtotal * taxRate;
    const serviceCharge = subtotal * serviceRate;
    const totalAmount = subtotal + taxAmount + serviceCharge;

    // Save all OrderItem documents
    const savedOrderItems = await OrderItem.insertMany(orderItemDocs);
    const orderItemIds = savedOrderItems.map(item => item._id);

    // Create the final Order record
    const finalOrder = new Order({
      _id: tempOrderId,
      restaurantId,
      tableId,
      sessionId,
      orderItems: orderItemIds,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      orderStatus: 'received',
      paymentStatus: 'unpaid'
    });

    await finalOrder.save();

    // Populate order content for Socket emit
    const populatedOrder = await Order.findById(finalOrder._id)
      .populate('tableId', 'tableNumber status')
      .populate('orderItems');

    // Notify Kitchen display monitors of incoming order
    socketService.emitToRoom(`kitchen:${restaurantId}`, 'order:placed', populatedOrder);

    // Notify Admin/Waiters dashboard
    socketService.emitToRoom(`restaurant:${restaurantId}`, 'order:placed', populatedOrder);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Sent to kitchen.',
      data: populatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get active session order list and statuses
 */
exports.getSessionOrders = async (req, res) => {
  try {
    const { sessionId, restaurantId } = req.user;

    const orders = await Order.find({ sessionId, restaurantId })
      .populate('orderItems')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const fallbackSearch = (q, menuItems) => {
  const queryLower = q.toLowerCase();
  let matchedItems = [];
  let answer = "";

  const isSpicy = queryLower.includes('spicy') || queryLower.includes('hot');
  const isVegan = queryLower.includes('vegan');
  const isVeg = queryLower.includes('vegetarian') || queryLower.includes('veg ') || queryLower.includes('pure veg');
  const isGlutenFree = queryLower.includes('gluten free') || queryLower.includes('gluten-free');
  const isDairyFree = queryLower.includes('dairy free') || queryLower.includes('dairy-free');
  const isNutFree = queryLower.includes('nut free') || queryLower.includes('nut-free') || queryLower.includes('no nuts');
  const isHealthy = queryLower.includes('healthy') || queryLower.includes('diet') || queryLower.includes('low calorie') || queryLower.includes('calories');
  const isDessert = queryLower.includes('dessert') || queryLower.includes('sweet');
  const isDrink = queryLower.includes('drink') || queryLower.includes('beverage') || queryLower.includes('coffee') || queryLower.includes('lassi');

  if (isVegan) {
    matchedItems = menuItems.filter(item => item.tags.includes('vegan') || item.tags.includes('vegan-optional') || item.description.toLowerCase().includes('vegan'));
    answer = matchedItems.length > 0
      ? `We have ${matchedItems.length} vegan options for you! Here are some plant-based choices:`
      : "I couldn't find any strictly vegan items, but feel free to ask our staff if any dish can be prepared vegan.";
  } else if (isVeg) {
    matchedItems = menuItems.filter(item => item.tags.includes('vegetarian') || item.tags.includes('vegan') || !item.tags.includes('non-vegetarian'));
    answer = `Here are our delicious vegetarian dishes:`;
  } else if (isGlutenFree) {
    matchedItems = menuItems.filter(item => !item.allergens.includes('gluten'));
    answer = `These options do not contain gluten:`;
  } else if (isDairyFree) {
    matchedItems = menuItems.filter(item => !item.allergens.includes('dairy'));
    answer = `These options are dairy-free:`;
  } else if (isNutFree) {
    matchedItems = menuItems.filter(item => !item.allergens.includes('nuts') && !item.allergens.includes('peanut'));
    answer = `These options are nut-free:`;
  } else if (isSpicy) {
    matchedItems = menuItems.filter(item => item.tags.includes('spicy') || item.name.toLowerCase().includes('spicy') || item.description.toLowerCase().includes('spicy'));
    answer = matchedItems.length > 0
      ? `If you love spices, you should try these:`
      : "We don't have dishes flagged as spicy, but you can request extra spice when placing your order!";
  } else if (isHealthy) {
    matchedItems = menuItems.filter(item => item.tags.includes('healthy') || (item.calories && item.calories < 400));
    answer = `Here are some lighter, healthy choices under 400 calories or flagged as healthy:`;
  } else if (isDessert) {
    matchedItems = menuItems.filter(item => item.category.toLowerCase() === 'desserts' || item.tags.includes('sweet') || item.tags.includes('dessert'));
    answer = `Satisfy your sweet tooth with these desserts:`;
  } else if (isDrink) {
    matchedItems = menuItems.filter(item => item.category.toLowerCase() === 'beverages' || item.name.toLowerCase().includes('coffee') || item.name.toLowerCase().includes('lassi'));
    answer = `Here are our refreshing drinks and beverages:`;
  }

  if (matchedItems.length === 0) {
    matchedItems = menuItems.filter(item => 
      item.name.toLowerCase().includes(queryLower) || 
      item.description.toLowerCase().includes(queryLower)
    );

    if (matchedItems.length === 1) {
      const item = matchedItems[0];
      answer = `${item.name} (₹${item.price.toFixed(2)}) is on our menu! Description: "${item.description}". It takes about ${item.estimatedPreparationTime} minutes to prepare. ${item.allergens.length > 0 ? `Note: It contains ${item.allergens.join(', ')}.` : ''}`;
    } else if (matchedItems.length > 1) {
      answer = `I found these matching items on our menu:`;
    } else {
      answer = `I couldn't find a direct match for "${q}". Here are some of our popular recommendations instead!`;
      matchedItems = menuItems.filter(item => item.tags.includes('bestseller')).slice(0, 3);
      if (matchedItems.length === 0) {
        matchedItems = menuItems.slice(0, 3);
      }
    }
  }

  return { answer, suggestions: matchedItems };
};

/**
 * AI Recommendation Search Engine
 */
exports.aiSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const { restaurantId } = req.user;

    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    const restaurantName = restaurant ? restaurant.name : "DineSmart Restaurant";
    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true });

    try {
      const { answer, recommendationNames } = await getCustomerRecommendations(q, menuItems, restaurantName);

      // Map matching items
      const matchedItems = [];
      for (const name of recommendationNames) {
        const found = menuItems.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (found) {
          matchedItems.push(found);
        }
      }

      if (answer && answer.trim()) {
        return res.status(200).json({
          success: true,
          data: {
            answer,
            suggestions: matchedItems
          }
        });
      }
    } catch (aiError) {
      console.warn("AI recommendation failed, falling back to rule-based matching:", aiError);
    }

    // Fallback if AI fails or doesn't return a valid answer
    const fallbackResult = fallbackSearch(q, menuItems);
    res.status(200).json({
      success: true,
      data: fallbackResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

