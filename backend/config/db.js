const mongoose = require('mongoose');

/**
 * Establishes a connection to the MongoDB cluster.
 * Configured with auto-reconnection parameters for production environments.
 * @param {string} connectionString MongoDB Atlas Connection URI
 */
const connectDB = async (connectionString) => {
  try {
    const conn = await mongoose.connect(connectionString, {
      autoIndex: true, // Auto-build schema-defined indexes
    });

    console.log(`🚀 MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Failure: ${error.message}`);
    process.exit(1); // Stop execution immediately on database connectivity errors
  }

  // Handle runtime connection drops
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection disconnected. Attempting automatic reconnection...');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err.message}`);
  });
};

module.exports = connectDB;
