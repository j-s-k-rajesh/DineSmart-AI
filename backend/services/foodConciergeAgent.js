const { FunctionTool, LlmAgent } = require('@google/adk');
const { z } = require('zod');
const mongoose = require('mongoose');

// Import Mongoose Models
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');

// Helper to check MongoDB connection status
async function ensureDbConnected() {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart';
    await mongoose.connect(uri);
  }
}

// 1. Tool Definition: get_menu
const getMenuTool = new FunctionTool({
  name: 'get_menu',
  description: 'Retrieves all available dishes and drinks from the menu of the current restaurant.',
  parameters: z.object({
    restaurantId: z.string().describe('The unique MongoDB ObjectId of the restaurant tenant.')
  }),
  execute: async ({ restaurantId }) => {
    await ensureDbConnected();
    const menu = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ category: 1 });
    return { status: 'success', data: menu };
  }
});

// 2. Tool Definition: place_order
const placeOrderTool = new FunctionTool({
  name: 'place_order',
  description: 'Places a food and beverage order on behalf of the customer table session.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    tableId: z.string().describe('The table ID the user is seated at'),
    sessionId: z.string().describe('The active customer session ID'),
    items: z.array(
      z.object({
        menuItemId: z.string().describe('The ID of the dish to purchase'),
        quantity: z.number().min(1).describe('Quantity to order'),
        customizationNotes: z.string().optional().describe('Kitchen instructions, e.g., "no salt"')
      })
    ).describe('List of menu items in the cart')
  }),
  execute: async ({ restaurantId, tableId, sessionId, items }) => {
    await ensureDbConnected();
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return { status: 'error', message: 'Restaurant not found' };
    }

    let subtotal = 0;
    const orderItemDocs = [];
    const tempOrderId = new mongoose.Types.ObjectId();

    for (const item of items) {
      const menuItem = await MenuItem.findOne({ _id: item.menuItemId, restaurantId, isAvailable: true });
      if (!menuItem) {
        return { status: 'error', message: `Item ${item.menuItemId} is not available.` };
      }

      subtotal += menuItem.price * item.quantity;
      orderItemDocs.push({
        restaurantId,
        orderId: tempOrderId,
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        customizationNotes: item.customizationNotes || ''
      });
    }

    const savedItems = await OrderItem.insertMany(orderItemDocs);
    const itemIds = savedItems.map(i => i._id);

    const taxAmount = subtotal * (restaurant.settings.taxRate || 0);
    const serviceCharge = subtotal * (restaurant.settings.serviceChargeRate || 0);
    const totalAmount = subtotal + taxAmount + serviceCharge;

    const order = new Order({
      _id: tempOrderId,
      restaurantId,
      tableId,
      sessionId,
      orderItems: itemIds,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      serviceCharge: parseFloat(serviceCharge.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      orderStatus: 'received',
      paymentStatus: 'unpaid'
    });

    await order.save();

    return {
      status: 'success',
      message: 'Order placed successfully',
      orderId: order._id.toString(),
      total: order.totalAmount
    };
  }
});

// 3. Tool Definition: get_order_status
const getOrderStatusTool = new FunctionTool({
  name: 'get_order_status',
  description: 'Fetches the cooking status of a specific order.',
  parameters: z.object({
    orderId: z.string().describe('The unique MongoDB ObjectId of the order.')
  }),
  execute: async ({ orderId }) => {
    await ensureDbConnected();
    const order = await Order.findById(orderId).populate('orderItems');
    if (!order) {
      return { status: 'error', message: 'Order not found' };
    }
    return { status: 'success', data: { orderStatus: order.orderStatus, items: order.orderItems } };
  }
});

// 4. Tool Definition: get_popular_items
const getPopularItemsTool = new FunctionTool({
  name: 'get_popular_items',
  description: 'Retrieves highly ordered menu items for a restaurant.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    limit: z.number().optional().default(5).describe('Max items to retrieve')
  }),
  execute: async ({ restaurantId, limit = 5 }) => {
    await ensureDbConnected();
    const popular = await OrderItem.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), status: { $ne: 'cancelled' } } },
      { $group: { _id: '$menuItemId', name: { $first: '$name' }, qty: { $sum: '$quantity' } } },
      { $sort: { qty: -1 } },
      { $limit: limit }
    ]);
    return { status: 'success', data: popular };
  }
});

// 5. Tool Definition: recommend_food
const recommendFoodTool = new FunctionTool({
  name: 'recommend_food',
  description: 'Recommends items excluding allergens and matching preferences (e.g. vegan, spicy).',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    allergensToExclude: z.array(z.string()).optional().describe('List of allergens to filter out'),
    preferences: z.array(z.string()).optional().describe('Dietary tags, e.g. vegan, keto, spicy')
  }),
  execute: async ({ restaurantId, allergensToExclude = [], preferences = [] }) => {
    await ensureDbConnected();
    const query = { restaurantId, isAvailable: true };

    if (allergensToExclude.length > 0) {
      query.allergens = { $nin: allergensToExclude.map(a => new RegExp(a, 'i')) };
    }

    if (preferences.length > 0) {
      query.tags = { $all: preferences.map(p => new RegExp(p, 'i')) };
    }

    const items = await MenuItem.find(query).limit(10);
    return { status: 'success', data: items };
  }
});

// Define LLM Agent
const foodConciergeAgent = new LlmAgent({
  name: 'food_concierge',
  model: 'gemini-2.5-flash',
  instruction: `
You are the Food Concierge Agent for DineSmart AI.
Your goal is to guide dining customers through the menu, recommend dishes, suggest meal combos, and place orders.

Capabilities:
1. Recommend Dishes: Suggest specific dishes from the menu.
2. Suggest Combos: Recommend food combinations (e.g., Hamburger + French Fries) using menu items.
3. Suggest Meals under Budget: Total item costs must fall within the user's budget.
4. Filter Vegetarian: Look for the tag "vegan" or "vegetarian" when matching queries.
5. Filter Spicy: Look for the tag "spicy" when matching queries.

Rules:
1. Always use get_menu or recommend_food to pull active menu data. Do not make up items.
2. Verify dietary restrictions or exclusions (allergens) before recommending items.
3. Help customers construct their order and execute it via place_order.
`,
  tools: [getMenuTool, placeOrderTool, getOrderStatusTool, getPopularItemsTool, recommendFoodTool]
});

/**
 * Interface function to execute the Food Concierge Agent loop.
 * @param {string} prompt Input message from customer.
 * @param {Object} context Metadata context containing { restaurantId, tableId, sessionId }
 */
async function chatWithConcierge(prompt, context) {
  const finalPrompt = `
Context Information:
- Restaurant ID: ${context.restaurantId}
- Table ID: ${context.tableId}
- Session ID: ${context.sessionId}

User Input: ${prompt}
`;

  try {
    const response = await foodConciergeAgent.ask({
      prompt: finalPrompt
    });

    return {
      success: true,
      text: response.text
    };
  } catch (error) {
    console.error('Error running ADK Food Concierge Agent:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  foodConciergeAgent,
  chatWithConcierge
};
