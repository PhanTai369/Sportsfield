const morgan = require('morgan');
const logger = require('../utils/logger');

// Define custom token for response time
morgan.token('response-time', (req, res) => {
  const time = res.responseTime || 0;
  return time + 'ms';
});

// Define custom token for request body (sanitized for sensitive data)
morgan.token('request-body', (req) => {
  if (!req.body) return '';
  
  const sanitizedBody = { ...req.body };
  
  // Remove sensitive fields
  if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
  if (sanitizedBody.token || sanitizedBody.tokenId) sanitizedBody.token = '[REDACTED]';
  
  return JSON.stringify(sanitizedBody);
});

// Create request logging middleware
const requestLogger = morgan(
  // Format: method url status response-time - request-body
  ':method :url :status :response-time - :request-body',
  {
    stream: logger.stream,
    // Add response time to the response object for the custom token
    skip: (req, res) => res.statusCode < 400 && process.env.NODE_ENV === 'production'
  }
);

// Middleware to calculate response time
const responseTime = (req, res, next) => {
  const startHrTime = process.hrtime();
  
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;
    res.responseTime = elapsedTimeInMs.toFixed(3);
  });
  
  next();
};

module.exports = [responseTime, requestLogger]; 