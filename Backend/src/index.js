const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { errorHandler } = require('./common');
const { globalErrorHandler } = errorHandler;
const logger = require('./utils/logger');
const requestLoggerMiddleware = require('./middlewares/requestLogger');
const requestIdMiddleware = require('./middlewares/requestId');
const responseFormatter = require('./utils/responseFormatter');
const { initializeSocket } = require('./config/socket.config');
const { setSocketInstance } = require('./utils/socketInstance');

// Load environment variables
dotenv.config();

// Import DB and models
const { sequelize, testDbConnection, syncModels } = require('./models');

// Import routes
const routes = require('./routes');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Set the socket instance for global use
setSocketInstance(io);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://frontend-two-puce-96.vercel.app',
      'https://frontend-omega-ochre.vercel.app'
    ].filter(Boolean); // Remove any undefined values
    
    if (allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin.replace(/\/+$/, '')))) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['x-correlation-id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware - but exclude webhook route from JSON parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add correlation ID to every request
app.use(requestIdMiddleware);

// Request logging middleware
app.use(requestLoggerMiddleware);

// Routes
app.use('/api', routes);

// Default route
app.get('/', (req, res) => {
  res.json(responseFormatter.success({ 
    message: 'Welcome to Football Field Booking API.',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json(
    responseFormatter.error(`Route ${req.originalUrl} not found`, 404)
  );
  logger.warn(`404 - Route not found: ${req.originalUrl}`, { correlationId: req.correlationId });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { 
    correlationId: req.correlationId,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Format the error response
  const statusCode = err.statusCode || 500;
  const errorResponse = responseFormatter.error(
    err.message || 'Internal Server Error',
    statusCode,
    err.errors
  );
  
  res.status(statusCode).json(errorResponse);
});

// Server setup
const PORT = process.env.PORT || 5001;

// Test DB connection and sync models
const startServer = async () => {
  try {
    // Test the database connection
    await testDbConnection();
    logger.info('Database connection successful');
    
    // Sync all models with the database
    await syncModels();
    logger.info('Models synchronized with database');
    
    // Initialize PaymentTimeoutService for handling expired bookings
    const PaymentTimeoutService = require('./services/paymentTimeoutService');
    PaymentTimeoutService.init();
    logger.info('PaymentTimeoutService initialized for expired bookings cleanup');
    
    // Initialize BookingStatusService for auto-completing bookings
    const BookingStatusService = require('./services/bookingStatusService');
    BookingStatusService.startPeriodicStatusUpdate();
    logger.info('BookingStatusService initialized for auto-updating booking status');
    
    // Initialize cron jobs
    const { initCronJobs } = require('./utils/cronJobs');
    initCronJobs();
    logger.info('Cron jobs initialized successfully');
    
    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connection
        sequelize.close().then(() => {
          logger.info('Database connection closed');
          process.exit(0);
        }).catch((err) => {
          logger.error('Error closing database connection:', err);
          process.exit(1);
        });
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
    
    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Socket.IO server initialized`);
      logger.info(`CORS enabled for: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
  }
};

startServer();

// Export the io instance for use in other modules
module.exports = { app, server, io };