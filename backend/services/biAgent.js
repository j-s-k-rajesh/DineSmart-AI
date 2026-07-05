const { FunctionTool, LlmAgent } = require('@google/adk');
const { z } = require('zod');
const mongoose = require('mongoose');

// Import Mongoose Models
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Inventory = require('../models/Inventory');
const Table = require('../models/Table');

// Helper to check MongoDB connection status
async function ensureDbConnected() {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart';
    await mongoose.connect(uri);
  }
}

// 1. Tool Definition: create_table
const createTableTool = new FunctionTool({
  name: 'create_table',
  description: 'Allocates a physical table inside the restaurant layout and generates its base64 QR code representation.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    tableNumber: z.string().describe('The table number string, e.g. "T15"'),
    seatingCapacity: z.number().optional().default(4).describe('Seating capacity')
  }),
  execute: async ({ restaurantId, tableNumber, seatingCapacity }) => {
    await ensureDbConnected();
    const qrcode = require('qrcode');

    const existing = await Table.findOne({ restaurantId, tableNumber });
    if (existing) {
      return { status: 'error', message: `Table ${tableNumber} is already registered.` };
    }

    const table = new Table({ restaurantId, tableNumber, seatingCapacity });
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const qrTargetUrl = `${clientUrl}/menu/${restaurantId}/${table._id}`;
    
    const qrDataUrl = await qrcode.toDataURL(qrTargetUrl, {
      errorCorrectionLevel: 'H',
      width: 400
    });

    table.qrCodeDataUrl = qrDataUrl;
    await table.save();

    return { status: 'success', message: `Table ${tableNumber} created successfully.`, tableId: table._id.toString() };
  }
});

// 2. Tool Definition: update_order_status
const updateOrderStatusTool = new FunctionTool({
  name: 'update_order_status',
  description: 'Adjusts the state of a customer order (e.g. processing, ready, completed).',
  parameters: z.object({
    orderId: z.string().describe('The unique order ID'),
    status: z.string().describe('Target state (received, processing, ready, completed, cancelled)')
  }),
  execute: async ({ orderId, status }) => {
    await ensureDbConnected();
    const order = await Order.findById(orderId);
    if (!order) {
      return { status: 'error', message: 'Order not found.' };
    }
    
    order.orderStatus = status;

    if (status === 'completed' || status === 'cancelled') {
      const itemStatus = status === 'completed' ? 'completed' : 'cancelled';
      await OrderItem.updateMany({ orderId: order._id }, { $set: { status: itemStatus } });
      
      if (status === 'completed') {
        await Table.updateOne({ _id: order.tableId }, { $set: { status: 'cleaning', currentSessionId: null } });
      }
    }

    await order.save();
    return { status: 'success', message: `Order status changed to ${status}.` };
  }
});

// 3. Tool Definition: sales_analytics
const salesAnalyticsTool = new FunctionTool({
  name: 'sales_analytics',
  description: 'Aggregates sales metrics (revenue, order counts, basket averages, best sellers) within a timeframe.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    startDate: z.string().describe('ISO date string, e.g. "2026-06-01T00:00:00Z"'),
    endDate: z.string().describe('ISO date string, e.g. "2026-06-30T23:59:59Z"')
  }),
  execute: async ({ restaurantId, startDate, endDate }) => {
    await ensureDbConnected();

    const dateFilter = {
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const analytics = await Order.aggregate([
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

    const stats = analytics[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };

    const topItems = await OrderItem.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$menuItemId', name: { $first: '$name' }, totalQty: { $sum: '$quantity' }, revenue: { $sum: { $multiply: ['$price', '$quantity'] } } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    return {
      status: 'success',
      data: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        averageOrderValue: parseFloat(stats.averageOrderValue.toFixed(2)),
        topSellers: topItems
      }
    };
  }
});

// 4. Tool Definition: inventory_report
const inventoryReportTool = new FunctionTool({
  name: 'inventory_report',
  description: 'Scans tracked inventory items and highlights stock items falling below safety reorder marks.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID')
  }),
  execute: async ({ restaurantId }) => {
    await ensureDbConnected();
    const items = await Inventory.find({ restaurantId });
    const lowStock = items.filter(i => i.currentStock <= i.reorderPoint);

    return {
      status: 'success',
      data: {
        totalTracked: items.length,
        lowStockItems: lowStock.map(item => ({
          itemName: item.itemName,
          currentStock: item.currentStock,
          unit: item.unit,
          reorderPoint: item.reorderPoint
        }))
      }
    };
  }
});

// 5. Tool Definition: peak_hours_analysis
const peakHoursAnalysisTool = new FunctionTool({
  name: 'peak_hours_analysis',
  description: 'Analyzes which hours of the day generate the most order volume and traffic transactions.',
  parameters: z.object({
    restaurantId: z.string().describe('The restaurant ID'),
    startDate: z.string().describe('ISO date string for start range'),
    endDate: z.string().describe('ISO date string for end range')
  }),
  execute: async ({ restaurantId, startDate, endDate }) => {
    await ensureDbConnected();

    const result = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $project: {
          hour: { $hour: '$createdAt' },
          totalAmount: 1
        }
      },
      {
        $group: {
          _id: '$hour',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } } // Sort by traffic (busiest hours first)
    ]);

    return { status: 'success', data: result };
  }
});

// Define LLM Agent
const biAgent = new LlmAgent({
  name: 'bi_agent',
  model: 'gemini-2.5-flash',
  instruction: `
You are the Business Intelligence (BI) Agent for DineSmart AI.
Your purpose is to assist managers and administrators with metric aggregations, sales queries, stock monitoring, layout setups, and scheduling checks.

Capabilities:
1. Daily Sales Summary: Report total orders, revenues, and basket values for today.
2. Best Selling Dishes: Query high-quantity order line items.
3. Revenue Trends: Summarize totals over time.
4. Restocking Suggestions: List items with stock levels below reorder safety thresholds.
5. Peak Hours Analysis: Identify busiest transaction hours.

Rules:
1. Always base stats on data returned by the tools. Do not hallucinate figures.
2. ALWAYS use the Rupee symbol "₹" when discussing prices, revenues, or average order values, never "$".
3. When highlighting low stock, suggest quantities to purchase to reach 3x the reorder threshold.
4. Keep dashboard summaries structured and professional, using markdown bullets and tables.
`,
  tools: [createTableTool, updateOrderStatusTool, salesAnalyticsTool, inventoryReportTool, peakHoursAnalysisTool]
});

/**
 * Interface function to execute the BI Agent loop.
 * @param {string} prompt Input query from administrator.
 * @param {Object} context Metadata context containing { restaurantId }
 */
async function chatWithBIAgent(prompt, context) {
  const finalPrompt = `
Context Information:
- Restaurant ID: ${context.restaurantId}

User Query: ${prompt}
`;

  try {
    const response = await biAgent.ask({
      prompt: finalPrompt
    });

    return {
      success: true,
      text: response.text
    };
  } catch (error) {
    console.error('Error running ADK BI Agent:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  biAgent,
  chatWithBIAgent
};
