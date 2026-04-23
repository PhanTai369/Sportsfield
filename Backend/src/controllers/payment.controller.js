const PaymentService = require('../services/payment.service');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');
const { logEmailOperation } = require('../utils/logger');
const { Booking, TimeSlot, Field, User, SubField, Payment, Location } = require('../models');
const { ValidationError, Op } = require('sequelize');
const { sequelize } = require('../config/db.config');
const dbOptimizer = require('../utils/dbOptimizer');
const retryMechanism = require('../utils/retryMechanism');
const performanceMonitor = require('../utils/performanceMonitorNew');
const Redis = require('ioredis');
const sanitizeHtml = require('sanitize-html');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const { emitBookingStatusUpdate, emitBookingPaymentUpdate, emitBookingEvent } = require('../config/socket.config');
// Import centralized services
const BookingEmailService = require('../services/shared/bookingEmailService');
const TimeSlotService = require('../services/shared/timeSlotService');
const RealTimeEventService = require('../services/shared/realTimeEventService');
const emailService = require('../utils/emailService');

// Redis setup with fallback
let redis = null;
let redisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryDelay: 1000,
    showFriendlyErrorStack: false
  });
  
  redis.on('connect', () => {
    console.log('Redis connected successfully');
    redisAvailable = true;
  });
  
  redis.on('error', (err) => {
    console.warn('Redis unavailable, using in-memory locking for this session');
    redisAvailable = false;
    // Prevent reconnection attempts
    if (redis) {
      redis.disconnect();
      redis = null;
    }
  });
  
} catch (error) {
  console.warn('Redis initialization failed, using in-memory locking:', error.message);
  redisAvailable = false;
  redis = null;
}

// Simple in-memory lock for preventing concurrent duplicate bookings (fallback)
const bookingLocks = new Map();

// Rate limiter cho API thanh toán
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // giới hạn 5 request mỗi IP
  message: 'Quá nhiều yêu cầu thanh toán, vui lòng thử lại sau.'
});

class PaymentController {
  constructor() {
    // Constructor without rate limiter application
  }

  /**
   * Acquire lock using Redis or in-memory fallback
   */
  async acquireLock(lockKey, timeout = 30) {
    if (redisAvailable && redis) {
      try {
        return await redis.set(lockKey, 'locked', 'NX', 'EX', timeout);
      } catch (error) {
        console.warn('Redis lock failed, using in-memory fallback:', error.message);
        redisAvailable = false;
      }
    }
    
    // In-memory fallback
    if (bookingLocks.has(lockKey)) {
      return null; // Lock already exists
    }
    
    bookingLocks.set(lockKey, {
      timestamp: Date.now(),
      timeout: timeout * 1000 // Convert to milliseconds
    });
    
    // Clean up expired locks after timeout
    setTimeout(() => {
      this.releaseLock(lockKey);
    }, timeout * 1000);
    
    return 'OK';
  }

  /**
   * Release lock using Redis or in-memory fallback
   */
  async releaseLock(lockKey) {
    if (redisAvailable && redis) {
      try {
        await redis.del(lockKey);
        return;
      } catch (error) {
        console.warn('Redis unlock failed, using in-memory fallback:', error.message);
        redisAvailable = false;
      }
    }
    
    // In-memory fallback
    bookingLocks.delete(lockKey);
  }

  // Sanitize và validate đầu vào
  validateBookingData(data) {
    const fs = require('fs');
    try {
      fs.writeFileSync('/tmp/validation_debug.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        receivedData: data
      }, null, 2));
      const errors = [];
    
    // Validate required fields
    if (!data.fieldId || !validator.isUUID(data.fieldId)) {
      errors.push('ID sân không hợp lệ');
    }
    
    if (!Array.isArray(data.subFieldIds) || data.subFieldIds.length === 0) {
      errors.push('Chưa chọn sân con');
    } else {
      // Validate each subfield ID
      for (const id of data.subFieldIds) {
        if (!validator.isUUID(id)) {
          errors.push('ID sân con không hợp lệ');
          break;
        }
      }
    }
    
    // Validate booking date
    if (!data.bookingDate || !validator.isDate(data.bookingDate)) {
      errors.push('Ngày đặt sân không hợp lệ');
    }
    
    // Validate time slots
    if (!Array.isArray(data.timeSlots) || data.timeSlots.length === 0) {
      errors.push('Chưa chọn khung giờ');
    } else {
      for (const slot of data.timeSlots) {
        if (!slot.start_time || !slot.end_time || 
            !validator.matches(slot.start_time, /^([01]\d|2[0-3]):([0-5]\d)$/) ||
            !validator.matches(slot.end_time, /^([01]\d|2[0-3]):([0-5]\d)$/)) {
          errors.push('Định dạng thời gian không hợp lệ');
          break;
        }
      }
    }
    
    // Validate amount
    if (!data.totalAmount || !validator.isInt(data.totalAmount.toString(), { min: 1000 })) {
      errors.push('Số tiền không hợp lệ');
    }
    
    // Validate customer info
    if (!data.customerInfo) {
      errors.push('Thiếu thông tin khách hàng');
    } else {
      if (!data.customerInfo.email || !validator.isEmail(data.customerInfo.email)) {
        errors.push('Email không hợp lệ');
      }
      if (!data.customerInfo.name || !validator.isLength(data.customerInfo.name, { min: 2, max: 100 })) {
        errors.push('Tên không hợp lệ');
      }
    }
    
    // Validate URLs - be more permissive for localhost URLs
    try {
      if (data.return_url) {
        const isValidReturnUrl = validator.isURL(data.return_url, { require_protocol: true, allow_localhost: true }) ||
                                  (data.return_url.startsWith('http://localhost:') || data.return_url.startsWith('https://localhost:'));
        fs.writeFileSync('/tmp/url_debug.json', JSON.stringify({
          return_url: data.return_url,
          isValidReturnUrl: isValidReturnUrl,
          cancel_url: data.cancel_url,
          isValidCancelUrl: data.cancel_url ? (validator.isURL(data.cancel_url, { require_protocol: true, allow_localhost: true }) ||
                                              (data.cancel_url.startsWith('http://localhost:') || data.cancel_url.startsWith('https://localhost:'))) : 'not provided'
        }, null, 2));
        
        if (!isValidReturnUrl) {
          errors.push('URL trả về không hợp lệ');
        }
      }
      if (data.cancel_url) {
        const isValidCancelUrl = validator.isURL(data.cancel_url, { require_protocol: true, allow_localhost: true }) ||
                                  (data.cancel_url.startsWith('http://localhost:') || data.cancel_url.startsWith('https://localhost:'));
        if (!isValidCancelUrl) {
          errors.push('URL hủy không hợp lệ');
        }
      }
    } catch (urlError) {
      errors.push('Lỗi xác thực URL');
    }

