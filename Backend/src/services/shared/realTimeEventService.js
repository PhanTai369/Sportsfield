const { emitBookingStatusUpdate, emitBookingPaymentUpdate, emitBookingEvent } = require('../../config/socket.config');

/**
 * Centralized Real-time Event Service - Hợp nhất các logic trùng lặp cho socket events
 * Giảm duplicate code và tăng consistency cho real-time notifications
 */
class RealTimeEventService {

  /**
   * Emit booking status update - logic được duplicate nhiều nơi
   */
  static async emitBookingStatusUpdate(bookingId, statusData) {
    try {
      const eventData = {
        bookingId,
        status: statusData.status,
        message: statusData.message,
        timestamp: new Date().toISOString(),
        ...statusData
      };

      emitBookingStatusUpdate(bookingId, eventData);
      
      console.log(`[RealTime] Booking status update emitted for booking ${bookingId}:`, eventData);
      return eventData;
    } catch (error) {
      console.error('Error emitting booking status update:', error);
      throw error;
    }
  }

  /**
   * Emit booking payment update - logic duplicate trong payment flow
   */
  static async emitBookingPaymentUpdate(bookingId, paymentData) {
    try {
      const eventData = {
        bookingId,
        paymentStatus: paymentData.paymentStatus,
        amount: paymentData.amount,
        currency: paymentData.currency || 'VND',
        timestamp: new Date().toISOString(),
        ...paymentData
      };

      emitBookingPaymentUpdate(bookingId, eventData);
      
      console.log(`[RealTime] Booking payment update emitted for booking ${bookingId}:`, eventData);
      return eventData;
    } catch (error) {
      console.error('Error emitting booking payment update:', error);
      throw error;
    }
  }

  /**
   * Emit general booking event - logic duplicate
   */
  static async emitBookingEvent(eventType, bookingId, eventData = {}) {
    try {
      const fullEventData = {
        eventType,
        bookingId,
        timestamp: new Date().toISOString(),
        ...eventData
      };

      emitBookingEvent(eventType, bookingId, fullEventData);
      
      console.log(`[RealTime] Booking event '${eventType}' emitted for booking ${bookingId}:`, fullEventData);
      return fullEventData;
    } catch (error) {
      console.error('Error emitting booking event:', error);
      throw error;
    }
  }

  /**
   * Emit payment confirmed event - hợp nhất logic từ payment controller
   */
  static async emitPaymentConfirmed(bookingId, paymentData) {
    try {
      // Emit status update
      await this.emitBookingStatusUpdate(bookingId, {
        status: 'confirmed',
        message: 'Đặt sân thành công! Bạn có thể xem chi tiết booking.',
        paymentStatus: 'paid',
        shouldRefresh: true
      });

      // Emit payment update
      await this.emitBookingPaymentUpdate(bookingId, {
        paymentStatus: 'paid',
        amount: paymentData.amount,
        totalAmount: paymentData.totalAmount,
        message: 'Thanh toán thành công'
      });

      // Emit general event
      await this.emitBookingEvent('payment_confirmed', bookingId, {
        paymentAmount: paymentData.amount,
        totalAmount: paymentData.totalAmount,
        shouldRefresh: true
      });

      return { success: true, bookingId };
    } catch (error) {
      console.error('Error emitting payment confirmed:', error);
      throw error;
    }
  }

  /**
   * Emit payment expired event - hợp nhất logic từ các service
   */
  static async emitPaymentExpired(bookingId, timeoutData = {}) {
    try {
      // Emit status update
      await this.emitBookingStatusUpdate(bookingId, {
        status: 'expired',
        message: 'Booking đã hết hạn do không thanh toán trong thời gian quy định.',
        paymentStatus: 'expired',
        shouldRefresh: true
      });

      // Emit payment update
      await this.emitBookingPaymentUpdate(bookingId, {
        paymentStatus: 'expired',
        message: 'Thanh toán đã hết hạn'
      });

      // Emit general event
      await this.emitBookingEvent('payment_expired', bookingId, {
        reason: 'Payment timeout',
        shouldRefresh: true,
        ...timeoutData
      });

      return { success: true, bookingId };
    } catch (error) {
      console.error('Error emitting payment expired:', error);
      throw error;
    }
  }

  /**
   * Emit booking cancelled event - hợp nhất logic từ booking controller
   */
  static async emitBookingCancelled(bookingId, cancellationData = {}) {
    try {
      // Emit status update
      await this.emitBookingStatusUpdate(bookingId, {
        status: 'cancelled',
        message: 'Booking đã được hủy thành công.',
        cancellationReason: cancellationData.reason,
        shouldRefresh: true
      });

      // Emit general event
      await this.emitBookingEvent('booking_cancelled', bookingId, {
        reason: cancellationData.reason || 'User cancelled',
        refundAmount: cancellationData.refundAmount,
        shouldRefresh: true
      });

      return { success: true, bookingId };
    } catch (error) {
      console.error('Error emitting booking cancelled:', error);
      throw error;
    }
  }

  /**
   * Emit booking ready for payment - từ payment session creation
   */
  static async emitBookingReadyForPayment(bookingId, paymentData) {
    try {
      await this.emitBookingStatusUpdate(bookingId, {
        status: 'pending_payment',
        message: 'Sẵn sàng thanh toán',
        paymentUrl: paymentData.paymentUrl,
        sessionId: paymentData.sessionId,
        shouldRefresh: false
      });

      return { success: true, bookingId };
    } catch (error) {
      console.error('Error emitting booking ready for payment:', error);
      throw error;
    }
  }

  /**
   * Emit multiple events for booking flow - utility method
   */
  static async emitBookingFlow(bookingId, events) {
    try {
      const results = [];
      
      for (const event of events) {
        let result;
        
        switch (event.type) {
          case 'status_update':
            result = await this.emitBookingStatusUpdate(bookingId, event.data);
            break;
          case 'payment_update':
            result = await this.emitBookingPaymentUpdate(bookingId, event.data);
            break;
          case 'general_event':
            result = await this.emitBookingEvent(event.eventType, bookingId, event.data);
            break;
          default:
            console.warn(`Unknown event type: ${event.type}`);
            continue;
        }
        
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error emitting booking flow:', error);
      throw error;
    }
  }

}

module.exports = RealTimeEventService;
