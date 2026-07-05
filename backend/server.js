const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const connectDB = require('./config/db');

env.validateEnv();
connectDB(env.mongodbUri);

const app = express();
const server = http.createServer(app);

const {
  secureHeaders,
  apiLimiter,
  authLimiter,
  xssSanitizer,
  csrfValidator,
  csrfTokenHandler
} = require('./middlewares/security');

const allowedOrigins = new Set(env.clientUrls);
const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

app.use(secureHeaders);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xssSanitizer);

const io = new Server(server, {
  cors: {
    origin: env.clientUrls,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

const registerSocketHandlers = require('./sockets/kitchenSocket');
registerSocketHandlers(io);

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const customerRoutes = require('./routes/customerRoutes');

app.get('/api/v1/csrf-token', csrfTokenHandler);

app.use('/api/v1/auth', authLimiter, authRoutes);

app.use('/api/v1/admin', csrfValidator, apiLimiter, adminRoutes);
app.use('/api/v1/kitchen', csrfValidator, apiLimiter, kitchenRoutes);
app.use('/api/v1/customer', csrfValidator, apiLimiter, customerRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error Trace:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: env.nodeEnv === 'production' ? 'Internal server error' : err.message
  });
});

const PORT = env.port;
server.listen(PORT, () => {
  console.log(`DineSmart AI REST & Socket Server is running on port ${PORT} [Mode: ${env.nodeEnv}]`);
});
