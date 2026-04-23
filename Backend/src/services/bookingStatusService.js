const { Booking, TimeSlot, SubField } = require('../models');
const { Op } = require('sequelize');

class BookingStatusService {
  /**
   * Tự động cập nhật booking status từ confirmed sang completed
   * dựa trên thời gian sử dụng dịch vụ
   */
  static async updateExpiredBookingsToCompleted() {
    try {
      console.log('🔄 Checking for bookings to mark as completed...');
      
      const now = new Date();
      
      // Tìm các booking có status confirmed và đã qua thời gian sử dụng
      const bookingsToComplete = await Booking.findAll({
        where: {
          status: 'confirmed',
          payment_status: 'paid'
        },
        include: [{
          model: TimeSlot,
          as: 'timeSlots',
          attributes: ['date', 'end_time'],
          required: true
        }]
      });

      const completedBookingIds = [];
      
      for (const booking of bookingsToComplete) {
        // Lấy thời gian kết thúc cuối cùng của booking
        const lastTimeSlot = booking.timeSlots
          .sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.end_time}`);
            const dateTimeB = new Date(`${b.date}T${b.end_time}`);
            return dateTimeB - dateTimeA;
          })[0];

        if (lastTimeSlot) {
          const endDateTime = new Date(`${lastTimeSlot.date}T${lastTimeSlot.end_time}`);
          
          // Nếu đã qua thời gian kết thúc thì cập nhật thành completed
          if (now > endDateTime) {
            await booking.update({
              status: 'completed',
              updated_at: now
            });
            
            completedBookingIds.push(booking.id);
            console.log(`✅ Updated booking ${booking.id} to completed (ended at ${endDateTime.toISOString()})`);
          }
        }
      }
      
      console.log(`📊 Updated ${completedBookingIds.length} bookings to completed status`);
      return completedBookingIds;
      
    } catch (error) {
      console.error('❌ Error updating expired bookings to completed:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra một booking cụ thể có nên chuyển thành completed không
   */
  static async checkAndUpdateBookingToCompleted(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [{
          model: TimeSlot,
          as: 'timeSlots',
          attributes: ['date', 'end_time'],
          required: true
        }]
      });

      if (!booking || booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
        return false;
      }

      const now = new Date();
      const lastTimeSlot = booking.timeSlots
        .sort((a, b) => {
          const dateTimeA = new Date(`${a.date}T${a.end_time}`);
          const dateTimeB = new Date(`${b.date}T${b.end_time}`);
          return dateTimeB - dateTimeA;
        })[0];

      if (lastTimeSlot) {
        const endDateTime = new Date(`${lastTimeSlot.date}T${lastTimeSlot.end_time}`);
        
        if (now > endDateTime) {
          await booking.update({
            status: 'completed',
            updated_at: now
          });
          
          console.log(`✅ Updated booking ${bookingId} to completed`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error checking booking ${bookingId} for completion:`, error);
      return false;
    }
  }

  /**
   * Khởi tạo periodic task để tự động cập nhật booking status
   */
  static startPeriodicStatusUpdate() {
    console.log('🚀 Starting periodic booking status update service...');
    
    // Chạy ngay lập tức
    this.updateExpiredBookingsToCompleted();
    
    // Sau đó chạy mỗi 5 phút
    setInterval(() => {
      this.updateExpiredBookingsToCompleted();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('⏰ Booking status update service started (runs every 5 minutes)');
  }
}

module.exports = BookingStatusService;
