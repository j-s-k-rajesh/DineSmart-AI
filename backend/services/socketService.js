let io = null;

module.exports = {
  /**
   * Initialize socket service with the Socket.io server instance.
   * @param {Object} socketIoInstance
   */
  init: (socketIoInstance) => {
    io = socketIoInstance;
    console.log('SocketService initialized with Socket.io server');
  },

  /**
   * Expose the raw io instance.
   * @returns {Object}
   */
  getIO: () => {
    if (!io) {
      throw new Error('SocketService has not been initialized yet!');
    }
    return io;
  },

  /**
   * Emits an event to all sockets joined to a specific room.
   * @param {string} roomName Name of room, e.g. "kitchen:restaurantId"
   * @param {string} eventName Event key, e.g. "order:placed"
   * @param {Object} data Payload object
   */
  emitToRoom: (roomName, eventName, data) => {
    if (!io) {
      console.warn(`Socket.io not initialized, suppressed event ${eventName} to room ${roomName}`);
      return;
    }
    io.to(roomName).emit(eventName, data);
    console.log(`SocketEvent emitted -> [Room: ${roomName}] [Event: ${eventName}]`);
  }
};
