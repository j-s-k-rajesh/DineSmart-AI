const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const mongoose = require('mongoose');
require('../../config/env');
const MenuItem = require('../../models/MenuItem');
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const Restaurant = require('../../models/Restaurant');
const Table = require('../../models/Table');
const Session = require('../../models/Session');

// Read MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart';

// Establish connection to MongoDB
async function connectDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.error('Customer MCP connected to MongoDB successfully.');
  }
}

// Instantiate MCP Server
const server = new Server(
  {
    name: 'dinesmart-customer-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define tool lists mapping capabilities
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_menu',
        description: 'Retrieves all available dishes and beverages from the restaurant menu.',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string', description: 'The unique MongoDB ObjectId of the restaurant' }
          },
          required: ['restaurantId']
        }
      },
      {
        name: 'place_order',
        description: 'Submits a food and beverage order on behalf of the customer table session.',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string', description: 'The restaurant ID' },
            tableId: { type: 'string', description: 'The table ID the user is seated at' },
            sessionId: { type: 'string', description: 'The active customer session ID' },
            items: {
              type: 'array',
              description: 'Array of menu items to purchase',
              items: {
                type: 'object',
                properties: {
                  menuItemId: { type: 'string', description: 'The ID of the dish to purchase' },
                  quantity: { type: 'number', description: 'Quantity (must be at least 1)' },
                  customizationNotes: { type: 'string', description: 'Optional kitchen notes (e.g. no nuts)' }
                },
                required: ['menuItemId', 'quantity']
              }
            }
          },
          required: ['restaurantId', 'tableId', 'sessionId', 'items']
        }
      },
      {
        name: 'get_order_status',
        description: 'Fetches the current status (e.g., received, cooking, ready, served) of a specific order.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'The MongoDB ObjectId of the order' }
          },
          required: ['orderId']
        }
      },
      {
        name: 'get_popular_items',
        description: 'Retrieves the top popular items ordered at this restaurant.',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string', description: 'The restaurant ID' },
            limit: { type: 'number', description: 'Maximum items to return (default 5)', default: 5 }
          },
          required: ['restaurantId']
        }
      },
      {
        name: 'recommend_food',
        description: 'Recommends dishes filtering out allergens and matching dietary styles (e.g., vegan).',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string', description: 'The restaurant ID' },
            allergensToExclude: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of allergens to filter out (e.g. peanut, soy)'
            },
            preferences: {
              type: 'array',
              items: { type: 'string' },
              description: 'Dietary preferences (e.g. vegan, gluten-free, spicy)'
            }
          },
          required: ['restaurantId']
        }
      },
      {
        name: 'get_restaurant_details',
        description: 'Get details of the restaurant including contact info and policies.',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string' }
          },
          required: ['restaurantId']
        }
      },
      {
        name: 'search_menu',
        description: 'Search the menu for specific keywords.',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: { type: 'string' },
            query: { type: 'string' }
          },
          required: ['restaurantId', 'query']
        }
      }
    ]
  };
});

// Define tool execution handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await connectDatabase();
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_menu': {
        const { restaurantId } = args;
        const menu = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ category: 1 });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(menu, null, 2)
            }
          ]
        };
      }

      case 'place_order': {
        const { restaurantId, tableId, sessionId, items } = args;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new Error('Restaurant tenant target not found');
        }

        let subtotal = 0;
        const orderItemDocs = [];
        const tempOrderId = new mongoose.Types.ObjectId();

        for (const item of items) {
          const menuItem = await MenuItem.findOne({ _id: item.menuItemId, restaurantId, isAvailable: true });
          if (!menuItem) {
            throw new Error(`Menu item ID ${item.menuItemId} is not available`);
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

        // Save order items
        const savedItems = await OrderItem.insertMany(orderItemDocs);
        const itemIds = savedItems.map((i) => i._id);

        const taxAmount = subtotal * (restaurant.settings.taxRate || 0);
        const serviceCharge = subtotal * (restaurant.settings.serviceChargeRate || 0);
        const totalAmount = subtotal + taxAmount + serviceCharge;

        // Save order
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
          content: [
            {
              type: 'text',
              text: `Order successfully placed! Order ID: ${order._id}. Total Amount: ₹${order.totalAmount.toFixed(2)}`
            }
          ]
        };
      }

      case 'get_order_status': {
        const { orderId } = args;
        const order = await Order.findById(orderId).populate('orderItems');
        if (!order) {
          throw new Error('Order not found');
        }

        return {
          content: [
            {
              type: 'text',
              text: `Order Status: ${order.orderStatus.toUpperCase()} (Payment: ${order.paymentStatus.toUpperCase()})`
            }
          ]
        };
      }

      case 'get_popular_items': {
        const { restaurantId, limit = 5 } = args;

        const popular = await OrderItem.aggregate([
          { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), status: { $ne: 'cancelled' } } },
          { $group: { _id: '$menuItemId', name: { $first: '$name' }, totalQty: { $sum: '$quantity' } } },
          { $sort: { totalQty: -1 } },
          { $limit: limit }
        ]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(popular, null, 2)
            }
          ]
        };
      }

      case 'recommend_food': {
        const { restaurantId, allergensToExclude = [], preferences = [] } = args;

        const query = { restaurantId, isAvailable: true };

        // Exclude allergens if specified
        if (allergensToExclude.length > 0) {
          query.allergens = { $nin: allergensToExclude.map((a) => new RegExp(a, 'i')) };
        }

        // Apply preference matching tags (e.g. vegan)
        if (preferences.length > 0) {
          query.tags = { $all: preferences.map((p) => new RegExp(p, 'i')) };
        }

        const recommendations = await MenuItem.find(query).limit(10);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(recommendations, null, 2)
            }
          ]
        };
      }

      case 'get_restaurant_details': {
        const { restaurantId } = args;
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new Error('Restaurant not found');
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(restaurant, null, 2) }]
        };
      }

      case 'search_menu': {
        const { restaurantId, query } = args;
        const results = await MenuItem.find({
          restaurantId,
          isAvailable: true,
          $text: { $search: query }
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Run the server using Standard I/O (stdio) transport
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DineSmart Customer MCP Server is running over Stdio.');
}

startServer().catch((error) => {
  console.error('Failed to run Customer MCP Server:', error);
  process.exit(1);
});

