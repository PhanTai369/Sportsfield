const timeSlotService = require('../services/timeslot.service');
const responseFormatter = require('../utils/responseFormatter');


/**
 * API lấy danh sách sub fields của một field
 * GET /api/slots/field/:fieldId/subfields
 */
const getSubFieldsByFieldId = async (req, res) => {
  try {
    const { fieldId } = req.params;

    const subFields = await timeSlotService.getSubFieldsByFieldId(fieldId);

    return res.json(responseFormatter.success(subFields, 'Lấy danh sách sub fields thành công'));
  } catch (error) {
    console.error('Error getting sub fields:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi lấy danh sách sub fields', 500));
  }
};

/**
 * API cập nhật hệ số peak hour cho time slot
 * PATCH /api/slots/:slotId/peak-hour
 */
const updatePeakHourMultiplier = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { peakHourMultiplier, peakHourStart } = req.body;

    // Validate peak hour multiplier
    if (peakHourMultiplier < 1 || peakHourMultiplier > 5) {
      return res.status(400).json(responseFormatter.error('Hệ số peak hour phải từ 1.0 đến 5.0', 400));
    }

    // Update the time slot with new peak hour multiplier
    const updatedSlot = await timeSlotService.updateTimeSlot(slotId, {
      peak_hour_multiplier: peakHourMultiplier
    });

    return res.json(responseFormatter.success(updatedSlot, 'Cập nhật hệ số peak hour thành công'));
  } catch (error) {
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi cập nhật hệ số peak hour', 500));
  }
};

/**
 * API cập nhật hệ số peak hour cho nhiều time slots theo điều kiện
 * PATCH /api/slots/bulk-update-peak-hour
 */
const bulkUpdatePeakHour = async (req, res) => {
  try {
    const { 
      subFieldIds,  // Changed to array
      startDate,
      endDate,
      startTime, 
      endTime, 
      peakHourMultiplier,
      applyToAllDates = false 
    } = req.body;

    // Validate input
    if (!subFieldIds || !Array.isArray(subFieldIds) || subFieldIds.length === 0) {
      return res.status(400).json(responseFormatter.error('Vui lòng chọn ít nhất một sân', 400));
    }

    // Validate peak hour multiplier
    if (peakHourMultiplier < 1 || peakHourMultiplier > 5) {
      return res.status(400).json(responseFormatter.error('Hệ số peak hour phải từ 1.0 đến 5.0', 400));
    }

    const result = await timeSlotService.bulkUpdatePeakHour({
      subFieldIds,
      startDate,
      endDate,
      startTime,
      endTime,
      peakHourMultiplier,
      applyToAllDates
    });

    return res.json(responseFormatter.success(result, 'Cập nhật hệ số peak hour thành công'));
  } catch (error) {
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi cập nhật hệ số peak hour', 500));
  }
};

/**
 * API lấy thông tin time slot theo ID
 * GET /api/slots/:slotId
 */
const getTimeSlotById = async (req, res) => {
  try {
    const { slotId } = req.params;

    const timeSlot = await timeSlotService.getTimeSlotById(slotId);

    if (!timeSlot) {
      return res.status(404).json(responseFormatter.error('Không tìm thấy khung giờ', 404));
    }

    return res.json(responseFormatter.success(timeSlot, 'Lấy thông tin khung giờ thành công'));
  } catch (error) {
    console.error('Error getting time slot:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi lấy thông tin khung giờ', 500));
  }
};

/**
 * API cập nhật trạng thái time slot
 * PATCH /api/slots/:slotId
 */
const updateTimeSlotStatus = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json(responseFormatter.error('Vui lòng cung cấp trạng thái', 400));
    }

    const updatedSlot = await timeSlotService.updateTimeSlot(slotId, {
      status
    });

    return res.json(responseFormatter.success(updatedSlot, 'Cập nhật trạng thái khung giờ thành công'));
  } catch (error) {
    console.error('Error updating time slot:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi cập nhật trạng thái khung giờ', 500));
  }
};

/**
 * API tìm time slot theo field, date và time
 * GET /api/slots/find
 */
const findTimeSlotByFieldDateTime = async (req, res) => {
  try {
    const { subFieldId, date, startTime } = req.query;

    if (!subFieldId || !date || !startTime) {
      return res.status(400).json(responseFormatter.error('subFieldId, date và startTime là bắt buộc', 400));
    }

    // Tìm slot trong database
    const { TimeSlot, SubField } = require('../models');
    const slot = await TimeSlot.findOne({
      where: {
        sub_field_id: subFieldId,
        date: date,
        start_time: startTime
      },
      include: [{
        model: SubField,
        as: 'subfield',
        attributes: ['id', 'name', 'field_id']
      }]
    });

    if (!slot) {
      return res.status(404).json(responseFormatter.error('Không tìm thấy khung giờ', 404));
    }

    const result = {
      id: slot.id,
      subFieldId: slot.sub_field_id,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      status: slot.status,
      maintenanceReason: slot.maintenance_reason,
      maintenanceUntil: slot.maintenance_until,
      subField: slot.subfield
    };

    return res.json(responseFormatter.success(result, 'Tìm thấy khung giờ'));
  } catch (error) {
    console.error('Error finding time slot:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi tìm kiếm khung giờ', 500));
  }
};

/**
 * API tính giá cho time slot cụ thể
 * POST /api/timeslots/calculate-price
 */
const calculateSlotPrice = async (req, res) => {
  try {
    const { fieldId, startTime } = req.body;

    if (!fieldId || !startTime) {
      return res.status(400).json(responseFormatter.error('Thiếu fieldId hoặc startTime', 400));
    }

    const priceInfo = await timeSlotService.calculatePriceWithPricingRule(fieldId, startTime);

    return res.json(responseFormatter.success(priceInfo, 'Tính giá thành công'));
  } catch (error) {
    console.error('Error calculating price:', error);
    return res.status(500).json(responseFormatter.error(error.message || 'Lỗi tính giá', 500));
  }
};

module.exports = {
  updatePeakHourMultiplier,
  bulkUpdatePeakHour,
  getSubFieldsByFieldId,
  getTimeSlotById,
  updateTimeSlotStatus,
  findTimeSlotByFieldDateTime,
  calculateSlotPrice
};
