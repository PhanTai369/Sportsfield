/**
 * Request ID Middleware
 * Adds a unique correlation ID to each request for tracing across the system
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Middleware that adds a unique ID to each request
 * If a client provides an x-correlation-id header, it will be used
 * Otherwise, a new UUID v4 will be generated
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestIdMiddleware = (req, res, next) => {
  try {
    // Use provided correlation ID from header or generate a new one
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    
    // Add to request object for use in route handlers
    req.correlationId = correlationId;
    
    // Add to response headers
    res.setHeader('x-correlation-id', correlationId);
    
    // Add correlation ID to request logger
    if (req.log) {
      req.log = req.log.child({ correlationId });
    }
    
    // Log the request with correlation ID
    logger.debug(`Request received: ${req.method} ${req.originalUrl}`, {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });
    
    // Add response finished logging
    res.on('finish', () => {
      logger.debug(`Request completed: ${req.method} ${req.originalUrl}`, {
        correlationId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: res.responseTime
      });
    });
    
    next();
  } catch (error) {
    logger.error('Error in request ID middleware', { error });
    next(); // Continue even if there's an error
  }
};

module.exports = requestIdMiddleware; 