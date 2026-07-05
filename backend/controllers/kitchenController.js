const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Table = require('../models/Table');
const socketService = require('../services/socketService');

/**
 * Get active orders queue for the kitchen (received, processing, ready)
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const { restaurantId } = req.user;

    // Retrieve active preparation states
    const activeOrders = await Order.find({
      restaurantId,
      orderStatus: { $in: ['received', 'processing', 'ready'] }
    })
      .populate('tableId', 'tableNumber status')
      .populate('orderItems')
      .sort({ createdAt: 1 }); // Oldest first to prioritize FIFO queueing

    res.status(200).json({ success: true, data: activeOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Accept and transition order statuses (e.g., received -> processing -> ready -> completed)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId } = req.user;
    const { orderStatus } = req.body;

    const validStatuses = ['received', 'processing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status transition requested' });
    }

    // Find and update order
    const order = await Order.findOne({ _id: id, restaurantId }).populate('tableId', 'tableNumber');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found in this restaurant tenant' });
    }

    order.orderStatus = orderStatus;

    // Auto-update associated items status if order status moves to completed or cancelled
    if (orderStatus === 'completed' || orderStatus === 'cancelled') {
      const itemStatus = orderStatus === 'completed' ? 'completed' : 'cancelled';
      await OrderItem.updateMany(
        { orderId: order._id },
        { $set: { status: itemStatus } }
      );

      // If completed, update table status back to vacant or cleaning
      if (orderStatus === 'completed') {
        await Table.updateOne(
          { _id: order.tableId._id },
          { $set: { status: 'cleaning', currentSessionId: null } }
        );
      }
    }

    await order.save();

    // Populate order items for real-time update broadcast payload
    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('orderItems');

    // Notify Customer table-specific socket room
    socketService.emitToRoom(`table:${order.tableId._id}`, 'order:status_updated', {
      orderId: order._id,
      orderStatus,
      message: `Your order is now ${orderStatus}!`
    });

    // Notify active Kitchen terminals to refresh displays
    socketService.emitToRoom(`kitchen:${restaurantId}`, 'order:status_refreshed', populatedOrder);

    // Notify Waitstaff / Admin screens
    socketService.emitToRoom(`restaurant:${restaurantId}`, 'order:state_change', populatedOrder);

    res.status(200).json({ success: true, message: 'Order status updated successfully', data: populatedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update the state of a single dish item (e.g., pending -> preparing -> completed)
 */
exports.updateOrderItemStatus = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { restaurantId } = req.user;
    const { status } = req.body;

    const validItemStatuses = ['pending', 'preparing', 'completed', 'cancelled'];
    if (!validItemStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid item status transition requested' });
    }

    // Find and update item
    const orderItem = await OrderItem.findOneAndUpdate(
      { _id: itemId, orderId: id, restaurantId },
      { $set: { status } },
      { new: true }
    );

    if (!orderItem) {
      return res.status(404).json({ success: false, message: 'Order line item not found' });
    }

    // Retrieve full order details to check if entire order status should auto-advance
    const order = await Order.findOne({ _id: id, restaurantId }).populate('orderItems');
    
    // Auto-advance order status to "processing" if first item is moved to "preparing"
    if (status === 'preparing' && order.orderStatus === 'received') {
      order.orderStatus = 'processing';
      await order.save();
    }

    // If all items are completed, alert staff or transition status
    const allItemsCompleted = order.orderItems.every(item => ['completed', 'cancelled'].includes(item.status));
    if (allItemsCompleted && order.orderStatus === 'processing') {
      order.orderStatus = 'ready';
      await order.save();

      // Notify customer table that entire order is ready
      socketService.emitToRoom(`table:${order.tableId}`, 'order:status_updated', {
        orderId: order._id,
        orderStatus: 'ready',
        message: 'Your order is ready! A waiter will serve it shortly.'
      });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'tableNumber status')
      .populate('orderItems');

    // Notify Kitchen display monitors
    socketService.emitToRoom(`kitchen:${restaurantId}`, 'order:status_refreshed', populatedOrder);

    // Notify Waitstaff / Admin screens
    socketService.emitToRoom(`restaurant:${restaurantId}`, 'order:state_change', populatedOrder);

    res.status(200).json({ success: true, message: 'Line item status updated successfully', data: orderItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
