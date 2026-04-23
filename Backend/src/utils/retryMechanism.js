/**
 * Enhanced Retry Mechanism
 * Provides sophisticated retry strategies with exponential backoff, jitter, and circuit breaker patterns
 */

const EventEmitter = require('events');

class RetryMechanism extends EventEmitter {
  constructor(options = {}) {
    super();
    this.defaultOptions = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffFactor: 2,
      jitterFactor: 0.1,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      retryCondition: (error) => true,
      beforeRetry: null,
      afterRetry: null
    };
    
    this.options = { ...this.defaultOptions, ...options };
    this.circuitBreakers = new Map();
    this.retryStats = new Map();
  }

  /**
   * Execute a function with retry logic
   */
  async execute(fn, context = 'default', customOptions = {}) {
    const options = { ...this.options, ...customOptions };
    const circuitBreaker = this.getCircuitBreaker(context);
    
    // Check circuit breaker
    if (circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker is open for context: ${context}`);
    }

    let lastError;
    let attempt = 0;

    while (attempt <= options.maxRetries) {
      try {
        const result = await fn();
        
        // Reset circuit breaker on success
        circuitBreaker.recordSuccess();
        
        // Update stats
        this.updateStats(context, attempt, true);
        
        // Emit success event
        this.emit('success', { context, attempt, result });
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Record failure in circuit breaker
        circuitBreaker.recordFailure();
        
        // Check if we should retry
        if (attempt > options.maxRetries || !options.retryCondition(error)) {
          this.updateStats(context, attempt, false);
          this.emit('failure', { context, attempt, error });
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, options);
        
        // Call before retry hook
        if (options.beforeRetry) {
          await options.beforeRetry(error, attempt);
        }

        // Emit retry event
        this.emit('retry', { context, attempt, error, delay });
        
        // Wait before retrying
        await this.sleep(delay);
        
        // Call after retry hook
        if (options.afterRetry) {
          await options.afterRetry(error, attempt);
        }
      }
    }

    // If we get here, all retries failed
    this.updateStats(context, attempt, false);
    this.emit('exhausted', { context, attempts: attempt, lastError });
    throw lastError;
  }

  /**
   * Execute with specific retry strategies
   */
  async executeWithStrategy(fn, strategy, context = 'default') {
    const strategies = {
      immediate: { maxRetries: 3, baseDelay: 0, backoffFactor: 1 },
      linear: { maxRetries: 5, baseDelay: 1000, backoffFactor: 1 },
      exponential: { maxRetries: 5, baseDelay: 1000, backoffFactor: 2 },
      aggressive: { maxRetries: 10, baseDelay: 500, backoffFactor: 1.5 },
      conservative: { maxRetries: 3, baseDelay: 5000, backoffFactor: 3 }
    };

    const strategyOptions = strategies[strategy];
    if (!strategyOptions) {
      throw new Error(`Unknown retry strategy: ${strategy}`);
    }

    return this.execute(fn, context, strategyOptions);
  }

  /**
   * Execute with payment-specific retry logic
   */
  async executePaymentOperation(fn, context = 'payment') {
    return this.execute(fn, context, {
      maxRetries: 5,
      baseDelay: 2000,
      backoffFactor: 2,
      maxDelay: 30000,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and temporary payment failures
        return error.code === 'NETWORK_ERROR' ||
               error.code === 'TIMEOUT' ||
               error.code === 'TEMPORARY_FAILURE' ||
               error.code === 'PAYMENT_PROCESSING' ||
               (error.response && error.response.status >= 500);
      },
      beforeRetry: async (error, attempt) => {
        console.log(`Payment operation retry ${attempt}, error: ${error.message}`);
        // Add any payment-specific retry logic here
      }
    });
  }

  /**
   * Execute with WebSocket-specific retry logic
   */
  async executeWebSocketOperation(fn, context = 'websocket') {
    return this.execute(fn, context, {
      maxRetries: 10,
      baseDelay: 1000,
      backoffFactor: 1.5,
      maxDelay: 15000,
      retryCondition: (error) => {
        // Retry on connection errors
        return error.code === 'CONNECTION_ERROR' ||
               error.code === 'SOCKET_DISCONNECTED' ||
               error.code === 'TIMEOUT' ||
               error.message.includes('connection');
      },
      beforeRetry: async (error, attempt) => {
        console.log(`WebSocket operation retry ${attempt}, error: ${error.message}`);
        // Allow time for connection to stabilize
        if (attempt > 3) {
          await this.sleep(5000); // Extra delay for persistent issues
        }
      }
    });
  }

  /**
   * Execute with database-specific retry logic
   */
  async executeDatabaseOperation(fn, context = 'database') {
    return this.execute(fn, context, {
      maxRetries: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      maxDelay: 10000,
      retryCondition: (error) => {
        // Retry on deadlocks, connection errors, and timeouts
        return error.name === 'SequelizeConnectionError' ||
               error.name === 'SequelizeTimeoutError' ||
               error.name === 'SequelizeDeadlockError' ||
               (error.original && error.original.code === 'ECONNRESET');
      },
      beforeRetry: async (error, attempt) => {
        console.log(`Database operation retry ${attempt}, error: ${error.message}`);
        // Add database-specific retry logic here
      }
    });
  }

  /**
   * Batch retry for multiple operations
   */
  async executeBatch(operations, context = 'batch', batchOptions = {}) {
    const { 
      maxConcurrency = 5,
      failFast = false,
      aggregateErrors = true 
    } = batchOptions;

    const results = [];
    const errors = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await this.execute(operation.fn, `${context}_${i + index}`, operation.options);
          return { index: i + index, result, success: true };
        } catch (error) {
          const failure = { index: i + index, error, success: false };
          
          if (failFast) {
            throw failure;
          }
          
          return failure;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value);
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({ error: result.reason, success: false });
        }
      }
    }

    if (aggregateErrors && errors.length > 0) {
      const aggregateError = new Error(`Batch execution failed: ${errors.length} operations failed`);
      aggregateError.failures = errors;
      aggregateError.successes = results;
      throw aggregateError;
    }

    return { results, errors };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, options) {
    const exponentialDelay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * options.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Get or create circuit breaker for context
   */
  getCircuitBreaker(context) {
    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(context, new CircuitBreaker({
        threshold: this.options.circuitBreakerThreshold,
        timeout: this.options.circuitBreakerTimeout
      }));
    }
    return this.circuitBreakers.get(context);
  }

  /**
   * Update retry statistics
   */
  updateStats(context, attempts, success) {
    if (!this.retryStats.has(context)) {
      this.retryStats.set(context, {
        totalAttempts: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        averageAttempts: 0
      });
    }

    const stats = this.retryStats.get(context);
    stats.totalAttempts += attempts;
    
    if (success) {
      stats.totalSuccesses++;
    } else {
      stats.totalFailures++;
    }
    
    const totalOperations = stats.totalSuccesses + stats.totalFailures;
    stats.averageAttempts = stats.totalAttempts / totalOperations;
  }

  /**
   * Get retry statistics
   */
  getStats(context = null) {
    if (context) {
      return this.retryStats.get(context) || null;
    }
    
    const allStats = {};
    for (const [ctx, stats] of this.retryStats.entries()) {
      allStats[ctx] = { ...stats };
    }
    return allStats;
  }

  /**
   * Reset statistics and circuit breakers
   */
  reset(context = null) {
    if (context) {
      this.retryStats.delete(context);
      this.circuitBreakers.delete(context);
    } else {
      this.retryStats.clear();
      this.circuitBreakers.clear();
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

// Export singleton instance
module.exports = new RetryMechanism();
