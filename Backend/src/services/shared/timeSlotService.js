const { TimeSlot, Booking, User, Field, Subfield } = require('../../models');
const { Op } = require('sequelize');

/**
 * Centralized TimeSlot Service - Hợp nhất các logic trùng lặp cho TimeSlot operations
 * Giảm duplicate code và tăng consistency
 */
class TimeSlotService {

  /**
   * Tìm timeslot theo điều kiện chuẩn - thay thế cho findOne trùng lặp
   */
  static async findTimeSlot(where, options = {}) {
    try {
      return await TimeSlot.findOne({
        where,
        ...options
      });
    } catch (error) {
      console.error('Error finding timeslot:', error);
      throw error;
    }
  }

  /**
   * Tìm nhiều timeslots theo điều kiện - thay thế cho findAll trùng lặp  
   */
  static async findTimeSlots(where, options = {}) {
    try {
      return await TimeSlot.findAll({
        where,
        ...options
      });
    } catch (error) {
      console.error('Error finding timeslots:', error);
      throw error;
    }
  }

  /**
   * Tạo hoặc tìm timeslot - logic thường được duplicate
   */
  static async findOrCreateTimeSlot(where, defaults = {}) {
    try {
      let slot = await TimeSlot.findOne({ where });
      
      if (!slot) {
        slot = await TimeSlot.create({
          ...where,
          ...defaults
        });
      }
      
      return { slot, created: !slot };
    } catch (error) {
      console.error('Error finding or creating timeslot:', error);
      throw error;
    }
  }

  /**
   * Cập nhật status timeslot - logic được duplicate nhiều nơi
   */
  static async updateTimeSlotStatus(slotIds, status, additionalData = {}) {
    try {
      const where = Array.isArray(slotIds) 
        ? { id: { [Op.in]: slotIds } }
        : { id: slotIds };

      const updateData = {
        status,
        ...additionalData
      };

      const result = await TimeSlot.update(updateData, {
        where,
        returning: true
      });

      return result;
    } catch (error) {
      console.error('Error updating timeslot status:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái booking cho timeslots - thường dùng trong payment
   */
  static async updateBookingStatus(slotIds, booking_id, status = 'booked') {
    try {
      return await this.updateTimeSlotStatus(slotIds, status, { booking_id });
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Giải phóng timeslots (set về available) - dùng khi cancel booking
   */
  static async releaseTimeSlots(slotIds) {
    try {
      return await this.updateTimeSlotStatus(slotIds, 'available', { 
        booking_id: null 
      });
    } catch (error) {
      console.error('Error releasing timeslots:', error);
      throw error;
    }
  }

  /**
   * Tìm timeslots theo booking ID - logic thường duplicate
   */
  static async findTimeSlotsByBooking(booking_id) {
    try {
      return await this.findTimeSlots({ booking_id });
    } catch (error) {
      console.error('Error finding timeslots by booking:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra availability của timeslots - logic duplicate trong booking
   */
  static async checkAvailability(slotConditions) {
    try {
      const unavailableSlots = await this.findTimeSlots({
        ...slotConditions,
        status: { [Op.in]: ['booked', 'maintenance'] }
      });

      return unavailableSlots.length === 0;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Tạo bulk timeslots cho field - tránh duplicate logic
   */
  static async createBulkTimeSlots(timeSlotsData) {
    try {
      const results = [];
      
      for (const slotData of timeSlotsData) {
        const { slot, created } = await this.findOrCreateTimeSlot({
          subfield_id: slotData.subfield_id,
          day: slotData.day,
          time: slotData.time
        }, {
          status: slotData.status || 'available',
          price: slotData.price
        });
        
        results.push({ slot, created });
      }
      
      return results;
    } catch (error) {
      console.error('Error creating bulk timeslots:', error);
      throw error;
    }
  }

  /**
   * Lấy timeslots with field details - thường duplicate trong controllers
   */
  static async getTimeSlotsWithDetails(where, options = {}) {
    try {
      return await this.findTimeSlots(where, {
        include: [
          {
            model: Subfield,
            include: [{ model: Field }]
          },
          {
            model: Booking,
            include: [{ model: User }]
          }
        ],
        ...options
      });
    } catch (error) {
      console.error('Error getting timeslots with details:', error);
      throw error;
    }
  }

  /**
   * Xóa timeslots cũ - logic cleanup duplicate
   */
  static async cleanupOldTimeSlots(daysBefore = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBefore);
      
      const deleted = await TimeSlot.destroy({
        where: {
          day: { [Op.lt]: cutoffDate.getDate() },
          status: 'available'
        }
      });
      
      return deleted;
    } catch (error) {
      console.error('Error cleaning up old timeslots:', error);
      throw error;
    }
  }

}

module.exports = TimeSlotService;