    return errors;
    } catch (mainError) {
      fs.writeFileSync('/tmp/validation_main_error.json', JSON.stringify({
        error: mainError.message,
        stack: mainError.stack
      }, null, 2));
      return ['Lỗi xác thực dữ liệu'];
    }
  }

  // Sanitize customer info
  sanitizeCustomerInfo(customerInfo) {
    return {
      name: sanitizeHtml(customerInfo.name),
      email: sanitizeHtml(customerInfo.email),
      notes: customerInfo.notes ? sanitizeHtml(customerInfo.notes) : ''
    };
  }

  /**
   * Create booking and payment intent together
   */
  async createBookingWithPayment(req, res) {
    logger.info('createBookingWithPayment method called');
    
    const operationId = performanceMonitor.startOperation('create_booking_with_payment', {
      type: 'payment_booking',
      fieldId: req.body.fieldId,
      amount: req.body.totalAmount
    });
    
    try {
      const userId = req.user?.id;
      
      // Check if user is authenticated
      if (!userId) {
        performanceMonitor.endOperation(operationId, { error: 'UNAUTHORIZED' });
        return res.status(401).json(responseFormatter.error({
          code: 'UNAUTHORIZED',
          message: 'Bạn cần đăng nhập để đặt sân'
        }));
      }
      
      // Validate input data
      const validationErrors = this.validateBookingData(req.body);
      if (validationErrors.length > 0) {
        logger.error('Booking validation errors:', validationErrors);
        return res.status(400).json(responseFormatter.error({ 
          code: 400, 
          message: 'Dữ liệu không hợp lệ',
          errors: validationErrors
        }));
      }
      
      const {
        fieldId,
        subFieldIds,
        bookingDate,
        timeSlots,
        totalAmount,
        customerInfo,
        currency = 'vnd',
        return_url
      } = req.body;

      // Sanitize customer info
      const sanitizedCustomerInfo = this.sanitizeCustomerInfo(customerInfo);
      
      // Create a unique lock key
      const lockKey = `booking:${fieldId}:${bookingDate}:${sanitizedCustomerInfo.email}:${totalAmount}`;
      
      // Try to acquire lock with 30s timeout
      const locked = await this.acquireLock(lockKey, 30);
      if (!locked) {
        return res.status(409).json(responseFormatter.error({ 
          code: 409, 
          message: 'Booking request already in progress' 
        }));
      }

      try {
        // Check if field exists with retry mechanism and fetch full info for metadata
        const field = await retryMechanism.executeDatabaseOperation(
          () => Field.findByPk(fieldId, {
            include: [
              {
                model: Location,
                as: 'location',
                attributes: ['address_text', 'city', 'district', 'ward']
              }
            ],
            attributes: ['id', 'name', 'description', 'price_per_hour', 'images1']
          }),
          'field_lookup'
        );
        
        console.log('Field found:', !!field);
        if (!field) {
          console.log('Field not found in database');
          performanceMonitor.endOperation(operationId, { error: 'FIELD_NOT_FOUND' });
          return res.status(404).json(responseFormatter.error({ 
            code: 404, 
            message: 'Field not found' 
          }));
        }

        // Fetch subfield info for metadata
        let subFieldsInfo = [];
        if (subFieldIds && subFieldIds.length > 0) {
          try {
            const subFields = await retryMechanism.executeDatabaseOperation(
              () => SubField.findAll({
                where: { id: subFieldIds },
                attributes: ['id', 'name', 'field_type']
              }),
              'subfield_lookup'
            );
            subFieldsInfo = subFields;
          } catch (subFieldError) {
            console.log('Could not fetch subfield info:', subFieldError.message);
          }
        }

        // Use optimized availability check with proper overlap logic
        console.log('Checking availability with optimized method (fixed overlap logic)');
        const availabilityResult = await retryMechanism.executeDatabaseOperation(
          () => dbOptimizer.checkAvailabilityOptimized(fieldId, bookingDate, timeSlots),
          'availability_check'
        );

        if (!availabilityResult.isAvailable) {
          console.log('❌ Found conflicts:', availabilityResult.conflicts);
          performanceMonitor.endOperation(operationId, { error: 'AVAILABILITY_CONFLICT' });
          const firstConflict = availabilityResult.conflicts[0];
          const errorMessage = `Time slot ${firstConflict.requestedSlot?.start_time || 'không xác định'} is already booked`;
          console.log('Returning error:', errorMessage);
          
          const errorResponse = responseFormatter.error({ 
            code: 409, 
            message: errorMessage, 
            details: { conflicts: availabilityResult.conflicts } 
          });
          console.log('Generated error response:', JSON.stringify(errorResponse, null, 2));
          
          return res.status(409).json(errorResponse);
        }
        
        console.log('✅ All time slots are available');

        // Additional check: look for recent duplicate bookings with optimized lookup
        const recentBooking = await retryMechanism.executeDatabaseOperation(
          () => dbOptimizer.findRecentDuplicateBooking(fieldId, bookingDate, sanitizedCustomerInfo.email, totalAmount, 30000),
          'duplicate_check'
        );

        if (recentBooking) {
          console.log('Duplicate booking attempt detected, returning existing booking:', recentBooking.id);
          
          // Find existing payment for this booking with retry
          const existingPayment = await retryMechanism.executeDatabaseOperation(
            () => Payment.findOne({ where: { booking_id: recentBooking.id } }),
            'payment_lookup'
          );

          if (existingPayment) {
            performanceMonitor.endOperation(operationId, { success: true, duplicate: true });
            return res.status(200).json(responseFormatter.success({
              booking_id: recentBooking.id,
              payment_intent_id: existingPayment.stripe_payment_intent_id,
              client_secret: existingPayment.stripe_client_secret,
              payment_id: existingPayment.id,
              amount: existingPayment.amount,
              currency: existingPayment.currency || 'vnd'
            }, 'Existing booking and payment found'));
          }
        }

        // Create booking with pending status using transaction with retry mechanism
        console.log('Creating booking...');
        let booking;
        let attemptCount = 0;
        const maxRetries = 3;
        
        while (attemptCount < maxRetries) {
          try {
            attemptCount++;
            console.log(`🔄 Atomic booking creation attempt ${attemptCount}/${maxRetries}`);
            
            // Use atomic booking creation with proper conflict detection
            const atomicResult = await retryMechanism.executeDatabaseOperation(
              () => dbOptimizer.createBookingAtomically(fieldId, bookingDate, timeSlots, {
                user_id: userId,
                booking_date: new Date(),
                status: 'payment_pending', // Start with payment_pending
                total_price: totalAmount,
                payment_status: 'pending',
                customer_info: sanitizedCustomerInfo,
                booking_metadata: {
                  fieldId,
                  fieldName: field.name,
                  fieldDescription: field.description,
                  fieldImages: field.images1,
                  fieldLocation: field.location ? {
                    address: field.location.address_text,
                    city: field.location.city,
                    district: field.location.district,
                    ward: field.location.ward
                  } : null,
                  subFieldIds,
                  subFields: subFieldsInfo.map(sf => ({
                    id: sf.id,
                    name: sf.name,
                    field_type: sf.field_type
                  })),
                  playDate: bookingDate,
                  timeSlots
                }
              }),
              'atomic_booking_creation'
            );

            // Check if booking creation failed due to conflicts
            if (atomicResult.error) {
              console.log('❌ Booking creation failed due to conflicts:', atomicResult.message);
              performanceMonitor.endOperation(operationId, { error: atomicResult.code });
              return res.status(409).json(responseFormatter.error({
                code: atomicResult.code,
                message: atomicResult.message,
                details: atomicResult.details
              }));
            }

            booking = atomicResult;
            console.log('✅ Booking and time slots created atomically:', booking.id);
            
            // Monitor payment operation
            performanceMonitor.monitorPaymentOperation('create', booking.id, totalAmount, true);
            
            // Break out of retry loop on success
            break;

          } catch (transactionError) {
            console.error(`❌ Transaction error on attempt ${attemptCount}:`, transactionError);
            
            // Check if it's a deadlock or lock timeout that we can retry
            const isRetryableError = (
              transactionError.original?.code === '40P01' || // PostgreSQL deadlock
              transactionError.original?.errno === 1213 ||   // MySQL deadlock
              transactionError.original?.code === '55P03' || // PostgreSQL lock timeout
              transactionError.original?.errno === 1205 ||   // MySQL lock timeout
              transactionError.message.includes('deadlock') ||
              transactionError.message.includes('timeout') ||
              transactionError.message.includes('SERIALIZABLE')
            );
            
            if (isRetryableError && attemptCount < maxRetries) {
              console.log(`🔄 Detected retryable error, waiting before retry ${attemptCount + 1}...`);
              // Wait with exponential backoff before retry
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attemptCount) * 100));
              continue; // Retry
            }
            
            // Check if it's a unique constraint violation (race condition caught by DB)
            if (transactionError.name === 'SequelizeUniqueConstraintError' || 
                transactionError.original?.code === '23505' || // PostgreSQL unique violation
                transactionError.original?.errno === 1062 ||   // MySQL duplicate entry
                transactionError.message.includes('duplicate') || 
                transactionError.message.includes('unique')) {
              
              console.log('🚨 Race condition caught by database constraint');
              performanceMonitor.endOperation(operationId, { error: 'RACE_CONDITION_DB' });
              return res.status(409).json(responseFormatter.error({
                code: 409,
                message: 'Khung giờ đã được đặt bởi người dùng khác cùng lúc',
                details: { error: 'Database prevented race condition' }
              }));
            }
            
            // If we've exhausted retries or hit a non-retryable error
            if (attemptCount >= maxRetries) {
              console.log('❌ Max retries exhausted, failing request');
              performanceMonitor.monitorPaymentOperation('create', null, totalAmount, false, transactionError.message);
              throw transactionError;
            }
          }
        }

        // Create Stripe Checkout Session after successful transaction
        console.log('Creating Stripe Checkout Session...');
        try {
          const paymentData = {
            booking_id: booking.id,
            amount: parseInt(totalAmount),
            currency,
            customer_info: sanitizedCustomerInfo,
            field: field,
            booking_metadata: {
              fieldId,
              subFieldIds,
              playDate: bookingDate,
              timeSlots
            },
            success_url: `${req.headers.origin || 'http://localhost:5173'}/booking/confirmation?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'http://localhost:5173'}/payment/cancel`
          };

          const paymentResult = await PaymentService.createCheckoutSession(paymentData);
          console.log('Checkout session created:', paymentResult.session_id);

          return res.status(200).json(responseFormatter.success({
            booking_id: booking.id,
            checkout_url: paymentResult.checkout_url,
            session_id: paymentResult.session_id,
            payment_id: paymentResult.payment_id,
            amount: paymentResult.amount,
            currency: paymentResult.currency
          }, 'Booking and checkout session created successfully'));

        } catch (paymentError) {
          console.error('Error creating checkout session:', paymentError);
          throw paymentError;
        }

      } catch (error) {
        logger.error('Error creating booking with payment:', error);
        if (error instanceof ValidationError) {
          return res.status(400).json(responseFormatter.error({ 
            code: 400, 
            message: 'Validation error: ' + error.message 
          }));
        }
        return res.status(500).json(responseFormatter.error({ 
          code: 500, 
          message: error.message 
        }));
      } finally {
        // Always release the lock
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      logger.error('Error in createBookingWithPayment:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: 'Internal server error' 
      }));
    }
  }

  /**
   * Create payment intent for existing booking
   */
  async createPaymentIntent(req, res) {
    try {
      const { 
        booking_id, 
        amount, 
        currency = 'vnd',
        return_url,
        customer_info 
      } = req.body;

      // Validate required fields
      if (!booking_id || !amount) {
        return res.status(400).json(responseFormatter.error({ 
          code: 400, 
          message: 'Booking ID và số tiền là bắt buộc' 
        }));
      }

      const paymentData = {
        booking_id,
        user_id: req.user?.id || null,
        amount: parseInt(amount),
        currency,
        customer_info,
        metadata: {
          return_url,
          source: 'web_booking'
        }
      };

      const result = await PaymentService.createPaymentIntent(paymentData);

      return res.status(200).json(responseFormatter.success({
        payment_intent_id: result.payment_intent_id,
        client_secret: result.client_secret,
        payment_id: result.payment_id,
        amount: result.amount,
        currency: result.currency
      }, 'Payment intent created successfully'));

    } catch (error) {
      logger.error('Error creating payment intent:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: error.message 
      }));
    }
  }

  /**
   * Confirm payment
   */
  async confirmPayment(req, res) {
    try {
      const { payment_intent_id } = req.body;

      if (!payment_intent_id) {
        return res.status(400).json(responseFormatter.error({ 
          code: 400, 
          message: 'Payment intent ID is required' 
        }));
      }

      const result = await PaymentService.confirmPayment(payment_intent_id);

      return res.status(200).json(responseFormatter.success(result, 'Payment confirmed successfully'));

    } catch (error) {
      logger.error('Error confirming payment:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: error.message 
      }));
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(req, res) {
    try {
      const { payment_id } = req.params;

      const payment = await PaymentService.getPaymentDetails(payment_id);

      if (!payment) {
        return res.status(404).json(responseFormatter.error({ 
          code: 404, 
          message: 'Payment not found' 
        }));
      }

      return res.status(200).json(responseFormatter.success(payment, 'Payment details retrieved successfully'));

    } catch (error) {
      logger.error('Error getting payment details:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: error.message 
      }));
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      // Construct event from raw body
      event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
        req.body, 
        sig, 
        endpointSecret
      );
      
      logger.info('Stripe webhook event received:', { type: event.type, id: event.id });
      
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          logger.info('Processing checkout.session.completed webhook');
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
          
        case 'checkout.session.async_payment_succeeded':
          logger.info('Processing checkout.session.async_payment_succeeded webhook');
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
          
        case 'checkout.session.expired':
          logger.info('Processing checkout.session.expired webhook');
          await this.handleCheckoutSessionExpired(event.data.object);
          break;
          
        case 'payment_intent.succeeded':
          logger.info('Processing payment_intent.succeeded webhook');
          await this.handlePaymentSucceeded(event.data.object);
          break;
          
        case 'payment_intent.payment_failed':
          logger.info('Processing payment_intent.payment_failed webhook');
          await this.handlePaymentFailed(event.data.object);
          break;
          
        case 'checkout.session.pending':
          logger.info('Processing checkout.session.pending webhook');
          await this.handleCheckoutSessionPending(event.data.object);
          break;
          
        default:
          logger.info('Unhandled event type:', event.type);
      }
      
      // Return a 200 response to acknowledge receipt of the event
      res.status(200).json({ received: true });
      
    } catch (error) {
      logger.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  /**
   * Handle successful checkout session (booking or package)
   */
  async handleCheckoutSessionCompleted(session) {
    try {
      logger.info('Processing completed checkout session:', session.id);
      logger.info('Session details:', {
        id: session.id,
        payment_intent: session.payment_intent,
        payment_status: session.payment_status,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata
      });
      
      // CRITICAL FIX: Only process if payment is actually completed
      if (session.payment_status !== 'paid') {
        logger.info(`Session ${session.id} completed but payment not yet paid (status: ${session.payment_status}). Handling as pending.`);
        await this.handleCheckoutSessionPending(session);
        return;
      }
      
      // Xác định loại giao dịch từ metadata hoặc client_reference_id
      // Giả định: metadata.type = 'booking' | 'package', metadata.userId, metadata.packageType
      const type = session.metadata?.type || 'booking';
      
      // Use transaction to ensure data consistency
      const transaction = await sequelize.transaction();

      try {
        if (type === 'package') {
          // Thanh toán mua package
          const userId = session.metadata?.user_id;
          const packageType = session.metadata?.package_type;
          if (!userId || !packageType) {
            logger.error('Missing user_id or package_type in session metadata for package payment');
            await transaction.rollback();
            return;
          }
          const user = await User.findByPk(userId, { transaction });
          if (!user) {
            logger.error('User not found for package payment:', userId);
            await transaction.rollback();
            return;
          }
          
          // Tính toán ngày hết hạn mới
          let newExpireDate;
          const today = new Date();
          
          // Nếu người dùng đã có gói và chưa hết hạn (gia hạn sớm)
          if (user.package_expire_date && new Date(user.package_expire_date) > today) {
            // Cộng dồn thời gian vào ngày hết hạn hiện tại
            newExpireDate = new Date(user.package_expire_date);
          } else {
            // Tính từ ngày hiện tại nếu chưa có gói hoặc đã hết hạn
            newExpireDate = new Date();
          }
          
          // Thêm thời gian của gói mới
          if (packageType === 'premium') {
            // Premium: 180 days (6 months)
            newExpireDate.setDate(newExpireDate.getDate() + 180);
            var packageDuration = '6 tháng';
            var packagePrice = 180; // Giá package premium (có thể lấy từ session.amount_total)
          } else {
            // Basic: 30 days
            newExpireDate.setDate(newExpireDate.getDate() + 30);
            var packageDuration = '1 tháng';
            var packagePrice = 30; // Giá package basic (có thể lấy từ session.amount_total)
          }
          
          // ===== THÊM LOGIC MỚI: Lưu package payment vào booking table =====
          // Tạo một booking record đặc biệt cho package payment để có thể tính tổng tiền
          try {
            const packageBooking = await Booking.create({
              // Thông tin cơ bản cho package booking
              booking_date: new Date(), // Ngày mua package
              status: 'confirmed', // Package payment luôn confirmed sau khi thanh toán thành công
              total_price: session.amount_total || packagePrice, // Giá package từ Stripe session
              payment_status: 'paid', // Đã thanh toán thành công
              payment_method: 'stripe', // Phương thức thanh toán
              user_id: userId, // User mua package
              
              // Thông tin khách hàng cho package
              customer_info: {
                name: user.name || session.customer_details?.name || 'Package Customer',
                email: user.email || session.customer_details?.email || '',
                notes: `Mua gói dịch vụ ${packageType}`
              },
              
              // Metadata đặc biệt cho package
              booking_metadata: {
                packageType: packageType,
                packageName: session.metadata?.package_name || (packageType === 'premium' ? 'Gói Premium' : 'Gói Cơ Bản'),
                packageDuration: packageDuration,
                packagePrice: session.amount_total || packagePrice,
                purchaseDate: new Date().toISOString(),
                expireDate: newExpireDate.toISOString(),
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent,
                features: packageType === 'premium' 
                  ? 'Đăng được 5 sân, Analytics, Priority support'
                  : 'Đăng sân cơ bản, Quản lý booking'
              },
              
              // Các trường không liên quan để null/empty cho package
              deposit_amount: 0,
              refund_amount: 0,
              remaining_amount: 0,
              is_owner_booking: false,
              cancellation_reason: null,
              refund_method: null,
              cancelled_at: null,
              payment_due_date: null,
              notes: `Package purchase: ${packageType} - ${packageDuration}`,
              
              // QUAN TRỌNG: Đánh dấu đây là package payment
              isPackage: true // TRUE để phân biệt với booking sân thường
            }, { transaction });
            
            logger.info('Package booking record created successfully:', {
              packageBookingId: packageBooking.id,
              userId: userId,
              packageType: packageType,
              amount: session.amount_total || packagePrice,
              isPackage: true
            });
            
            // Tạo payment record cho package booking (để tracking đầy đủ)
            const Payment = require('../models/payment.model');
            await Payment.create({
              booking_id: packageBooking.id,
              user_id: userId,
              amount: session.amount_total || packagePrice,
              currency: session.currency || 'vnd',
              status: 'succeeded',
              stripe_payment_intent_id: session.payment_intent,
              stripe_session_id: session.id,
              stripe_status: 'paid',
              customer_email: user.email || session.customer_details?.email,
              customer_name: user.name || session.customer_details?.name,
              processed_at: new Date(),
              metadata: {
                type: 'package',
                packageType: packageType,
                packageDuration: packageDuration
              }
            }, { transaction });
            
            logger.info('Package payment record created successfully for booking:', packageBooking.id);
            
          } catch (packageBookingError) {
            logger.error('Error creating package booking record:', packageBookingError);
            // Không fail toàn bộ transaction vì logic cũ vẫn hoạt động
            // Chỉ log error để debug
          }
          // ===== KẾT THÚC LOGIC MỚI =====
          
          // Cập nhật thông tin package cho user (giữ nguyên logic cũ)
          await user.update({
            package_type: packageType,
            package_purchase_date: new Date(),
            package_expire_date: newExpireDate
          }, { transaction });
          logger.info('User package updated successfully:', userId);
          
          await transaction.commit();
          
          // Gửi email thông báo mua gói thành công
          try {
            const { sendPackagePurchaseSuccessEmail } = require('../utils/emailService');
            
            // Chuẩn bị thông tin gói dịch vụ cho email
            const packageDetails = {
              name: session.metadata?.package_name || (packageType === 'premium' ? 'Gói Premium' : 'Gói Cơ Bản'),
              duration: session.metadata?.package_duration || (packageType === 'premium' ? '6 tháng' : '1 tháng'),
              amount: session.amount_total, // VND không có cents, không cần chia cho 100
              features: packageType === 'premium' 
                ? 'Đăng được 5 sân, Analytics, Priority support'
                : 'Đăng sân cơ bản, Quản lý booking',
              purchaseDate: new Date().toISOString(),
              expireDate: newExpireDate.toISOString()
            };
            
            await sendPackagePurchaseSuccessEmail(user.email, user.name, packageDetails);
            logger.info('Package purchase success email sent to:', user.email);
          } catch (emailError) {
            logger.error('Failed to send package purchase success email:', emailError);
            // Don't fail the webhook if email fails
          }
        } else {
          // Handle booking payment
          // Find the booking using client_reference_id
          const booking = await Booking.findByPk(session.client_reference_id, { transaction });
          if (!booking) {
            logger.error('Booking not found for session:', session.id);
            await transaction.rollback();
            return;
          }
          
          logger.info('Found booking:', {
            id: booking.id,
            status: booking.status,
            payment_status: booking.payment_status
          });
          
          // Check if booking is already confirmed (to avoid duplicate processing)
          const wasAlreadyConfirmed = booking.status === 'confirmed' && booking.payment_status === 'paid';
          
          // Update booking status (idempotent operation)
          await booking.update({
            status: 'confirmed',
            payment_status: 'paid'
          }, { transaction });
          logger.info('Booking updated successfully to confirmed status');

          // Gửi thông báo cho user và chủ sân khi payment_status chuyển sang 'paid'
          try {
            // Lấy thông tin field, user, ownerId
            const fieldId = booking.booking_metadata?.fieldId;
            let field = null;
            if (fieldId) {
              field = await Field.findByPk(fieldId, {
                attributes: ['id', 'name', 'owner_id'],
                include: [
                  { model: User, as: 'owner', attributes: ['id', 'name'] }
                ],
                transaction
              });
            }
            const user = await User.findByPk(booking.user_id, { transaction });
            const ownerId = field?.owner_id;
            const ownerName = field?.owner?.name || '';
            const notificationService = require('../services/notification.service');
            // Lấy tên sân ưu tiên từ field, fallback booking_metadata
            const fieldName = field?.name || booking.booking_metadata?.fieldName || '';
            const notificationData = {
              bookingId: booking.id,
              fieldId: field?.id,
              fieldName: fieldName,
              amount: booking.total_price,
              paymentMethod: booking.payment_method || '',
              userId: user?.id,
              userName: user?.name,
              ownerId: ownerId,
              ownerName: ownerName,
              type: 'payment_succeeded',
              message: `Thanh toán thành công cho đơn đặt sân ${fieldName}`
            };
            // Gửi thông báo cho user
            if (notificationService?.createNotification && user?.id) {
              await notificationService.createNotification(
                user.id,
                'Thanh toán thành công',
                notificationData.message
              );
            }
            // Gửi thông báo cho chủ sân
            if (notificationService?.createNotification && ownerId) {
              const ownerNotification = await notificationService.createNotification(
                ownerId,
                'Thanh toán thành công',
                `Có đơn đặt sân tại ${fieldName} đã được thanh toán thành công.`
              );
              // Emit realtime notification for owner (field owner) giống như booking.controller.js
              try {
                const { emitNewNotification } = require('../config/socket.config');
                if (emitNewNotification) emitNewNotification([ownerId], ownerNotification);
              } catch (realtimeErr) {
                logger.error('Error emitting realtime notification to owner:', realtimeErr);
              }
            }
          } catch (notifyErr) {
            logger.error('Error sending payment succeeded notification:', notifyErr);
          }
          
          // Update payment record với thông tin đầy đủ từ session
          const updateData = {
            status: 'succeeded',
            stripe_payment_intent_id: session.payment_intent,
            stripe_session_id: session.id,
            stripe_status: 'paid',
            processed_at: new Date(),
            updated_at: new Date()
          };

          // Lấy thêm thông tin từ session metadata nếu có
          if (session.metadata) {
            if (session.metadata.customer_email && !updateData.customer_email) {
              updateData.customer_email = session.metadata.customer_email;
            }
            if (session.metadata.customer_name && !updateData.customer_name) {
              updateData.customer_name = session.metadata.customer_name;
            }
          }

          // Nếu session có customer_details, ưu tiên sử dụng
          if (session.customer_details?.email) {
            updateData.customer_email = session.customer_details.email;
          }
          if (session.customer_details?.name) {
            updateData.customer_name = session.customer_details.name;
          }

          const updateResult = await Payment.update(
            updateData,
            {
              where: { booking_id: booking.id },
              transaction
            }
          );
          
          logger.info(`Payment record updated: ${updateResult[0]} row(s) affected`);
          logger.info('✅ Payment confirmed - booking status updated to confirmed');
          
          // Time slots should already exist from atomic booking creation
          // Just update them to confirmed status if payment successful
          if (!wasAlreadyConfirmed) {
            const existingTimeSlots = await TimeSlot.findAll({
              where: {
                booking_id: booking.id
              },
              transaction
            });

            if (existingTimeSlots.length > 0) {
              // Time slots already exist, just ensure they're properly marked as unavailable
              await TimeSlot.update(
                { status: 'booked' },
                {
                  where: { booking_id: booking.id },
                  transaction
                }
              );
              logger.info(`Confirmed ${existingTimeSlots.length} existing time slots for booking:`, booking.id);
            } else {
              logger.warn('No time slots found for booking - this should not happen with atomic creation');
            }
          } else {
            logger.info('Booking was already confirmed, time slots already exist');
          }
          
          await transaction.commit();
          logger.info('Booking confirmed successfully:', booking.id);
          
          // Emit real-time updates via WebSocket using centralized service
          try {
            await RealTimeEventService.emitPaymentConfirmed(booking.id, {
              amount: session.amount_total / 100,
              totalAmount: booking.total_amount,
              userId: booking.user_id
            });
            
            logger.info('Real-time notifications sent for booking confirmation:', booking.id);
            
          } catch (socketError) {
            // Log socket errors but don't fail the webhook
            logger.error('Error sending real-time notifications (webhook still succeeded):', socketError);
          }
          
          // Send confirmation emails using centralized service
        try {
          // Get full booking details for email
          const bookingWithDetails = await this.getBookingDetails(booking.id);
          
          if (bookingWithDetails) {
            const emailResults = await BookingEmailService.sendAllBookingEmails(
              bookingWithDetails, 
              'handleCheckoutSessionCompleted'
            );
            
            logger.info('Email sending completed:', {
              bookingId: String(booking.id), // Convert to string for proper logging
              customerEmailSent: emailResults.customerEmailSent,
              ownerEmailSent: emailResults.ownerEmailSent,
              errorCount: emailResults.errors.length
            });
            
            // Log any email errors but don't fail the webhook
            if (emailResults.errors.length > 0) {
              logger.warn('Some emails failed to send:', emailResults.errors);
            }

            // Fallback: If BookingEmailService failed to send emails, try direct email sending
            if (!emailResults.customerEmailSent || !emailResults.ownerEmailSent) {
              logger.info('Attempting fallback email sending for failed emails...');
              
              try {
                // Get owner email from User table directly with safety checks
                let field = null;
                const fieldId = bookingWithDetails.field?.id || booking.booking_metadata?.fieldId;
                
                if (fieldId && fieldId !== 'error' && fieldId !== 'unknown' && validator.isUUID(fieldId)) {
                  field = await Field.findByPk(fieldId, {
                    include: [{
                      model: User,
                      as: 'owner',
                      attributes: ['id', 'name', 'email']
                    }]
                  });
                } else {
                  logger.warn('Invalid fieldId for fallback email, skipping field lookup');
                }

                const ownerEmail = field?.owner?.email;
                const customerEmail = booking.customer_info?.email;

                // Send customer email if it failed
                if (!emailResults.customerEmailSent && customerEmail) {
                  try {
                    const customerName = booking.customer_info?.name || 'Khách hàng';
                    const transformedData = this.transformBookingDataForEmail(bookingWithDetails);
                    await emailService.sendBookingConfirmationEmail(customerEmail, customerName, transformedData);
                    logger.info('Fallback customer email sent successfully');
                  } catch (customerEmailError) {
                    logger.error('Fallback customer email failed:', customerEmailError.message);
                  }
                }

                // Send owner email if it failed
                if (!emailResults.ownerEmailSent && ownerEmail) {
                  try {
                    const ownerName = field?.owner?.name || 'Chủ sân';
                    const transformedData = this.transformBookingDataForEmail(bookingWithDetails);
                    await emailService.sendOwnerBookingNotificationEmail(ownerEmail, ownerName, transformedData);
                    logger.info('Fallback owner email sent successfully');
                  } catch (ownerEmailError) {
                    logger.error('Fallback owner email failed:', ownerEmailError.message);
                  }
                }

              } catch (fallbackError) {
                logger.error('Fallback email process failed:', fallbackError.message);
              }
            }
          } else {
            logger.warn('Could not fetch booking details for email sending');
          }
          
        } catch (emailError) {
          // Log email errors but don't fail the webhook
          logger.error('Error sending confirmation emails (webhook still succeeded):', emailError);
          
          // Ultimate fallback: Try to send basic emails directly
          try {
            logger.info('Attempting ultimate fallback email sending...');
            
            const customerEmail = booking.customer_info?.email;
            const metadata = booking.booking_metadata || {};
            
            // Try to get owner email
            let ownerEmail = null;
            if (metadata.fieldId && metadata.fieldId !== 'error' && metadata.fieldId !== 'unknown' && validator.isUUID(metadata.fieldId)) {
              try {
                const field = await Field.findByPk(metadata.fieldId, {
                  include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['email']
                  }]
                });
                ownerEmail = field?.owner?.email;
              } catch (fieldError) {
                logger.error('Error fetching field for owner email:', fieldError.message);
              }
            }

            // Prepare basic booking data for emails
            const basicBookingData = {
              id: String(booking.id),
              field: {
                name: metadata.fieldName || 'Unknown Field',
                location: {
                  address_text: metadata.fieldLocation?.address || 'Unknown Location'
                }
              },
              timeSlots: metadata.timeSlots || [],
              totalAmount: booking.total_price,
              customerInfo: booking.customer_info,
              bookingDate: metadata.playDate || booking.created_at
            };

            // Send basic customer email
            if (customerEmail) {
              try {
                const customerName = booking.customer_info?.name || 'Khách hàng';
                const transformedData = this.transformBookingDataForEmail(basicBookingData);
                await emailService.sendBookingConfirmationEmail(customerEmail, customerName, transformedData);
                logger.info('Ultimate fallback customer email sent');
              } catch (err) {
                logger.error('Ultimate fallback customer email failed:', err.message);
              }
            }

            // Send basic owner email
            if (ownerEmail) {
              try {
                const ownerName = 'Chủ sân'; // Basic fallback name
                const transformedData = this.transformBookingDataForEmail(basicBookingData);
                await emailService.sendOwnerBookingNotificationEmail(ownerEmail, ownerName, transformedData);
                logger.info('Ultimate fallback owner email sent');
              } catch (err) {
                logger.error('Ultimate fallback owner email failed:', err.message);
              }
            }

          } catch (ultimateFallbackError) {
            logger.error('Ultimate fallback email failed:', ultimateFallbackError.message);
          }
        }
        }
        
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
    } catch (error) {
      logger.error('Error handling checkout session completed:', error);
      throw error;
    }
  }

  /**
   * Handle expired checkout session
   */
  async handleCheckoutSessionExpired(session) {
    try {
      logger.info('Processing expired checkout session:', session.id);
      
      // Xác định loại giao dịch từ metadata
      const type = session.metadata?.type || 'booking';
      
      // Use transaction to ensure data consistency
      const transaction = await sequelize.transaction();
      
      try {
        if (type === 'package') {
          // Xử lý package payment thất bại
          const userId = session.metadata?.user_id;
          const packageType = session.metadata?.package_type;
          
          if (userId && packageType) {
            const user = await User.findByPk(userId, { transaction });
            if (user) {
              // Gửi email thông báo thanh toán package thất bại
              try {
                const { sendPackagePurchaseFailedEmail } = require('../utils/emailService');
                
                const packageDetails = {
                  name: session.metadata?.package_name || (packageType === 'premium' ? 'Gói Premium' : 'Gói Cơ Bản'),
                  duration: session.metadata?.package_duration || (packageType === 'premium' ? '365 ngày' : '30 ngày'),
                  amount: session.amount_total, // VND không có cents, không cần chia cho 100
                  features: packageType === 'premium' 
                    ? 'Đăng sân không giới hạn, Analytics, Priority support'
                    : 'Đăng sân cơ bản, Quản lý booking'
                };
                
                await sendPackagePurchaseFailedEmail(
                  user.email, 
                  user.name, 
                  packageDetails,
                  'Phiên thanh toán đã hết hạn. Vui lòng thử lại.'
                );
                logger.info('Package purchase failed email sent to:', user.email);
              } catch (emailError) {
                logger.error('Failed to send package purchase failed email:', emailError);
                // Don't fail the webhook if email fails
              }
            }
          }
          
          await transaction.commit();
          logger.info('Package payment expired session processed:', session.id);
          return;
        }
        
        // Handle booking payment expiry (existing logic)
        const booking = await Booking.findByPk(session.client_reference_id, { transaction });
        if (!booking) {
          logger.error('Booking not found for expired session:', session.id);
          await transaction.rollback();
          return;
        }
        
        // Update booking status to cancelled
        await booking.update({
          status: 'cancelled',
          payment_status: 'failed'
        }, { transaction });
        
        // Update payment record
        await Payment.update(
          {
            payment_status: 'failed',
            stripe_session_id: session.id,
            updated_at: new Date()
          },
          {
            where: { booking_id: booking.id },
            transaction
          }
        );
        
        // Free up the reserved time slots since payment failed
        const deletedCount = await TimeSlot.destroy({
          where: { booking_id: booking.id },
          transaction
        });
        
        if (deletedCount > 0) {
          logger.info(`Freed up ${deletedCount} reserved time slots for expired booking:`, booking.id);
        } else {
          logger.info('No time slots to free up for expired booking:', booking.id);
        }
        
        await transaction.commit();
        logger.info('Booking cancelled due to expired session:', booking.id);
        
        // Emit real-time updates via WebSocket using centralized service
        try {
          await RealTimeEventService.emitPaymentExpired(booking.id, {
            userId: booking.user_id,
            stripe_session_id: session.id
          });
          
          logger.info('Real-time notifications sent for booking cancellation:', booking.id);
          
        } catch (socketError) {
          // Log socket errors but don't fail the webhook
          logger.error('Error sending real-time notifications (webhook still succeeded):', socketError);
        }
        
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
      
    } catch (error) {
      logger.error('Error handling checkout session expired:', error);
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      logger.info('Processing successful payment intent:', paymentIntent.id);
      
      // Use PaymentService to handle the payment
      await PaymentService.handlePaymentSucceeded(paymentIntent);
      logger.info('Payment intent processed successfully via PaymentService');
      
    } catch (error) {
      logger.error('Error handling payment succeeded:', error);
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      logger.info('Processing failed payment intent:', paymentIntent.id);
      
      // Check if this is a package payment from metadata
      if (paymentIntent.metadata?.type === 'package') {
        const userId = paymentIntent.metadata?.user_id;
        const packageType = paymentIntent.metadata?.package_type;
        
        if (userId && packageType) {
          try {
            const user = await User.findByPk(userId);
            if (user) {
              // Gửi email thông báo thanh toán package thất bại
              const { sendPackagePurchaseFailedEmail } = require('../utils/emailService');
              
              const packageDetails = {
                name: paymentIntent.metadata?.package_name || (packageType === 'premium' ? 'Gói Premium' : 'Gói Cơ Bản'),
                duration: paymentIntent.metadata?.package_duration || (packageType === 'premium' ? '365 ngày' : '30 ngày'),
                amount: paymentIntent.amount, // VND không có cents, không cần chia cho 100
                features: packageType === 'premium' 
                  ? 'Đăng sân không giới hạn, Analytics, Priority support'
                  : 'Đăng sân cơ bản, Quản lý booking'
              };
              
              // Determine failure reason from payment intent
              let failureReason = 'Thanh toán không thành công';
              if (paymentIntent.last_payment_error?.message) {
                failureReason = paymentIntent.last_payment_error.message;
              } else if (paymentIntent.last_payment_error?.code) {
                switch (paymentIntent.last_payment_error.code) {
                  case 'card_declined':
                    failureReason = 'Thẻ bị từ chối. Vui lòng kiểm tra thông tin thẻ hoặc liên hệ ngân hàng.';
                    break;
                  case 'insufficient_funds':
                    failureReason = 'Tài khoản không đủ số dư. Vui lòng kiểm tra số dư tài khoản.';
                    break;
                  case 'expired_card':
                    failureReason = 'Thẻ đã hết hạn. Vui lòng sử dụng thẻ khác.';
                    break;
                  case 'incorrect_cvc':
                    failureReason = 'Mã CVC không chính xác. Vui lòng kiểm tra lại.';
                    break;
                  case 'processing_error':
                    failureReason = 'Lỗi xử lý thanh toán. Vui lòng thử lại sau.';
                    break;
                  default:
                    failureReason = `Thanh toán thất bại: ${paymentIntent.last_payment_error.code}`;
                }
              }
              
              await sendPackagePurchaseFailedEmail(user.email, user.name, packageDetails, failureReason);
              logger.info('Package purchase failed email sent to:', user.email);
            }
          } catch (emailError) {
            logger.error('Failed to send package purchase failed email:', emailError);
            // Don't fail the webhook if email fails
          }
        }
      }
      
      // Use PaymentService to handle the payment failure (existing logic for bookings)
      await PaymentService.handlePaymentFailed(paymentIntent);
      logger.info('Payment failure processed successfully via PaymentService');
      
    } catch (error) {
      logger.error('Error handling payment failed:', error);
    }
  }

  /**
   * Handle checkout session created/completed but payment pending
   */
  async handleCheckoutSessionPending(session) {
    try {
      logger.info('Processing checkout session with pending payment:', session.id);
      
      // Update payment record to show session is active but payment pending
      const updateResult = await Payment.update(
        {
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          updated_at: new Date()
        },
        {
          where: { 
            booking_id: session.client_reference_id 
          }
        }
      );
      
      logger.info(`Payment record updated with session info: ${updateResult[0]} row(s) affected`);
      
      // Emit real-time update that session is ready for payment
      const booking = await Booking.findByPk(session.client_reference_id);
      if (booking) {
        emitBookingStatusUpdate(booking.id, {
          status: 'payment_pending',
          payment_status: 'pending',
          userId: booking.user_id,
          message: 'Checkout session ready - awaiting payment completion'
        });
      }
      
    } catch (error) {
      logger.error('Error handling checkout session pending:', error);
    }
  }

  /**
   * Get payment methods (for frontend)
   */
  async getPaymentMethods(req, res) {
    try {
      const paymentMethods = [
        {
          id: 'card',
          name: 'Thẻ tín dụng/ghi nợ',
          type: 'card',
          supported_currencies: ['vnd', 'usd'],
          icon: 'credit-card'
        },
        {
          id: 'momo',
          name: 'Ví MoMo',
          type: 'wallet',
          supported_currencies: ['vnd'],
          icon: 'wallet'
        }
      ];

      return res.status(200).json(responseFormatter.success(paymentMethods, 'Payment methods retrieved successfully'));

    } catch (error) {
      logger.error('Error getting payment methods:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: error.message 
      }));
    }
  }

  /**
   * Get booking details by booking ID
   */
  async getBookingById(req, res) {
    try {
      const { bookingId } = req.params;
      
      if (!bookingId) {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Booking ID is required'
        }));
      }
      
      // Use the helper method to get booking details
      const formattedBookingData = await this.getBookingDetails(bookingId);
      
      if (!formattedBookingData) {
        return res.status(404).json(responseFormatter.error({
          code: 404,
          message: 'Booking not found'
        }));
      }
      
      // Check if there's an error in the booking data
      if (formattedBookingData.error) {
        logger.warn(`getBookingById: Booking ${bookingId} has data issues: ${formattedBookingData.error}`);
        // Still return the data but with a warning
        return res.status(200).json(responseFormatter.success({
          message: 'Booking details retrieved with some missing information',
          data: formattedBookingData,
          warning: 'Some field information could not be loaded'
        }));
      }
      
      // Return formatted data
      return res.status(200).json(responseFormatter.success({
        message: 'Booking details retrieved successfully',
        data: formattedBookingData
      }));
      
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      console.error('Error details:', error.message);
      logger.error('Error fetching booking by ID:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: 'Failed to get booking details'
      }));
    }
  }

  /**
   * Get booking details by session ID
   */
  async getBookingBySessionId(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Session ID is required'
        }));
      }
      
      logger.info(`getBookingBySessionId: Looking for session ${sessionId}`);
      
      // Find payment by session ID
      const payment = await Payment.findOne({
        where: { stripe_session_id: sessionId },
        include: [{
          model: Booking,
          as: 'booking',
          include: [
            {
              model: TimeSlot,
              as: 'timeSlots'
            }
          ]
        }]
      });
      
      if (!payment || !payment.booking) {
        logger.error(`getBookingBySessionId: Payment or booking not found for session ${sessionId}`);
        return res.status(404).json(responseFormatter.error({
          code: 404,
          message: 'Booking not found'
        }));
      }
      
      const booking = payment.booking;
      logger.info(`getBookingBySessionId: Found booking ${booking.id} with metadata:`, booking.booking_metadata);
      
      // Get field with full location and owner details
      const field = await Field.findByPk(booking.booking_metadata.fieldId, {
        include: [
          {
            model: Location,
            as: 'location',
            attributes: ['address_text', 'city', 'district', 'ward']
          },
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'phone']
          },
          {
            model: SubField,
            as: 'subfields',
            attributes: ['id', 'name', 'field_type']
          }
        ]
      });
      
      // Fallback to metadata if field not found or incomplete
      const metadata = booking.booking_metadata || {};
      
      const bookingDetails = {
        id: booking.id,
        bookingDate: booking.booking_date,
        field: {
          id: field?.id || metadata.fieldId || booking.booking_metadata.fieldId,
          name: field?.name || metadata.fieldName || 'Unknown Field',
          description: field?.description || metadata.fieldDescription || '',
          price_per_hour: field?.price_per_hour || 0,
          images1: field?.images1 || metadata.fieldImages || '',
          location: {
            address_text: field?.location?.address_text || metadata.fieldLocation?.address || '',
            city: field?.location?.city || metadata.fieldLocation?.city || '',
            district: field?.location?.district || metadata.fieldLocation?.district || '',
            ward: field?.location?.ward || metadata.fieldLocation?.ward || ''
          },
          owner: {
            id: field?.owner?.id || '',
            name: field?.owner?.name || ''
          },
          subfields: field?.subfields?.map(subfield => ({
            id: subfield.id,
            name: subfield.name,
            field_type: subfield.field_type
          })) || metadata.subFields || []
        },
        timeSlots: booking.timeSlots?.map(slot => ({
          startTime: slot.start_time,
          endTime: slot.end_time,
          sub_field_id: slot.sub_field_id
        })) || [],
        totalAmount: booking.total_price,
        currency: payment.currency || 'vnd',
        status: booking.status,
        paymentStatus: booking.payment_status,
        customerInfo: booking.customer_info,
        createdAt: booking.created_at
      };
      
      return res.status(200).json(responseFormatter.success({
        message: 'Booking details retrieved successfully',
        data: bookingDetails
      }));
      
    } catch (error) {
      logger.error('Error getting booking by session ID:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: 'Failed to get booking details'
      }));
    }
  }

  /**
   * Create refund
   */
  async createRefund(req, res) {
    try {
      const { payment_id } = req.params;
      const { amount, reason } = req.body;
      
      if (!payment_id) {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Payment ID is required'
        }));
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Valid refund amount is required'
        }));
      }
      
      // Find payment record
      const payment = await Payment.findByPk(payment_id, {
        include: [{ model: Booking, as: 'booking' }]
      });
      
      if (!payment) {
        return res.status(404).json(responseFormatter.error({
          code: 404,
          message: 'Payment not found'
        }));
      }
      
      if (payment.status !== 'succeeded') {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Can only refund successful payments'
        }));
      }
      
      // Use PaymentService to create refund
      const refundResult = await PaymentService.createRefund(payment_id, amount, reason);
      
      return res.status(200).json(responseFormatter.success({
        message: 'Refund created successfully',
        data: refundResult
      }));
      
    } catch (error) {
      logger.error('Error creating refund:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: error.message || 'Failed to create refund'
      }));
    }
  }

  /**
   * Clean up expired pending bookings (temporary bookings older than 1 hour without payment)
   */
  async cleanupExpiredBookings() {
    try {
      logger.info('Starting cleanup of expired pending bookings');
      
      const transaction = await sequelize.transaction();
      
      try {
        // Find pending bookings older than 10 minutes
        const expiredBookings = await Booking.findAll({
          where: {
            status: 'pending',
            payment_status: 'pending',
            booking_date: {
              [Op.lt]: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
            }
          },
          transaction
        });

        if (expiredBookings.length === 0) {
          await transaction.commit();
          logger.info('No expired bookings found');
          return;
        }

        // Update expired bookings to cancelled
        const bookingIds = expiredBookings.map(booking => booking.id);
        
        await Booking.update(
          {
            status: 'cancelled',
            payment_status: 'expired'
          },
          {
            where: { id: { [Op.in]: bookingIds } },
            transaction
          }
        );

        // Update associated payments
        await Payment.update(
          {
            payment_status: 'expired'
          },
          {
            where: { booking_id: { [Op.in]: bookingIds } },
            transaction
          }
        );

        // Clean up any time slots (shouldn't exist with new logic, but clean up anyway)
        const deletedSlots = await TimeSlot.destroy({
          where: { booking_id: { [Op.in]: bookingIds } },
          transaction
        });

        await transaction.commit();
        
        logger.info(`Cleaned up ${expiredBookings.length} expired bookings and ${deletedSlots} time slots`);
        
      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
      
    } catch (error) {
      logger.error('Error cleaning up expired bookings:', error);
    }
  }

  // Check and sync payment status from Stripe for a specific booking
  async syncPaymentStatus(req, res) {
    try {
      const { bookingId } = req.params;
      
      logger.info(`Syncing payment status for booking: ${bookingId}`);
      
      // Get booking with payment info
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: Payment,
            as: 'payment' // Use consistent alias 'payment' instead of 'Payment'
          }
        ]
      });
      
      if (!booking) {
        return res.status(404).json(responseFormatter.error({ 
          code: 404, 
          message: 'Booking not found' 
        }));
      }
      
      // If booking is already confirmed, no need to sync
      if (booking.status === 'confirmed') {
        // Get booking details without field association
        const bookingDetails = await Booking.findByPk(bookingId, {
          include: [
            {
              model: TimeSlot,
              as: 'timeSlots'
            },
            {
              model: Payment,
              as: 'payment'
            }
          ]
        });
        
        // Get field data separately using metadata
        const fieldId = bookingDetails.booking_metadata?.fieldId;
        let fieldName = 'Unknown Field';
        if (fieldId) {
          const field = await Field.findByPk(fieldId, {
            attributes: ['name']
          });
          fieldName = field?.name || 'Unknown Field';
        }
        
        return res.json(responseFormatter.success({
          message: 'Booking already confirmed',
          booking: {
            id: bookingDetails.id,
            fieldName: fieldName,
            bookingDate: bookingDetails.booking_date,
            timeSlots: bookingDetails.timeslots?.map(slot => ({
              id: slot.id,
              startTime: slot.start_time,
              endTime: slot.end_time,
              subFieldName: slot.sub_field_name
            })) || [],
            totalAmount: bookingDetails.total_price,
            currency: bookingDetails.payment?.currency || 'vnd',
            status: bookingDetails.status,
            paymentStatus: bookingDetails.payment_status,
            customerInfo: bookingDetails.customer_info,
            createdAt: bookingDetails.created_at
          }
        }));
      }
      
      // If there's a payment record, check its status with Stripe
      if (booking.payment) {
        let paymentSucceeded = false;
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Check payment intent if available
        const stripePaymentIntentId = booking.payment.stripe_payment_intent_id;
        if (stripePaymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
            logger.info(`Retrieved payment intent from Stripe: ${paymentIntent.id}, status: ${paymentIntent.status}`);
            
            if (paymentIntent.status === 'succeeded') {
              paymentSucceeded = true;
            }
          } catch (stripeError) {
            logger.error('Error retrieving payment intent from Stripe:', stripeError);
          }
        }
        
        // If payment intent check didn't confirm success, try checking the session
        const stripeSessionId = booking.payment.stripe_session_id;
        if (!paymentSucceeded && stripeSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
            logger.info(`Retrieved checkout session from Stripe: ${session.id}, status: ${session.payment_status}`);
            
            if (session.payment_status === 'paid') {
              paymentSucceeded = true;
            }
          } catch (stripeError) {
            logger.error('Error retrieving session from Stripe:', stripeError);
          }
        }
        
        // If payment was successful but booking status is still payment_pending, update it
        if (paymentSucceeded && (booking.status === 'payment_pending' || booking.payment_status === 'pending')) {
          logger.info(`Payment succeeded but booking status not updated, fixing...`);
          
          const transaction = await sequelize.transaction();
          
          try {
            // Update booking status
            await booking.update({
              status: 'confirmed',
              payment_status: 'paid'
            }, { transaction });
            
            // Update payment record
            await booking.payment.update({
              status: 'succeeded', // Fixed: Use 'status' not 'payment_status'
              processed_at: new Date()
            }, { transaction });
            
            // Create time slots if they don't exist yet
            const { timeSlots, playDate } = booking.booking_metadata;
            
            if (timeSlots && timeSlots.length > 0) {
              const timeSlotPromises = timeSlots.map(async (timeSlot) => {
                // Check if slot already exists
                const existingSlot = await TimeSlot.findOne({
                  where: {
                    sub_field_id: timeSlot.sub_field_id,
                    date: playDate,
                    start_time: timeSlot.start_time,
                    booking_id: booking.id
                  },
                  transaction
                });

                if (!existingSlot) {
                  return await TimeSlot.create({
                    start_time: timeSlot.start_time,
                    end_time: timeSlot.end_time,
                    date: playDate,
                    sub_field_id: timeSlot.sub_field_id,
                    booking_id: booking.id,
                    status: 'booked'
                  }, { transaction });
                }
                return null;
              });

              await Promise.all(timeSlotPromises);
              logger.info(`Created/verified ${timeSlots.length} time slots for synced booking:`, booking.id);
            }
            
            await transaction.commit();
            logger.info(`Successfully synced booking ${bookingId} to confirmed status`);
            
            // Send confirmation emails after successful sync
            try {
              // Get booking details with full data for email
              const bookingWithDetails = await Booking.findByPk(booking.id, {
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                  },
                  {
                    model: TimeSlot,
                    as: 'timeSlots',
                    attributes: ['id', 'start_time', 'end_time', 'date', 'sub_field_id'],
                    include: [
                      {
                        model: SubField,
                        as: 'subfield',
                        attributes: ['id', 'name', 'field_id'],
                        include: [
                          {
                            model: Field,
                            as: 'field',
                            attributes: ['id', 'name', 'owner_id'],
                            include: [
                              {
                                model: User,
                                as: 'owner',
                                attributes: ['id', 'name', 'email']
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              });

              if (bookingWithDetails && bookingWithDetails.user && bookingWithDetails.timeSlots && bookingWithDetails.timeSlots.length > 0) {
                const firstTimeSlot = bookingWithDetails.timeSlots[0];
                const field = firstTimeSlot.subfield?.field;
                
                if (field) {
                  // Prepare booking details for email
                  const timeSlots = bookingWithDetails.timeSlots || [];
                  let startTime = '';
                  let endTime = '';
                  
                  // Create time ranges from start_time and end_time
                  const formatTime = (timeStr) => {
                    if (!timeStr) return '';
                    // timeStr is in format "HH:MM:SS", we want "HH:MM"
                    return timeStr.substring(0, 5);
                  };
                  
                  // Try to get time from TimeSlots first
                  if (timeSlots.length > 0) {
                    const firstSlot = timeSlots[0];
                    const lastSlot = timeSlots[timeSlots.length - 1];
                    startTime = firstSlot ? formatTime(firstSlot.start_time) : '';
                    endTime = lastSlot ? formatTime(lastSlot.end_time) : '';
                  }
                  
                  // Fallback to booking metadata if TimeSlots don't have proper data
                  if (!startTime || !endTime) {
                    const metadataTimeSlots = bookingWithDetails.booking_metadata?.timeSlots || [];
                    if (metadataTimeSlots.length > 0) {
                      const firstMetaSlot = metadataTimeSlots[0];
                      const lastMetaSlot = metadataTimeSlots[metadataTimeSlots.length - 1];
                      startTime = firstMetaSlot?.start_time || startTime;
                      endTime = lastMetaSlot?.end_time || endTime;
                    }
                  }
                  
                  const bookingDetails = {
                    fieldName: field.name,
                    customerName: bookingWithDetails.customer_info?.name || bookingWithDetails.user.name,
                    customerEmail: bookingWithDetails.customer_info?.email || bookingWithDetails.user.email,
                    customerPhone: bookingWithDetails.customer_info?.phone || 'Không có thông tin',
                    date: new Date(bookingWithDetails.booking_date).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }),
                    startTime: startTime,
                    endTime: endTime,
                    timeRange: `${startTime} - ${endTime}`,
                    totalAmount: bookingWithDetails.total_price,
                    bookingId: bookingWithDetails.id
                  };

                  // Send confirmation email to customer
                  if (bookingDetails.customerEmail) {
                    try {
                      logger.info('Sending confirmation email after sync with details:', {
                        customerEmail: bookingDetails.customerEmail,
                        timeRange: bookingDetails.timeRange,
                        startTime: startTime,
                        endTime: endTime,
                        source: 'syncPaymentStatus'
                      });
                      
                      await emailService.sendBookingConfirmationEmail(
                        bookingDetails.customerEmail,
                        bookingDetails.customerName,
                        bookingDetails
                      );
                      logEmailOperation('send', bookingDetails.customerEmail, 'booking_confirmation', true);
                      logger.info('Confirmation email sent to customer after sync:', bookingDetails.customerEmail);
                    } catch (emailError) {
                      logEmailOperation('send', bookingDetails.customerEmail, 'booking_confirmation', false, emailError);
                      logger.error('Failed to send confirmation email to customer after sync:', emailError);
                    }
                  }

                  // Send notification email to field owner
                  if (field.owner && field.owner.email) {
                    try {
                      await emailService.sendOwnerBookingNotificationEmail(
                        field.owner.email,
                        field.owner.name,
                        bookingDetails
                      );
                      logEmailOperation('send', field.owner.email, 'owner_notification', true);
                      logger.info('Notification email sent to field owner after sync:', field.owner.email);
                    } catch (emailError) {
                      logEmailOperation('send', field.owner.email, 'owner_notification', false, emailError);
                      logger.error('Failed to send notification email to field owner after sync:', emailError);
                    }
                  }
                }
              }
            } catch (emailError) {
              // Log email errors but don't fail the sync
              logger.error('Error sending confirmation emails after sync (sync still succeeded):', emailError);
            }
            
            // Get full booking details for the response (outside transaction)
            const updatedBooking = await Booking.findByPk(bookingId, {
              include: [
                {
                  model: TimeSlot,
                  as: 'timeSlots'
                },
                {
                  model: Payment,
                  as: 'payment'
                }
              ]
            });
            
            // Get field data separately
            const fieldId = updatedBooking.booking_metadata?.fieldId;
            let fieldName = 'Unknown Field';
            if (fieldId) {
              const field = await Field.findByPk(fieldId, {
                attributes: ['name']
              });
              fieldName = field?.name || 'Unknown Field';
            }
            
            return res.json(responseFormatter.success({
              message: 'Payment status synced successfully',
              booking: {
                id: updatedBooking.id,
                fieldName: fieldName,
                bookingDate: updatedBooking.booking_date,
                timeSlots: updatedBooking.timeslots?.map(slot => ({
                  id: slot.id,
                  startTime: slot.start_time,
                  endTime: slot.end_time,
                  subFieldName: slot.sub_field_name
                })) || [],
                totalAmount: updatedBooking.total_price,
                currency: updatedBooking.payment?.currency || 'vnd',
                status: updatedBooking.status,
                paymentStatus: updatedBooking.payment_status,
                customerInfo: updatedBooking.customer_info,
                createdAt: updatedBooking.created_at
              }
            }));
            
          } catch (transactionError) {
            // Only rollback if transaction is still active
            if (!transaction.finished) {
              await transaction.rollback();
            }
            logger.error('Transaction error during payment sync:', transactionError);
            throw transactionError;
          }
        }
        
        // Payment successful but booking is not in payment_pending state
        else if (paymentSucceeded) {
          logger.info(`Payment verified as successful, but booking status is already: ${booking.status}`);
          const bookingDetails = await Booking.findByPk(bookingId, {
            include: [
              {
                model: TimeSlot,
                as: 'timeSlots'
              },
              {
                model: Payment,
                as: 'payment'
              }
            ]
          });
          
          // Get field data separately
          const fieldId = bookingDetails.booking_metadata?.fieldId;
          let fieldName = 'Unknown Field';
          if (fieldId) {
            const field = await Field.findByPk(fieldId, {
              attributes: ['name']
            });
            fieldName = field?.name || 'Unknown Field';
          }
          
          return res.json(responseFormatter.success({
            message: 'Payment already verified',
            booking: {
              id: bookingDetails.id,
              fieldName: fieldName,
              bookingDate: bookingDetails.booking_date,
              timeSlots: bookingDetails.timeslots?.map(slot => ({
                id: slot.id,
                startTime: slot.start_time,
                endTime: slot.end_time,
                subFieldName: slot.sub_field_name
              })) || [],
              totalAmount: bookingDetails.total_price,
              currency: bookingDetails.payment?.currency || 'vnd',
              status: bookingDetails.status,
              paymentStatus: bookingDetails.payment_status,
              customerInfo: bookingDetails.customer_info,
              createdAt: bookingDetails.created_at
            }
          }));
        }
      }
      
      // If we reach here, no sync was needed or possible
      const fullBookingDetails = await Booking.findByPk(bookingId, {
        include: [
          {
            model: TimeSlot,
            as: 'timeSlots'
          },
          {
            model: Payment,
            as: 'payment'
          }
        ]
      });
      
      // Get field data separately
      const fieldId = fullBookingDetails.booking_metadata?.fieldId;
      let fieldName = 'Unknown Field';
      if (fieldId) {
        const field = await Field.findByPk(fieldId, {
          attributes: ['name']
        });
        fieldName = field?.name || 'Unknown Field';
      }
      
      return res.json(responseFormatter.success({
        message: 'No payment status changes needed',
        booking: {
          id: fullBookingDetails.id,
          fieldName: fieldName,
          bookingDate: fullBookingDetails.booking_date,
          timeSlots: fullBookingDetails.timeslots?.map(slot => ({
            id: slot.id,
            startTime: slot.start_time,
            endTime: slot.end_time,
            subFieldName: slot.sub_field_name
          })) || [],
          totalAmount: fullBookingDetails.total_price,
          currency: fullBookingDetails.payment?.currency || 'vnd',
          status: fullBookingDetails.status,
          paymentStatus: fullBookingDetails.payment_status,
          customerInfo: fullBookingDetails.customer_info,
          createdAt: fullBookingDetails.created_at
        }
      }));
      
    } catch (error) {
      logger.error('Error syncing payment status:', error);
      return res.status(500).json(responseFormatter.error({ 
        code: 500, 
        message: 'Error syncing payment status' 
      }));
    }
  }

  /**
   * Continue payment for an existing booking
   */
  async continuePaymentForBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const { return_url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking/confirmation`, cancel_url } = req.body;
      
      logger.info(`Continuing payment for booking: ${bookingId}`);
      
      // Check if booking exists with proper nested includes
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: TimeSlot,
            as: 'timeSlots',
            include: [
              {
                model: SubField,
                as: 'subfield',
                include: [
                  {
                    model: Field,
                    as: 'field',
                    include: [
                      {
                        model: Location,
                        as: 'location'
                      }
                    ]
                  }
                ]
              }
            ]
          },
          { 
            model: Payment, 
            as: 'payment' 
          }
        ]
      });
      
      if (!booking) {
        logger.error(`Booking not found: ${bookingId}`);
        return res.status(404).json(responseFormatter.error({
          code: 404,
          message: 'Booking not found'
        }));
      }
      
      // Check if booking status allows payment
      if (booking.status === 'cancelled') {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Booking has been cancelled'
        }));
      }
      
      if (booking.payment_status === 'paid') {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Booking has already been paid'
        }));
      }
      
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Get field information from nested relationship or fallback to metadata
      const firstTimeSlot = booking.timeSlots?.[0];
      let field = firstTimeSlot?.subfield?.field;
      
      // Fallback to metadata if relationship is missing (e.g., for cancelled bookings)
      if (!field && booking.booking_metadata?.fieldId) {
        console.log('Field relationship missing, using metadata fallback for booking:', bookingId);
        try {
          field = await Field.findByPk(booking.booking_metadata.fieldId, {
            include: [
              {
                model: Location,
                as: 'location'
              }
            ]
          });
        } catch (metadataError) {
          console.error('Error fetching field from metadata:', metadataError);
        }
      }
      
      if (!field) {
        logger.error('Field information not found for booking:', bookingId);
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Field information not found'
        }));
      }

      // Create a new Checkout Session với đầy đủ thông tin customer
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: booking.customer_info?.email || '', // Thêm customer email
        line_items: [
          {
            price_data: {
              currency: 'vnd',
              product_data: {
                name: `Đặt sân ${field.name}`,
                description: `Ngày ${booking.booking_date}`,
                metadata: {
                  booking_id: booking.id,
                  field_name: field.name,
                  booking_date: booking.booking_date
                }
              },
              unit_amount: Math.round(booking.total_price) // VND doesn't have cents, use actual amount
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          booking_id: booking.id,
          user_id: booking.user_id || 'guest',
          customer_email: booking.customer_info?.email || '',
          customer_name: booking.customer_info?.name || '',
          field_name: field.name,
          booking_date: booking.booking_date
        },
        success_url: `${new URL(return_url).origin}/booking-history?payment=success&booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking-history?payment=cancel`,
        client_reference_id: booking.id
      });
      
      // Update payment record with new session
      if (booking.payment) {
        await booking.payment.update({
          stripe_session_id: session.id,
          updated_at: new Date()
        });
      } else {
        // Create new payment record if one doesn't exist
        await Payment.create({
          booking_id: booking.id,
          status: 'pending',
          amount: booking.total_price,
          currency: 'vnd',
          customer_email: booking.customer_info?.email || '',
          customer_name: booking.customer_info?.name || '',
          stripe_session_id: session.id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      return res.status(200).json(responseFormatter.success({
        message: 'Payment session created successfully',
        data: {
          booking_id: booking.id,
          checkout_url: session.url,
          session_id: session.id,
          payment_id: booking.payment?.id || null,
          amount: booking.total_price,
          currency: 'vnd'
        }
      }));
      
    } catch (error) {
      logger.error('Error continuing payment:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: 'Failed to create payment session'
      }));
    }
  }

  /**
   * Helper method to get full booking details
   * @private
   */
  async getBookingDetails(bookingId) {
    try {
      // Find the booking with its related data
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: TimeSlot,
            as: 'timeSlots',
            include: [
              {
                model: SubField,
                as: 'subfield',
                include: [
                  {
                    model: Field,
                    as: 'field',
                    include: [
                      {
                        model: Location,
                        as: 'location',
                        attributes: ['id', 'address_text', 'formatted_address', 'city', 'district', 'ward', 'country']
                      },
                      {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'name', 'phone', 'email']
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            model: Payment,
            as: 'payment'
          }
        ]
      });
      
      if (!booking) {
        logger.error(`getBookingDetails: No booking found with ID ${bookingId}`);
        return null;
      }
      
      logger.info(`getBookingDetails: Found booking ${bookingId} with payment status: ${booking.payment_status}`);
      
      // Try to get field data from multiple sources
      let field = null;
      let fieldId = null;
      
      // First, try to get field from timeSlots relationship
      if (booking.timeSlots && booking.timeSlots.length > 0) {
        const firstTimeSlot = booking.timeSlots[0];
        if (firstTimeSlot.subfield && firstTimeSlot.subfield.field) {
          fieldId = firstTimeSlot.subfield.field.id;
          logger.info(`getBookingDetails: Found fieldId via timeSlots relationship: ${fieldId}`);
          
          // Load field with subfields
          field = await Field.findByPk(fieldId, {
            include: [
              {
                model: Location,
                as: 'location',
                attributes: ['id', 'address_text', 'formatted_address', 'city', 'district', 'ward', 'country']
              },
              {
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'phone', 'email']
              },
              {
                model: SubField,
                as: 'subfields',
                attributes: ['id', 'name', 'field_type']
              }
            ],
            attributes: [
              'id',
              'name',
              'description',
              'price_per_hour',
              'images1',
              'images2',
              'images3',
              'is_verified',
              'created_at'
            ]
          });
        }
      }
      
      // If field not found via relationship, try metadata
      if (!field && booking.booking_metadata && booking.booking_metadata.fieldId) {
        fieldId = booking.booking_metadata.fieldId;
        logger.info(`getBookingDetails: Trying to find field via metadata: ${fieldId}`);
        
        field = await Field.findByPk(fieldId, {
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'address_text', 'formatted_address', 'city', 'district', 'ward', 'country']
            },
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'phone', 'email']
            },
            {
              model: SubField,
              as: 'subfields',
              attributes: ['id', 'name', 'field_type']
            }
          ],
          attributes: [
            'id',
            'name',
            'description',
            'price_per_hour',
            'images1',
            'images2',
            'images3',
            'is_verified',
            'created_at'
          ]
        });
      }
      
      // Create fallback field data if still not found
      if (!field) {
        logger.warn(`getBookingDetails: No field found for booking ${bookingId}, creating fallback with metadata`);
        
        // Try to use metadata as fallback
        const metadata = booking.booking_metadata || {};
        field = {
          id: null, // Use null instead of invalid UUID
          name: metadata.fieldName || 'Sân bóng không xác định',
          description: metadata.fieldDescription || '',
          price_per_hour: 0,
          images1: metadata.fieldImages || '',
          location: metadata.fieldLocation ? {
            address_text: metadata.fieldLocation.address || '',
            formatted_address: metadata.fieldLocation.formatted_address || metadata.fieldLocation.address || '',
            city: metadata.fieldLocation.city || '',
            district: metadata.fieldLocation.district || '',
            ward: metadata.fieldLocation.ward || '',
            country: metadata.fieldLocation.country || ''
          } : {
            address_text: '',
            formatted_address: '',
            city: '',
            district: '',
            ward: '',
            country: ''
          },
          owner: {
            id: null,
            name: '',
            email: ''
          },
          subfields: metadata.subFields || []
        };
      }

      // Format booking data for response - ensure consistent property names
      return {
        id: booking.id,
        bookingDate: booking.booking_metadata?.playDate || booking.booking_date,
        field: {
          id: field.id,
          name: field.name,
          description: field.description || '',
          price_per_hour: field.price_per_hour || 0,
          images1: field.images1 || '',
          location: {
            address_text: field.location?.address_text || '',
            formatted_address: field.location?.formatted_address || '',
            city: field.location?.city || '',
            district: field.location?.district || '',
            ward: field.location?.ward || '',
            country: field.location?.country || ''
          },
          owner: {
            id: field.owner?.id || '',
            name: field.owner?.name || '',
            email: field.owner?.email || ''
          },
          subfields: field.subfields?.map(subfield => ({
            id: subfield.id,
            name: subfield.name,
            field_type: subfield.field_type
          })) || []
        },
        timeSlots: booking.timeSlots?.map(slot => ({
          startTime: slot.start_time,
          endTime: slot.end_time,
          start_time: slot.start_time, // Keep both formats for compatibility
          end_time: slot.end_time,
          sub_field_id: slot.sub_field_id,
          subfieldId: slot.sub_field_id,
          subfield: slot.subfield ? {
            id: slot.subfield.id,
            name: slot.subfield.name,
            field_type: slot.subfield.field_type,
            fieldType: slot.subfield.field_type
          } : null,
          date: booking.booking_metadata?.playDate || booking.booking_date
        })) || [],
        totalAmount: booking.total_price,
        currency: booking.payment?.currency || 'vnd',
        status: booking.status,
        paymentStatus: booking.payment_status,
        customerInfo: booking.customer_info,
        createdAt: booking.created_at
      };
    } catch (error) {
      logger.error(`Error in getBookingDetails for booking ${bookingId}:`, error);
      
      // Return a basic structure with error info instead of null
      return {
        id: bookingId,
        bookingDate: new Date().toISOString(),
        field: {
          id: null, // Use null instead of 'error' to avoid UUID issues
          name: 'Lỗi tải thông tin sân',
          description: 'Không thể tải thông tin chi tiết sân bóng',
          price_per_hour: 0,
          images1: '',
          location: {
            address_text: 'Không có thông tin',
            city: '',
            district: '',
            ward: ''
          },
          owner: {
            id: null,
            name: '',
            email: ''
          },
          subfields: []
        },
        timeSlots: [],
        totalAmount: 0,
        currency: 'vnd',
        status: 'error',
        paymentStatus: 'unknown',
        customerInfo: {},
        createdAt: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Create payment intent for package purchase
   */
  async createPackagePayment(req, res) {
    logger.info('createPackagePayment method called');
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(responseFormatter.error({
          code: 'UNAUTHORIZED',
         
          message: 'Bạn cần đăng nhập để mua gói dịch vụ'
       
        }));
      }
      const { packageType, return_url, cancel_url } = req.body;
      if (!packageType || !['basic', 'premium'].includes(packageType)) {
        return res.status(400).json(responseFormatter.error({
          code: 400,
          message: 'Loại gói dịch vụ không hợp lệ'
        }));
      }
      // Lấy giá từ config (tránh user tự gửi giá)
      const SERVICE_PLANS = {
        basic: 599000,
        premium: 3099000
      };
      
      // Package information for better dashboard management
      const PACKAGE_INFO = {
        basic: {
          name: 'Gói Cơ Bản',
          features: 'Đăng sân cơ bản, Quản lý booking',
          duration: '1 tháng'
        },
        premium: {
          name: 'Gói Premium',
          features: 'Đăng 5 sân, Analytics, Priority support',
          duration: '6 tháng'
        }
      };

      const amount = SERVICE_PLANS[packageType];
      const packageDetails = PACKAGE_INFO[packageType];
      
      // Get user information for enhanced description
      const user = await User.findByPk(userId, {
        attributes: ['name', 'email', 'phone']
      });
      
      if (!user) {
        return res.status(404).json(responseFormatter.error({
          code: 404,
          message: 'User not found'
        }));
      }

      // Format current date
      const currentDate = new Date().toLocaleDateString('vi-VN', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // Create enhanced description for package purchase
      const packageDescription = [
        `💼 Mua gói dịch vụ`,
        `📦 ${packageDetails.name}`,
        `⏱️ Thời hạn: ${packageDetails.duration}`,
        `✨ ${packageDetails.features}`,
        `� ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(amount)}`,
        `�👤 ${user.name}`,
        `📧 ${user.email}`,
        `📅 ${currentDate}`,
        `🆔 User: ${userId}`
      ].join('\n');

      // Tạo session thanh toán Stripe (hoặc VNPay...)
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'vnd',
              product_data: {
                name: `💼 PACKAGE - ${packageDetails.name} (${packageDetails.duration})`,
                description: packageDescription,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: return_url || process.env.FRONTEND_URL + '/payment/success',
        cancel_url: cancel_url || process.env.FRONTEND_URL + '/payment/cancel',
        metadata: {
          payment_type: 'service_package', // Add payment type for easy filtering
          type: 'package',
          package_type: packageType,
          package_name: packageDetails.name,
          package_duration: packageDetails.duration,
          user_id: userId,
          user_name: user.name,
          user_email: user.email,
          purchase_date: currentDate,
          // Add additional identifiers for dashboard management
          transaction_category: 'service_subscription',
          business_unit: 'package_sales',
          amount_vnd: amount
        },
        client_reference_id: userId
      });
      return res.json(responseFormatter.success({
        checkout_url: session.url,
        session_id: session.id,
        amount,
        currency: 'vnd',
        packageType
      }));
    } catch (error) {
      logger.error('Error in createPackagePayment:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: error.message
      }));
    }
  }

  // Get package status for current user
  async getPackageStatus(req, res) {
    try {
      console.log('getPackageStatus: Starting method');
      const userId = req.user.id;
      console.log('getPackageStatus: Got userId:', userId);
      
      // Simplified version to avoid model issues
      const packageStatus = {
        hasPackage: req.user.package_type !== 'none',
        packageType: req.user.package_type || 'none',
        isExpired: false,
        isExpiringSoon: false,
        daysUntilExpiry: 0,
        expireDate: req.user.package_expire_date || null,
        purchaseDate: req.user.package_purchase_date || null,
        fieldsAffected: 0
      };

      // Calculate expiry information if user has a package
      if (packageStatus.hasPackage && req.user.package_expire_date) {
        const expireDate = new Date(req.user.package_expire_date);
        const now = new Date();
        const isExpired = expireDate < now;
        const daysUntilExpiry = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = !isExpired && daysUntilExpiry <= 7;

        packageStatus.isExpired = isExpired;
        packageStatus.isExpiringSoon = isExpiringSoon;
        packageStatus.daysUntilExpiry = Math.max(0, daysUntilExpiry);
        packageStatus.expireDate = expireDate.toISOString();
      }

      if (req.user.package_purchase_date) {
        packageStatus.purchaseDate = new Date(req.user.package_purchase_date).toISOString();
      }

      console.log('getPackageStatus: About to return response:', packageStatus);
      return res.json(responseFormatter.success(packageStatus));
    } catch (error) {
      logger.error('Error in getPackageStatus:', error);
      return res.status(500).json(responseFormatter.error({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã có lỗi xảy ra khi lấy thông tin gói dịch vụ'
      }));
    }
  }

  /**
<<<<<<< Updated upstream
   * Calculate refund percentage based on cancellation time rules
   * @param {Date} bookingDate - The date/time of the booked slot
   * @param {Date} bookingCreatedAt - When the booking was created
   * @param {Date} cancellationTime - When the cancellation was requested
   * @returns {number} - Refund percentage (0-100)
   */
  calculateRefundPercentage(bookingDate, bookingCreatedAt, cancellationTime) {
    try {
      // Input validation and safeguards
      if (!bookingDate || !bookingCreatedAt || !cancellationTime) {
        logger.warn('Missing required parameters for refund calculation', { 
          bookingDate, bookingCreatedAt, cancellationTime 
        });
        return 0; // Default to no refund if parameters are missing
      }
      
      // Convert all dates to milliseconds for comparison
      const bookingTime = new Date(bookingDate).getTime();
      const creationTime = new Date(bookingCreatedAt).getTime();
      const cancelTime = new Date(cancellationTime).getTime();
      
      // Safety check for invalid dates
      if (isNaN(bookingTime) || isNaN(creationTime) || isNaN(cancelTime)) {
        logger.warn('Invalid date format in refund calculation', { 
          bookingDate, bookingCreatedAt, cancellationTime,
          parsed: { bookingTime, creationTime, cancelTime }
        });
        return 0;
      }
      
      // Immediate Cancellation: 100% if within 10 minutes of booking creation
      const tenMinutesInMs = 10 * 60 * 1000;
      if (cancelTime - creationTime <= tenMinutesInMs) {
        logger.info('Immediate cancellation within 10 minutes of booking - 100% refund');
        return 100;
      }
      
      // Calculate time difference between cancellation and scheduled booking time
      const timeUntilBooking = bookingTime - cancelTime;
      const hoursUntilBooking = timeUntilBooking / (60 * 60 * 1000);
      
      // Advance Cancellation rules
      if (hoursUntilBooking >= 48) {
        // More than 48 hours before booking
        logger.info('Cancellation more than 48 hours before booking - 100% refund');
        return 100;
      } else if (hoursUntilBooking >= 24) {
        // Between 24-48 hours before booking
        logger.info('Cancellation between 24-48 hours before booking - 75% refund');
        return 75;
      } else if (hoursUntilBooking >= 12) {
        // Between 12-24 hours before booking
        logger.info('Cancellation between 12-24 hours before booking - 50% refund');
        return 50;
      } else {
        // Less than 12 hours before booking
        logger.info('Late cancellation less than 12 hours before booking - 0% refund');
        return 0;
      }
    } catch (error) {
      logger.error('Error calculating refund percentage', { 
        error: error.message, 
        bookingDate, 
        bookingCreatedAt, 
        cancellationTime 
      });
      return 0; // Default to no refund on error
    }
  }

  /**
   * Transform booking data to format expected by emailService with enhanced field and location information
   * @private
   */
  transformBookingDataForEmail(bookingData) {
    console.log('🔄 TRANSFORM EMAIL DATA: Starting transformation');
    console.log('📊 Input booking data keys:', Object.keys(bookingData || {}));
    
    // Extract field information with fallbacks
    const field = bookingData.field || bookingData.Field || {};
    const fieldName = field.name || bookingData.fieldName || 'Sân bóng không xác định';
    
    // Extract location information with multiple fallback options
    const location = field.location || field.Location || bookingData.location || bookingData.fieldLocation || {};
    console.log('📍 Location data:', location);
    
    // Build comprehensive address
    let fieldAddress = '';
    
    // Try different address formats
    if (location.formatted_address) {
      fieldAddress = location.formatted_address;
    } else if (location.address_text) {
      fieldAddress = location.address_text;
    } else {
      // Build from components
      const addressComponents = [
        location.ward,
        location.district,
        location.city,
        location.country
      ].filter(Boolean);
      
      fieldAddress = addressComponents.length > 0 ? addressComponents.join(', ') : 'Chưa có thông tin địa chỉ';
    }
    
    console.log('🏠 Final field address:', fieldAddress);
    
    // Extract customer information
    const customerInfo = bookingData.customerInfo || bookingData.customer_info || bookingData.customer || {};
    const customerName = customerInfo.name || customerInfo.fullName || customerInfo.customerName || 'Khách hàng';
    const customerPhone = customerInfo.phone || customerInfo.phoneNumber || 'Chưa cung cấp';
    const customerEmail = customerInfo.email || 'Chưa cung cấp';
    
    // Process time slots with detailed subfield information
    const timeSlots = bookingData.timeSlots || bookingData.TimeSlots || [];
    console.log('⏰ Processing time slots:', timeSlots.length);
    
    let processedTimeSlots = [];
    let startTime = '';
    let endTime = '';
    
    if (timeSlots.length > 0) {
      // Process each time slot to include subfield information
      processedTimeSlots = timeSlots.map(slot => {
        const subfield = slot.subfield || slot.SubField || slot.subField || {};
        const subfieldName = subfield.name || `Sân ${slot.subfieldId || 'N/A'}`;
        
        return {
          startTime: slot.startTime || slot.start_time || '00:00',
          endTime: slot.endTime || slot.end_time || '00:00',
          subfield: {
            id: subfield.id || slot.subfieldId,
            name: subfieldName,
            field_type: subfield.field_type || subfield.fieldType || 'unknown'
          },
          date: slot.date || bookingData.bookingDate || bookingData.date
        };
      });
      
      // Sort time slots by start time
      processedTimeSlots.sort((a, b) => {
        const timeA = a.startTime.replace(':', '');
        const timeB = b.startTime.replace(':', '');
        return timeA.localeCompare(timeB);
      });
      
      // Get overall start and end time
      startTime = processedTimeSlots[0].startTime;
      endTime = processedTimeSlots[processedTimeSlots.length - 1].endTime;
    }
    
    console.log('📅 Processed time slots:', processedTimeSlots.length);
    
    const transformedData = {
      id: bookingData.id || bookingData.bookingId,
      fieldName: fieldName,
      fieldAddress: fieldAddress,
      address: fieldAddress, // Additional fallback field
      field: {
        name: fieldName,
        location: {
          formatted_address: fieldAddress,
          address_text: location.address_text || fieldAddress,
          ward: location.ward,
          district: location.district,
          city: location.city,
          country: location.country
        }
      },
      fieldLocation: location, // Keep original for fallback
      date: bookingData.bookingDate || bookingData.date,
      bookingDate: bookingData.bookingDate || bookingData.date,
      startTime: startTime,
      endTime: endTime,
      timeSlots: processedTimeSlots, // Enhanced time slots with subfield info
      totalAmount: bookingData.totalAmount || bookingData.total_price || 0,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail,
      customerInfo: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        ...customerInfo
      }
    };
    
    console.log('✅ TRANSFORM COMPLETE:');
    console.log('- Field name:', transformedData.fieldName);
    console.log('- Field address:', transformedData.fieldAddress);
    console.log('- Time slots:', transformedData.timeSlots.length);
    console.log('- Customer:', transformedData.customerName);
    
    return transformedData;
  }

  // ===== HELPER FUNCTIONS CHO PACKAGE BOOKINGS =====
  
  /**
   * Lấy tất cả package bookings của một user (để tính tổng tiền đã chi cho packages)
   * @param {string} userId - ID của user
   * @param {Object} options - Tùy chọn query (dateRange, packageType, etc.)
   * @returns {Array} Danh sách package bookings
   */
  async getPackageBookingsByUser(userId, options = {}) {
    try {
      const whereConditions = {
        user_id: userId,
        isPackage: true, // Chỉ lấy package bookings
        payment_status: 'paid' // Chỉ lấy các package đã thanh toán
      };
      
      // Thêm filter theo loại package nếu có
      if (options.packageType) {
        whereConditions['booking_metadata.packageType'] = options.packageType;
      }
      
      // Thêm filter theo khoảng thời gian nếu có
      if (options.startDate || options.endDate) {
        whereConditions.booking_date = {};
        if (options.startDate) {
          whereConditions.booking_date[Op.gte] = new Date(options.startDate);
        }
        if (options.endDate) {
          whereConditions.booking_date[Op.lte] = new Date(options.endDate);
        }
      }
      
      const packageBookings = await Booking.findAll({
        where: whereConditions,
        order: [['booking_date', 'DESC']],
        attributes: [
          'id', 'booking_date', 'total_price', 'payment_status', 
          'booking_metadata', 'created_at', 'isPackage'
        ]
      });
      
      logger.info(`Found ${packageBookings.length} package bookings for user ${userId}`);
      return packageBookings;
      
    } catch (error) {
      logger.error('Error getting package bookings by user:', error);
      throw error;
    }
  }

  /**
   * Tính tổng tiền user đã chi cho packages
   * @param {string} userId - ID của user
   * @param {Object} options - Tùy chọn (dateRange, packageType)
   * @returns {Object} Thông tin tổng tiền và số lượng packages
   */
  async calculatePackageSpending(userId, options = {}) {
    try {
      const packageBookings = await this.getPackageBookingsByUser(userId, options);
      
      const totalSpent = packageBookings.reduce((sum, booking) => {
        return sum + parseFloat(booking.total_price || 0);
      }, 0);
      
      const packageStats = {
        totalSpent: totalSpent,
        totalPackages: packageBookings.length,
        basicPackages: packageBookings.filter(b => 
          b.booking_metadata?.packageType === 'basic'
        ).length,
        premiumPackages: packageBookings.filter(b => 
          b.booking_metadata?.packageType === 'premium'
        ).length,
        packageHistory: packageBookings.map(booking => ({
          id: booking.id,
          purchaseDate: booking.booking_date,
          packageType: booking.booking_metadata?.packageType,
          packageName: booking.booking_metadata?.packageName,
          amount: booking.total_price,
          duration: booking.booking_metadata?.packageDuration
        }))
      };
      
      logger.info(`Package spending calculated for user ${userId}:`, {
        totalSpent: totalSpent,
        totalPackages: packageBookings.length
      });
      
      return packageStats;
      
    } catch (error) {
      logger.error('Error calculating package spending:', error);
      throw error;
    }
  }

  /**
   * API endpoint để lấy thống kê package của user
   */
  async getPackageStats(req, res) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, packageType } = req.query;
      
      if (!userId) {
        return res.status(401).json(responseFormatter.error({
          code: 'UNAUTHORIZED',
          message: 'Bạn cần đăng nhập để xem thống kê'
        }));
      }
      
      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
      if (packageType) options.packageType = packageType;
      
      const packageStats = await this.calculatePackageSpending(userId, options);
      
      return res.status(200).json(responseFormatter.success({
        message: 'Thống kê package được tải thành công',
        data: packageStats
      }));
      
    } catch (error) {
      logger.error('Error getting package stats:', error);
      return res.status(500).json(responseFormatter.error({
        code: 500,
        message: 'Lỗi khi lấy thống kê package'
      }));
    }
  }

  // ===== KẾT THÚC HELPER FUNCTIONS =====
}

module.exports = new PaymentController();
