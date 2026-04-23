/**
 * Centralized Booking Email Service
 * Single source of truth for all booking-related email logic
 * Eliminates duplicate email preparation and sending logic
 */

const { sendBookingConfirmationEmail, sendOwnerBookingNotificationEmail, logEmailOperation } = require('../../utils/emailService');
const logger = require('../../utils/logger');

class BookingEmailService {
  /**
   * Unified booking details preparation for emails
   */
  static prepareBookingDetails(bookingWithDetails) {
    if (!bookingWithDetails) {
      throw new Error('Booking details are required');
    }

    const timeSlots = bookingWithDetails.timeSlots || [];
    let startTime = '';
    let endTime = '';
    
    // Format time helper
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      return timeStr.substring(0, 5); // "HH:MM:SS" -> "HH:MM"
    };
    
    // Get time from TimeSlots first
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

    // Get field information
    const field = timeSlots[0]?.subfield?.field || null;
    const fieldName = field?.name || bookingWithDetails.booking_metadata?.fieldName || 'Unknown Field';

    return {
      fieldName,
      customerName: bookingWithDetails.customer_info?.name || bookingWithDetails.user?.name || 'Khách hàng',
      customerEmail: bookingWithDetails.customer_info?.email || bookingWithDetails.user?.email || '',
      customerPhone: bookingWithDetails.customer_info?.phone || 'Không có thông tin',
      date: new Date(bookingWithDetails.booking_date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      startTime,
      endTime,
      timeRange: `${startTime} - ${endTime}`,
      totalAmount: bookingWithDetails.total_price,
      bookingId: bookingWithDetails.id,
      field: field // Include full field object for owner notification
    };
  }

  /**
   * Send confirmation email to customer (unified)
   */
  static async sendCustomerConfirmation(bookingWithDetails, source = 'booking_confirmation') {
    try {
      const bookingDetails = this.prepareBookingDetails(bookingWithDetails);
      
      if (!bookingDetails.customerEmail) {
        logger.warn('No customer email provided for booking confirmation:', bookingDetails.bookingId);
        return false;
      }

      logger.info(`Sending confirmation email to customer from ${source}:`, {
        customerEmail: bookingDetails.customerEmail,
        timeRange: bookingDetails.timeRange,
        bookingId: bookingDetails.bookingId,
        source
      });
      
      await sendBookingConfirmationEmail(
        bookingDetails.customerEmail,
        bookingDetails.customerName,
        bookingDetails
      );
      
      logEmailOperation('send', bookingDetails.customerEmail, 'booking_confirmation', true);
      logger.info('Confirmation email sent successfully to customer:', bookingDetails.customerEmail);
      return true;
      
    } catch (error) {
      const customerEmail = bookingWithDetails.customer_info?.email || bookingWithDetails.user?.email || 'unknown';
      logEmailOperation('send', customerEmail, 'booking_confirmation', false, error);
      logger.error('Failed to send confirmation email to customer:', error);
      throw error;
    }
  }

  /**
   * Send notification email to field owner (unified)
   */
  static async sendOwnerNotification(bookingWithDetails, source = 'owner_notification') {
    try {
      const bookingDetails = this.prepareBookingDetails(bookingWithDetails);
      
      if (!bookingDetails.field?.owner?.email) {
        logger.warn('No field owner email available for booking notification:', bookingDetails.bookingId);
        return false;
      }

      logger.info(`Sending notification email to field owner from ${source}:`, {
        ownerEmail: bookingDetails.field.owner.email,
        fieldName: bookingDetails.fieldName,
        bookingId: bookingDetails.bookingId,
        source
      });
      
      await sendOwnerBookingNotificationEmail(
        bookingDetails.field.owner.email,
        bookingDetails.field.owner.name,
        bookingDetails
      );
      
      logEmailOperation('send', bookingDetails.field.owner.email, 'owner_notification', true);
      logger.info('Notification email sent successfully to field owner:', bookingDetails.field.owner.email);
      return true;
      
    } catch (error) {
      const ownerEmail = bookingWithDetails.timeSlots?.[0]?.subfield?.field?.owner?.email || 'unknown';
      logEmailOperation('send', ownerEmail, 'owner_notification', false, error);
      logger.error('Failed to send notification email to field owner:', error);
      throw error;
    }
  }

  /**
   * Send both customer confirmation and owner notification (unified)
   */
  static async sendAllBookingEmails(bookingWithDetails, source = 'booking_emails') {
    const results = {
      customerEmailSent: false,
      ownerEmailSent: false,
      errors: []
    };

    try {
      // Send customer confirmation
      try {
        results.customerEmailSent = await this.sendCustomerConfirmation(bookingWithDetails, source);
      } catch (customerError) {
        results.errors.push({ type: 'customer', error: customerError.message });
      }

      // Send owner notification
      try {
        results.ownerEmailSent = await this.sendOwnerNotification(bookingWithDetails, source);
      } catch (ownerError) {
        results.errors.push({ type: 'owner', error: ownerError.message });
      }

      logger.info(`Email sending completed for booking ${bookingWithDetails.id}:`, {
        customerEmailSent: results.customerEmailSent,
        ownerEmailSent: results.ownerEmailSent,
        errorCount: results.errors.length,
        source
      });

      return results;
      
    } catch (error) {
      logger.error('Error in sendAllBookingEmails:', error);
      results.errors.push({ type: 'general', error: error.message });
      return results;
    }
  }

  /**
   * Get full booking details with all required includes for email
   */
  static async getBookingDetailsForEmail(bookingId) {
    const { Booking, User, TimeSlot, SubField, Field } = require('../models');
    
    return await Booking.findByPk(bookingId, {
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
  }
}

module.exports = BookingEmailService;
