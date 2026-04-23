const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat
  ),
  defaultMeta: { service: 'sports-field-api' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // File transport for all logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Separate file for error logs
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ],
  exitOnError: false
});

// Export a streamable object for Morgan HTTP logger
logger.stream = {
  write: (message) => logger.http(message.trim())
};

// Helper function to log email operations
const logEmailOperation = (operation, recipient, type, success, error = null) => {
  const logData = {
    operation,
    recipient,
    type, // 'customer_confirmation' or 'owner_notification'
    success,
    timestamp: new Date().toISOString()
  };

  if (error) {
    logData.error = error.message || error;
  }

  if (success) {
    logger.info(`Email ${operation} successful`, logData);
  } else {
    logger.error(`Email ${operation} failed`, logData);
  }
};

module.exports = logger;
module.exports.logEmailOperation = logEmailOperation;