const { Payment, Booking, User } = require('../models');
const logger = require('../utils/logger');

// Initialize Stripe lazily to avoid issues with environment variables
let stripe = null;
const getStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripe = require('stripe')(stripeKey);
  }
  return stripe;
};

class PaymentService {
  
  /**
   * Format amount to VND currency for display
   * @private
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Create Stripe Payment Intent
   */
  async createPaymentIntent(paymentData) {
    try {
      const { amount, customer_info, booking_id, metadata } = paymentData;

      // Convert amount to smallest currency unit (VND doesn't have cents)
      const amountInCents = Math.round(amount);

      // Get booking to verify it exists and get user info
      const booking = await Booking.findByPk(booking_id, {
        include: [{
          model: User,
          attributes: ['id', 'email', 'name']
        }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create or retrieve Stripe customer
      let stripeCustomer;
      try {
        // Try to find existing customer by email
        const existingCustomers = await getStripe().customers.list({
          email: customer_info.email,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomer = existingCustomers.data[0];
        } else {
          // Create new customer
          stripeCustomer = await getStripe().customers.create({
            email: customer_info.email,
            name: customer_info.name,
            metadata: {
              user_id: booking.user_id || 'guest',
              booking_id: booking_id
            }
          });
        }
      } catch (customerError) {
        logger.error('Error creating/finding Stripe customer:', customerError);
        // Continue without customer if there's an error
        stripeCustomer = null;
      }

      // Create payment intent
      const paymentIntentData = {
        amount: amountInCents,
        currency: 'vnd',
        customer: stripeCustomer?.id,
        metadata: {
          booking_id: booking_id,
          user_id: booking.user_id || 'guest',
          customer_email: customer_info.email,
          customer_name: customer_info.name,
          field_name: metadata?.fieldName || '',
          booking_date: metadata?.bookingDate || '',
          time_slots: JSON.stringify(metadata?.timeSlots || [])
        },
        description: `Đặt sân bóng - ${metadata?.fieldName || 'Sân bóng'} - ${metadata?.bookingDate || ''}`,
        receipt_email: customer_info.email,
        automatic_payment_methods: {
          enabled: true,
        },
      };

      const paymentIntent = await getStripe().paymentIntents.create(paymentIntentData);

      // Save payment record
      const payment = await Payment.create({
        booking_id: booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: 'vnd',
        status: 'pending',
        stripe_status: paymentIntent.status,
        customer_email: customer_info.email,
        customer_name: customer_info.name,
        metadata: {
          ...metadata,
          stripe_customer_id: stripeCustomer?.id
        }
      });

      logger.info(`Payment intent created: ${paymentIntent.id} for booking: ${booking_id}`);

      return {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        payment_id: payment.id,
        amount: amount,
        currency: 'vnd'
      };

    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm payment and update booking status
   */
  async confirmPayment(paymentIntentId) {
    try {
      logger.info(`Confirming payment for intent: ${paymentIntentId}`);
      
      // Retrieve payment intent from Stripe
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      logger.info(`Retrieved payment intent from Stripe: ${paymentIntent.id}, status: ${paymentIntent.status}`);
      
      // Find payment record
      const payment = await Payment.findOne({
        where: { stripe_payment_intent_id: paymentIntentId },
        include: [{ model: Booking, as: 'booking' }]
      });

      logger.info(`Payment record found: ${payment ? 'YES' : 'NO'}`);
      if (payment) {
        logger.info(`Payment ID: ${payment.id}, Booking ID: ${payment.booking_id}`);
        logger.info(`Booking association loaded: ${payment.booking ? 'YES' : 'NO'}`);
        if (payment.booking) {
          logger.info(`Booking details: ID=${payment.booking.id}, Status=${payment.booking.status}`);
        } else {
          logger.error(`Booking association is missing for payment ${payment.id}`);
        }
      } else {
        // Let's also check what payment records exist
        const allPayments = await Payment.findAll({
          attributes: ['id', 'stripe_payment_intent_id', 'booking_id', 'status'],
          limit: 10,
          order: [['created_at', 'DESC']]
        });
        logger.info(`Recent payments in database:`, allPayments.map(p => ({
          id: p.id,
          stripe_payment_intent_id: p.stripe_payment_intent_id,
          booking_id: p.booking_id,
          status: p.status
        })));
      }

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Debug payment object before update
      logger.info(`About to update payment. Payment object type: ${typeof payment}`);
      logger.info(`Payment object properties: ${Object.keys(payment || {}).join(', ')}`);
      logger.info(`Payment update method exists: ${typeof payment?.update}`);

      // Update payment status
      try {
        logger.info(`Attempting payment update with status: ${this.mapStripeStatusToLocal(paymentIntent.status)}`);
        const updateResult = await payment.update({
          status: this.mapStripeStatusToLocal(paymentIntent.status),
          stripe_status: paymentIntent.status,
          stripe_charge_id: paymentIntent.latest_charge,
          processed_at: new Date()
        });
        logger.info(`Payment update successful: ${updateResult ? 'YES' : 'NO'}`);
      } catch (updateError) {
        logger.error(`Payment update failed:`, updateError);
        throw updateError;
      }

      // Update booking status if payment succeeded
      if (paymentIntent.status === 'succeeded') {
        // Update booking directly by ID instead of relying on association
        const bookingUpdateResult = await Booking.update(
          {
            status: 'confirmed',
            payment_status: 'paid'
          },
          {
            where: { id: payment.booking_id }
          }
        );
        
        logger.info(`Booking update result: ${bookingUpdateResult[0]} row(s) affected`);
        logger.info(`Payment confirmed for booking: ${payment.booking_id}`);
      }

      return {
        status: paymentIntent.status,
        paymentId: payment.id,
        bookingId: payment.booking_id
      };

    } catch (error) {
      logger.error('Error confirming payment:', error);
      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    try {
      const { type, data } = event;
      const paymentIntent = data.object;

      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(paymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(paymentIntent);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(paymentIntent);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${type}`);
      }

    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        where: { stripe_payment_intent_id: paymentIntent.id },
        include: [{ model: Booking, as: 'booking' }]
      });

      if (!payment) {
        logger.warn(`Payment record not found for intent: ${paymentIntent.id}`);
        return;
      }

      await payment.update({
        status: 'succeeded',
        stripe_status: paymentIntent.status,
        stripe_charge_id: paymentIntent.latest_charge,
        processed_at: new Date(),
        webhook_received_at: new Date()
      });

      await payment.booking.update({
        status: 'confirmed',
        payment_status: 'paid'
      });

      logger.info(`Payment succeeded for booking: ${payment.booking_id}`);

      // Import socket functions at runtime to avoid circular dependency
      try {
        const { 
          emitBookingStatusUpdate, 
          emitBookingPaymentUpdate, 
          emitBookingEvent, 
          emitNewNotification
        } = require('../config/socket.config');
        const notificationService = require('./notification.service');

        // Emit real-time updates
        emitBookingStatusUpdate(payment.booking_id, {
          status: 'confirmed',
          payment_status: 'paid',
          userId: payment.booking.user_id,
          message: 'Payment completed successfully - Booking confirmed!'
        });
        emitBookingPaymentUpdate(payment.booking_id, {
          payment_status: 'paid',
          status: 'succeeded',
          userId: payment.booking.user_id,
          stripe_payment_intent_id: paymentIntent.id,
          message: 'Payment processed successfully via payment intent'
        });

        logger.info('Real-time notifications sent for payment success:', payment.booking_id);
      } catch (socketError) {
        logger.error('Error sending real-time notifications (payment still processed):', socketError);
      }

    } catch (error) {
      logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        where: { stripe_payment_intent_id: paymentIntent.id },
        include: [{ model: Booking, as: 'booking' }]
      });

      if (!payment) {
        logger.warn(`Payment record not found for intent: ${paymentIntent.id}`);
        return;
      }


      await payment.update({
        status: 'failed',
        stripe_status: paymentIntent.status,
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        webhook_received_at: new Date()
      });

      await payment.booking.update({
        status: 'cancelled',
        payment_status: 'failed'
      });


      logger.info(`Payment failed for booking: ${payment.booking_id}`);

    } catch (error) {
      logger.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Handle canceled payment
   */
  async handlePaymentCanceled(paymentIntent) {
    try {
      const payment = await Payment.findOne({
        where: { stripe_payment_intent_id: paymentIntent.id },
        include: [{ model: Booking, as: 'booking' }]
      });

      if (!payment) {
        logger.warn(`Payment record not found for intent: ${paymentIntent.id}`);
        return;
      }


      await payment.update({
        status: 'canceled',
        stripe_status: paymentIntent.status,
        webhook_received_at: new Date()
      });

      await payment.booking.update({
        status: 'cancelled',
        payment_status: 'failed'
      });


      logger.info(`Payment canceled for booking: ${payment.booking_id}`);

    } catch (error) {
      logger.error('Error handling payment cancellation:', error);
      throw error;
    }
  }

  /**
   * Create refund
   */
  async createRefund(paymentId, refundAmount, reason, refundPercentage = 100) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [{ model: Booking, as: 'booking' }]
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'succeeded') {
        throw new Error('Can only refund successful payments');
      }
      
      // Calculate refund amount based on percentage if not specified
      const amountToRefund = refundAmount || Math.round((payment.amount * refundPercentage) / 100);
      
      const refund = await getStripe().refunds.create({
        charge: payment.stripe_charge_id,
        amount: Math.round(amountToRefund),
        reason: 'requested_by_customer',
        metadata: {
          booking_id: payment.booking_id,
          refund_reason: reason
        }
      });

      await payment.update({
        status: 'refunded',
        refund_amount: refundAmount,
        refund_reason: reason
      });

      await payment.booking.update({
        status: 'cancelled',
        payment_status: 'refunded'
      });

      logger.info(`Refund created for payment: ${paymentId}`);

      return refund;

    } catch (error) {
      logger.error('Error creating refund:', error);
      throw new Error(`Refund creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [
          { 
            model: Booking,
            include: [{ model: User, attributes: ['id', 'name', 'email'] }]
          }
        ]
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;

    } catch (error) {
      logger.error('Error getting payment details:', error);
      throw error;
    }
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(paymentData) {
    try {
      const { 
        amount, 
        currency = 'vnd',
        customer_info, 
        booking_id, 
        field,
        booking_metadata,
        success_url,
        cancel_url
      } = paymentData;

      // Convert amount to smallest currency unit (VND doesn't have cents)
      const amountInCents = Math.round(amount);

      // Get booking to verify it exists
      const booking = await Booking.findByPk(booking_id);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create line items description with enhanced details for better dashboard management
      const fieldName = field?.fieldName || field?.name || 'Sân bóng';
      const timeSlotText = booking_metadata.timeSlots
        .map(slot => `${slot.start_time}-${slot.end_time}`)
        .join(', ');
      
      // Format date for better readability
      const formattedDate = new Date(booking_metadata.playDate).toLocaleDateString('vi-VN', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      // Create enhanced product description for Stripe dashboard
      const enhancedDescription = [
        `🏟️ Đặt sân thể thao`,
        `📅 ${formattedDate}`,
        `⏰ ${timeSlotText}`,
        `📍 ${fieldName}`,
        `� ${this.formatCurrency(amount)}`,
        `�👤 ${customer_info.name}`,
        `📧 ${customer_info.email}`,
        `🆔 Booking: ${booking_id}`
      ].join('\n');

      // Create checkout session
      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency,
            product_data: {
              name: `⚽ BOOKING - ${fieldName} (${formattedDate})`,
              description: enhancedDescription,
              images: field?.image_url ? [field.image_url] : [],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        customer_email: customer_info.email,
        client_reference_id: booking_id, // Store booking ID
        mode: 'payment',
        success_url: `${new URL(success_url).origin}/booking/confirmation?booking_id=${booking_id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
        metadata: {
          payment_type: 'field_booking', // Add payment type for easy filtering
          booking_id: booking_id,
          field_id: booking_metadata.fieldId,
          field_name: fieldName,
          booking_date: booking_metadata.playDate,
          time_slots_count: booking_metadata.timeSlots.length,
          customer_email: customer_info.email,
          customer_name: customer_info.name,
          time_slots: JSON.stringify(booking_metadata.timeSlots),
          // Add additional identifiers for dashboard management
          transaction_category: 'field_rental',
          business_unit: 'sports_booking'
        },
        locale: 'vi',
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true
        }
      });


      // Save payment record with session info
      const payment = await Payment.create({
        booking_id: booking_id,
        stripe_session_id: session.id,
        stripe_payment_intent_id: null, // Will be updated via webhook
        amount: amount,
        currency: currency,
        status: 'pending', // Fixed: Use 'status' not 'payment_status'
        stripe_status: 'pending',
        customer_email: customer_info.email,
        customer_name: customer_info.name,
        metadata: {
          session_url: session.url,
          field_name: fieldName,
          booking_date: booking_metadata.playDate,
          time_slots: booking_metadata.timeSlots
        }
      });

      logger.info(`Checkout session created: ${session.id} for booking: ${booking_id}`);

      return {
        checkout_url: session.url,
        session_id: session.id,
        payment_id: payment.id,
        amount: amount,
        currency: currency
      };

    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error(`Checkout session creation failed: ${error.message}`);
    }
  }

  /**
   * Map Stripe status to local status
   */
  mapStripeStatusToLocal(stripeStatus) {
    const statusMap = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'succeeded': 'succeeded',
      'canceled': 'canceled',
      'requires_capture': 'processing'
    };

    return statusMap[stripeStatus] || 'pending';
  }

  /**
   * Sync payment status for a booking
   */
  async syncPaymentStatus(bookingId) {
    try {
      logger.info(`Syncing payment status for booking: ${bookingId}`);

      // Get booking with payment information
      const booking = await Booking.findByPk(bookingId, {
        include: [{
          model: Payment,
          attributes: ['id', 'stripe_payment_intent_id', 'stripe_checkout_session_id', 'status', 'amount']
        }]
      });

      if (!booking) {
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      const payment = booking.Payment;
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found for booking'
        };
      }

      let stripeStatus = null;
      
      // Check Stripe payment status
      if (payment.stripe_checkout_session_id) {
        // Retrieve checkout session status from Stripe
        const session = await getStripe().checkout.sessions.retrieve(payment.stripe_checkout_session_id);
        logger.info(`Retrieved checkout session from Stripe: ${session.id}, status: ${session.payment_status}`);
        stripeStatus = session.payment_status === 'paid' ? 'succeeded' : session.payment_status;
      } else if (payment.stripe_payment_intent_id) {
        // Retrieve payment intent status from Stripe
        const paymentIntent = await getStripe().paymentIntents.retrieve(payment.stripe_payment_intent_id);
        stripeStatus = paymentIntent.status;
      }

      if (!stripeStatus) {
        return {
          success: false,
          error: 'No Stripe payment information found'
        };
      }

      const localStatus = this.mapStripeStatusToLocal(stripeStatus);

      // Update payment status if it has changed
      if (payment.status !== localStatus) {
        await payment.update({ status: localStatus });
      }

      // Update booking status based on payment status
      let newBookingStatus = booking.status;
      if (localStatus === 'succeeded' && booking.status === 'pending') {
        newBookingStatus = 'confirmed';
        await booking.update({ 
          status: 'confirmed',
          payment_status: 'paid'
        });
        
        logger.info(`Payment succeeded but booking status not updated, fixing...`);
        
        // Ensure timeslots are created/verified
        const { TimeSlot } = require('../models');
        const timeSlotsData = booking.time_slots || [];
        
        for (const slot of timeSlotsData) {
          const [timeSlot, created] = await TimeSlot.findOrCreate({
            where: {
              sub_field_id: slot.sub_field_id,
              booking_date: booking.booking_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              booking_id: booking.id
            },
            defaults: {
              sub_field_id: slot.sub_field_id,
              booking_date: booking.booking_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              booking_id: booking.id,
              status: 'booked'
            }
          });

          if (!created) {
            await timeSlot.update({ 
              status: 'booked',
              booking_id: booking.id
            });
          }
        }

        logger.info(`Created/verified ${timeSlotsData.length} time slots for synced booking: ${booking.id}`);
        logger.info(`Successfully synced booking ${bookingId} to confirmed status`);
      }

      // Refresh booking data
      await booking.reload({
        include: [{
          model: Payment,
          attributes: ['id', 'stripe_payment_intent_id', 'stripe_checkout_session_id', 'status', 'amount']
        }]
      });

      return {
        success: true,
        booking: booking,
        payment: booking.Payment,
        previousStatus: booking.status,
        newStatus: newBookingStatus
      };

    } catch (error) {
      logger.error('Error syncing payment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PaymentService();
