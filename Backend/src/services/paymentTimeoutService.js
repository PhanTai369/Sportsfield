const cron = require('node-cron');
const { Booking, TimeSlot, Payment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.config');
const { emitBookingEvent } = require('../config/socket.config');
const responseFormatter = require('../utils/responseFormatter');

class PaymentTimeoutService {
  /**
   * Initialize payment timeout monitoring
   */
  static init() {
    // Run every minute to check for expired payment pending bookings
    cron.schedule('* * * * *', async () => {
      try {
        await this.processExpiredPayments();
      } catch (error) {
        console.error('Error processing expired payments:', error);
      }
    });

    console.log('Payment timeout service initialized');
  }

  /**
   * Process expired payment pending bookings
   */
  static async processExpiredPayments() {
    const transaction = await sequelize.transaction();
    
    try {
      // Find bookings that are payment pending and expired (older than 10 minutes)
      const expiredBookings = await Booking.findAll({
        where: {
          status: ['pending', 'payment_pending'],
          payment_status: ['pending', 'processing'],
          created_at: {
            [Op.lt]: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
          }
        },
        include: [{
          model: TimeSlot,
          as: 'timeSlots'
        }],
        transaction
      });

      if (expiredBookings.length === 0) {
        await transaction.commit();
        return;
      }

      console.log(`Found ${expiredBookings.length} expired payment pending bookings`);

      for (const booking of expiredBookings) {
        try {
          // Update booking status to cancelled
          await booking.update({
            status: 'cancelled',
            payment_status: 'failed',
            cancelled_at: new Date(),
            cancellation_reason: 'Payment timeout - automatically cancelled after 10 minutes'
          }, { transaction });

          // Release all time slots for this booking
          if (booking.timeSlots && booking.timeSlots.length > 0) {
            await TimeSlot.update({
              status: 'available',
              booking_id: null
            }, {
              where: {
                booking_id: booking.id
              },
              transaction
            });

            console.log(`Released ${booking.timeSlots.length} time slots for booking ${booking.id}`);
          }

          // Emit socket event for real-time updates
          emitBookingEvent('booking_expired', {
            bookingId: booking.id,
            fieldId: booking.field_id,
            timeSlots: booking.timeSlots?.map(ts => ({
              subFieldId: ts.sub_field_id,
              startTime: ts.start_time,
              date: ts.date
            })) || [],
            reason: 'Payment timeout'
          });

          console.log(`Booking ${booking.id} expired and cancelled automatically`);

        } catch (bookingError) {
          console.error(`Error processing expired booking ${booking.id}:`, bookingError);
          // Continue with other bookings even if one fails
        }
      }

      await transaction.commit();
      console.log(`Successfully processed ${expiredBookings.length} expired bookings`);

    } catch (error) {
      await transaction.rollback();
      console.error('Error in processExpiredPayments:', error);
      throw error;
    }
  }

  /**
   * Check if a booking is expired
   */
  static isBookingExpired(bookingCreatedAt, timeoutMinutes = 10) {
    const now = new Date();
    const createdAt = new Date(bookingCreatedAt);
    const diffMinutes = (now - createdAt) / (1000 * 60);
    
    return diffMinutes > timeoutMinutes;
  }

  /**
   * Get remaining time for a payment pending booking
   */
  static getRemainingPaymentTime(bookingCreatedAt, timeoutMinutes = 10) {
    const now = new Date();
    const createdAt = new Date(bookingCreatedAt);
    const expiresAt = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
    
    const remainingMs = expiresAt - now;
    
    if (remainingMs <= 0) {
      return { expired: true, minutes: 0, seconds: 0 };
    }
    
    const minutes = Math.floor(remainingMs / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    
    return { expired: false, minutes, seconds };
  }

  /**
   * Manually trigger payment timeout check (for testing)
   */
  static async triggerPaymentTimeoutCheck() {
    try {
      await this.processExpiredPayments();
      return { success: true, message: 'Payment timeout check completed' };
    } catch (error) {
      console.error('Error in manual payment timeout check:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentTimeoutService;
