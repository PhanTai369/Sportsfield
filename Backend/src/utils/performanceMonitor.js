/**
 * Simple Performance Monitor
 * Basic performance monitoring for production use
 */
const performanceMonitor = {
  metrics: new Map(),
  activeOperations: new Map(),

  startOperation(operationId, metadata = {}) {
    const startTime = Date.now();
    this.activeOperations.set(operationId, {
      startTime,
      metadata
    });
    return operationId;
  },

  endOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return null;
    }

    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);

    // Log performance metrics
    console.log(`Operation ${operationId} completed in ${duration}ms`);
    
    return { operationId, duration, result };
  },

  startMonitoring() {
    console.log('🔍 Performance monitoring started');
    return this;
  },

  stopMonitoring() {
    console.log('⏹️ Performance monitoring stopped');
    return this;
  },

  monitorBookingOperation(operation, bookingId, duration, success = true, error = null) {
    console.log(`Booking ${operation} for ${bookingId}: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
    if (error) {
      console.error(`Error: ${error}`);
    }
  },

  monitorPaymentOperation(operation, paymentId, duration, success = true, amount = null, error = null) {
    console.log(`Payment ${operation} for ${paymentId}: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
    if (error) {
      console.error(`Error: ${error}`);
    }
  }
};

module.exports = performanceMonitor;
