const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
require('../../config/env');

const Table = require('../../models/Table');
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');
const Inventory = require('../../models/Inventory');
const MenuItem = require('../../models/MenuItem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart';

async function connectDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.error('Admin MCP connected to MongoDB successfully.');
  }
}

const server = new Server(
  {
    name: 'dinesmart-admin-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_table',
      description: 'Creates a physical table resource inside a restaurant.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string', description: 'The unique MongoDB ObjectId of the restaurant' },
          tableNumber: { type: 'string', description: 'A unique code/number of the table, e.g. T12' },
          seatingCapacity: { type: 'number', description: 'Table capacity, default 4', default: 4 }
        },
        required: ['restaurantId', 'tableNumber']
      }
    },
    {
      name: 'generate_qr',
      description: 'Generates or re-creates a Base64 QR code linking to the customer landing page for a table.',
      inputSchema: {
        type: 'object',
        properties: {
          tableId: { type: 'string', description: 'The unique table ObjectId' }
        },
        required: ['tableId']
      }
    },
    {
      name: 'update_order_status',
      description: 'Updates preparation status of a customer order.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The unique order ObjectId' },
          status: {
            type: 'string',
            description: 'Target state',
            enum: ['received', 'processing', 'ready', 'completed', 'cancelled']
          }
        },
        required: ['orderId', 'status']
      }
    },
    {
      name: 'sales_analytics',
      description: 'Calculates total revenues, orders, and averages for a restaurant inside a date window.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string', description: 'The restaurant ID' },
          startDate: { type: 'string', description: 'ISO 8601 start date' },
          endDate: { type: 'string', description: 'ISO 8601 end date' }
        },
        required: ['restaurantId', 'startDate', 'endDate']
      }
    },
    {
      name: 'inventory_report',
      description: 'Retrieves low-stock ingredients or items that need restocking.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string', description: 'The restaurant ID' }
        },
        required: ['restaurantId']
      }
    },
    {
      name: 'get_menu',
      description: 'Retrieves all dishes and beverages from the restaurant menu.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string', description: 'The unique MongoDB ObjectId of the restaurant' }
        },
        required: ['restaurantId']
      }
    },
    {
      name: 'add_menu_item',
      description: 'Add a new item to the restaurant menu.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string' },
          category: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' }
        },
        required: ['restaurantId', 'category', 'name', 'price']
      }
    },
    {
      name: 'get_active_orders',
      description: 'Get all active orders for the restaurant.',
      inputSchema: {
        type: 'object',
        properties: {
          restaurantId: { type: 'string' }
        },
        required: ['restaurantId']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await connectDatabase();
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_table': {
        const { restaurantId, tableNumber, seatingCapacity = 4 } = args;
        const existing = await Table.findOne({ restaurantId, tableNumber });

        if (existing) {
          throw new Error(`Table ${tableNumber} already registered in this restaurant`);
        }

        const newTable = new Table({
          restaurantId,
          tableNumber,
          seatingCapacity
        });

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const qrTargetUrl = `${clientUrl}/menu/${restaurantId}/${newTable._id}`;
        const qrDataUrl = await qrcode.toDataURL(qrTargetUrl, {
          errorCorrectionLevel: 'H',
          width: 400
        });

        newTable.qrCodeDataUrl = qrDataUrl;
        await newTable.save();

        return {
          content: [
            {
              type: 'text',
              text: `Table ${tableNumber} created successfully with QR code. Table ID: ${newTable._id}`
            }
          ]
        };
      }

      case 'generate_qr': {
        const { tableId } = args;
        const table = await Table.findById(tableId);

        if (!table) {
          throw new Error('Table record not found');
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const qrTargetUrl = `${clientUrl}/menu/${table.restaurantId}/${table._id}`;
        const qrDataUrl = await qrcode.toDataURL(qrTargetUrl, {
          errorCorrectionLevel: 'H',
          width: 400
        });

        table.qrCodeDataUrl = qrDataUrl;
        await table.save();

        return {
          content: [
            {
              type: 'text',
              text: `QR code generated. Base64 prefix: ${qrDataUrl.substring(0, 100)}...`
            }
          ]
        };
      }

      case 'update_order_status': {
        const { orderId, status } = args;
        const order = await Order.findById(orderId).populate('tableId', 'tableNumber');

        if (!order) {
          throw new Error('Order record not found');
        }

        order.orderStatus = status;

        if (status === 'completed' || status === 'cancelled') {
          const itemStatus = status === 'completed' ? 'completed' : 'cancelled';
          await OrderItem.updateMany({ orderId: order._id }, { $set: { status: itemStatus } });

          if (status === 'completed' && order.tableId?._id) {
            await Table.updateOne(
              { _id: order.tableId._id },
              { $set: { status: 'cleaning', currentSessionId: null } }
            );
          }
        }

        await order.save();

        return {
          content: [
            {
              type: 'text',
              text: `Order status for order ${order._id} changed to ${status.toUpperCase()}.`
            }
          ]
        };
      }

      case 'sales_analytics': {
        const { restaurantId, startDate, endDate } = args;
        const range = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };

        const analytics = await Order.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(restaurantId),
              orderStatus: { $ne: 'cancelled' },
              createdAt: range
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              totalOrders: { $sum: 1 },
              averageOrderValue: { $avg: '$totalAmount' }
            }
          }
        ]);

        const data = analytics[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
        const itemsStats = await OrderItem.aggregate([
          {
            $match: {
              restaurantId: new mongoose.Types.ObjectId(restaurantId),
              createdAt: range,
              status: { $ne: 'cancelled' }
            }
          },
          {
            $group: {
              _id: '$menuItemId',
              name: { $first: '$name' },
              totalQty: { $sum: '$quantity' },
              revenue: { $sum: { $multiply: ['$price', '$quantity'] } }
            }
          },
          { $sort: { totalQty: -1 } },
          { $limit: 3 }
        ]);

        return {
          content: [
            {
              type: 'text',
              text:
                `Sales report from ${startDate} to ${endDate}:\n` +
                `- Total Revenue: ₹${data.totalRevenue.toFixed(2)}\n` +
                `- Total Orders Placed: ${data.totalOrders}\n` +
                `- Average Transaction Size: ₹${data.averageOrderValue.toFixed(2)}\n\n` +
                `Top Selling Items:\n` +
                itemsStats.map((item) => `* ${item.name} (${item.totalQty} sold, Revenue: ₹${item.revenue.toFixed(2)})`).join('\n')
            }
          ]
        };
      }

      case 'inventory_report': {
        const { restaurantId } = args;
        const items = await Inventory.find({ restaurantId });
        const lowStock = items.filter((item) => item.currentStock <= item.reorderPoint);
        const report = {
          totalItemsTracked: items.length,
          lowStockCount: lowStock.length,
          lowStockItems: lowStock.map((item) => ({
            name: item.itemName,
            stock: `${item.currentStock} ${item.unit}`,
            reorderPoint: `${item.reorderPoint} ${item.unit}`
          }))
        };

        return {
          content: [
            {
              type: 'text',
              text: report.lowStockCount > 0
                ? `LOW STOCK DETECTED:\n${JSON.stringify(report, null, 2)}`
                : 'Inventory healthy. All tracked ingredients are above reorder thresholds.'
            }
          ]
        };
      }

      case 'get_menu': {
        const { restaurantId } = args;
        const menu = await MenuItem.find({ restaurantId }).sort({ category: 1 });
        return {
          content: [{ type: 'text', text: JSON.stringify(menu, null, 2) }]
        };
      }

      case 'add_menu_item': {
        const { restaurantId, category, name, price, description = '' } = args;
        const newItem = new MenuItem({ restaurantId, category, name, price, description });
        await newItem.save();
        return {
          content: [{ type: 'text', text: `Menu item '${name}' added successfully. ID: ${newItem._id}` }]
        };
      }

      case 'get_active_orders': {
        const { restaurantId } = args;
        const orders = await Order.find({
          restaurantId,
          orderStatus: { $nin: ['completed', 'cancelled'] }
        }).populate('tableId', 'tableNumber');
        return {
          content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }]
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

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DineSmart Admin MCP Server is running over stdio.');
}

startServer().catch((error) => {
  console.error('Failed to run Admin MCP Server:', error);
  process.exit(1);
});
