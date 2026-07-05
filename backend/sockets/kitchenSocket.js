const socketService = require('../services/socketService');

/**
 * Handle incoming Socket.io connections and register real-time listeners.
 * @param {Object} io Socket.io server instance
 */
function registerSocketHandlers(io) {
  // Initialize the socket publisher service
  socketService.init(io);

  io.on('connection', (socket) => {
    console.log(`New WebSocket client connected: ${socket.id}`);

    /**
     * Client room enrollment trigger
     * Payload: { restaurantId: String, role: String, tableId: String }
     */
    socket.on('room:join', ({ restaurantId, role, tableId }) => {
      if (!restaurantId) {
        console.warn(`Connection socket ${socket.id} attempted to join without restaurantId`);
        return;
      }

      // General restaurant broadcast channel (accessible by staff & admins)
      socket.join(`restaurant:${restaurantId}`);
      console.log(`Socket [${socket.id}] joined room -> [restaurant:${restaurantId}]`);

      // Kitchen displays enrollment
      if (role === 'kitchen' || role === 'admin') {
        socket.join(`kitchen:${restaurantId}`);
        console.log(`Socket [${socket.id}] joined room -> [kitchen:${restaurantId}]`);
      }

      // Customer tables enrollment
      if (role === 'customer' && tableId) {
        socket.join(`table:${tableId}`);
        console.log(`Socket [${socket.id}] joined room -> [table:${tableId}]`);
      }
    });

    /**
     * Customer triggers call for staff assistance
     * Payload: { restaurantId: String, tableId: String, tableNumber: String, reason: String }
     */
    socket.on('table:call_waiter', ({ restaurantId, tableId, tableNumber, reason }) => {
      if (!restaurantId || !tableId) return;

      console.log(`Call assistance triggered for Table ${tableNumber} -> reason: ${reason}`);

      // Broadcast alert to all active terminals inside the restaurant tenant
      io.to(`restaurant:${restaurantId}`).emit('waiter:requested', {
        tableId,
        tableNumber,
        reason: reason || 'General help requested',
        timestamp: new Date()
      });
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerSocketHandlers;
