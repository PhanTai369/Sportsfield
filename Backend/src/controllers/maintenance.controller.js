const timeslotService = require("../services/timeslot.service");
const responseFormatter = require("../utils/responseFormatter");
const { TimeSlot, SubField } = require("../models");
const { Op } = require("sequelize");
const { getSocketInstance } = require("../utils/socketInstance");

/**
 * Set maintenance status for multiple time slots
 */
const setMaintenance = async (req, res) => {
  try {
    const {
      subFieldIds,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      estimatedCompletion,
    } = req.body;

    // Validation
    if (
      !subFieldIds ||
      !Array.isArray(subFieldIds) ||
      subFieldIds.length === 0
    ) {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng chọn ít nhất một sân", 400));
    }

    if (!startDate || !startTime || !endTime) {
      return res
        .status(400)
        .json(
          responseFormatter.error(
            "Vui lòng nhập đầy đủ thông tin thời gian",
            400
          )
        );
    }

    if (!reason || reason.trim().length === 0) {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng nhập lý do bảo trì", 400));
    }
    const result = await timeslotService.setMaintenanceStatus(
      {
        subFieldIds,
        startDate,
        endDate,
        startTime,
        endTime,
        reason: reason.trim(),
        estimatedCompletion,
      },
      getSocketInstance()
    );

    return res.json(
      responseFormatter.success(
        result,
        "Cập nhật trạng thái bảo trì thành công"
      )
    );
  } catch (error) {
    console.error("Error setting maintenance:", error);
    return res
      .status(500)
      .json(responseFormatter.error("Lỗi cập nhật trạng thái bảo trì", 500));
  }
};

/**
 * Remove maintenance status from time slots
 */
const removeMaintenance = async (req, res) => {
  try {
    const { slotIds } = req.body;

    if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
      return res
        .status(400)
        .json(
          responseFormatter.error("Vui lòng chọn ít nhất một khung giờ", 400)
        );
    }

    const result = await timeslotService.revertMaintenanceStatus(
      slotIds,
      getSocketInstance()
    );

    return res.json(
      responseFormatter.success(result, "Đã hủy trạng thái bảo trì thành công")
    );
  } catch (error) {
    console.error("Error removing maintenance:", error);
    return res
      .status(500)
      .json(responseFormatter.error("Lỗi khi hủy trạng thái bảo trì", 500));
  }
};

/**
 * Remove maintenance status from a single time slot (for DELETE endpoint)
 */
const removeSingleMaintenance = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      return res
        .status(400)
        .json(responseFormatter.error("ID khung giờ không hợp lệ", 400));
    }

    // Use the toggle function to revert to available
    const result = await timeslotService.toggleMaintenanceStatus(
      slotId,
      null, // No reason needed for removal
      null, // No estimated completion
      getSocketInstance()
    );

    if (result.slot.status === "available" || result.slot.deleted) {
      return res.json(
        responseFormatter.success(
          result,
          "Đã hủy trạng thái bảo trì thành công"
        )
      );
    } else {
      return res
        .status(400)
        .json(responseFormatter.error("Không thể hủy trạng thái bảo trì", 400));
    }
  } catch (error) {
    console.error("❌ Error removing single maintenance:", error);

    // Handle specific error messages
    if (error.message === "Time slot not found") {
      return res
        .status(404)
        .json(responseFormatter.error("Không tìm thấy khung giờ", 404));
    }

    if (
      error.message === "Cannot change maintenance status of booked time slots"
    ) {
      return res
        .status(400)
        .json(
          responseFormatter.error(
            "Không thể thay đổi trạng thái bảo trì của khung giờ đã được đặt",
            400
          )
        );
    }

    return res
      .status(500)
      .json(responseFormatter.error("Lỗi khi hủy trạng thái bảo trì", 500));
  }
};

/**
 * Toggle maintenance status for a single time slot
 */
const toggleMaintenance = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { reason, estimatedCompletion } = req.body;
    if (!slotId) {
      return res
        .status(400)
        .json(responseFormatter.error("ID khung giờ không hợp lệ", 400));
    }

    const result = await timeslotService.toggleMaintenanceStatus(
      slotId,
      reason?.trim(),
      estimatedCompletion,
      getSocketInstance()
    );

    const message =
      result.slot.status === "maintenance"
        ? "Đã đặt khung giờ vào trạng thái bảo trì"
        : "Đã hủy trạng thái bảo trì";

    return res.json(responseFormatter.success(result, message));
  } catch (error) {
    console.error("Error toggling maintenance:", error);

    // Handle specific error messages
    if (error.message === "Time slot not found") {
      return res
        .status(404)
        .json(responseFormatter.error("Không tìm thấy khung giờ", 404));
    }

    if (
      error.message === "Cannot change maintenance status of booked time slots"
    ) {
      return res
        .status(400)
        .json(
          responseFormatter.error(
            "Không thể thay đổi trạng thái bảo trì của khung giờ đã được đặt",
            400
          )
        );
    }

    if (error.message === "Maintenance reason is required") {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng nhập lý do bảo trì", 400));
    }

    return res
      .status(500)
      .json(
        responseFormatter.error("Lỗi khi thay đổi trạng thái bảo trì", 500)
      );
  }
};

/**
 * Get maintenance history for a field
 */
const getMaintenanceHistory = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    // This would require additional implementation to track maintenance history
    // For now, return current maintenance slots
    const maintenanceSlots = await TimeSlot.findAll({
      where: {
        status: "maintenance",
        ...(startDate &&
          endDate && {
            date: {
              [Op.between]: [startDate, endDate],
            },
          }),
      },
      include: [
        {
          model: SubField,
          as: "subfield",
          where: { field_id: fieldId },
          attributes: ["id", "name", "field_id"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["start_time", "ASC"],
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json(
      responseFormatter.success(
        {
          maintenanceSlots: maintenanceSlots.map((slot) => ({
            id: slot.id,
            date: slot.date,
            startTime: slot.start_time,
            endTime: slot.end_time,
            subField: slot.subfield,
            reason: slot.maintenance_reason,
            estimatedCompletion: slot.maintenance_until,
            createdAt: slot.updated_at,
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: maintenanceSlots.length,
          },
        },
        "Lấy lịch sử bảo trì thành công"
      )
    );
  } catch (error) {
    console.error("Error getting maintenance history:", error);
    return res
      .status(500)
      .json(responseFormatter.error("Lỗi khi lấy lịch sử bảo trì", 500));
  }
};

/**
 * Remove maintenance by field, time, and date (fallback endpoint)
 */
const removeMaintenanceByFieldTime = async (req, res) => {
  try {
    const { fieldId, date, startTime, endTime } = req.body;

    if (!fieldId || !date || !startTime || !endTime) {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng nhập đầy đủ thông tin", 400));
    } // First, find all subfields for this field
    const subFields = await SubField.findAll({
      where: { field_id: fieldId },
      attributes: ["id"],
    });

    // Also try fieldId as direct subfield ID
    const directSubfield = await SubField.findByPk(fieldId);

    let searchSubFieldIds = [];
    if (subFields.length > 0) {
      searchSubFieldIds = subFields.map((sf) => sf.id);
    }
    if (directSubfield) {
      searchSubFieldIds.push(fieldId);
    }

    if (searchSubFieldIds.length === 0) {
      return res
        .status(404)
        .json(
          responseFormatter.error(
            "Không tìm thấy sân con nào cho field này",
            404
          )
        );
    }

    // Find the time slot matching the criteria
    let timeSlot = await TimeSlot.findOne({
      where: {
        date,
        start_time: startTime,
        end_time: endTime,
        status: "maintenance",
        sub_field_id: { [Op.in]: searchSubFieldIds },
      },
    });

    if (!timeSlot) {
      // Try to find any maintenance slot for this field and time, even without exact end time match
      const fallbackTimeSlot = await TimeSlot.findOne({
        where: {
          date,
          start_time: startTime,
          status: "maintenance",
          sub_field_id: { [Op.in]: searchSubFieldIds },
        },
      });

      if (!fallbackTimeSlot) {
        return res
          .status(404)
          .json(
            responseFormatter.error(
              "Không tìm thấy khung giờ bảo trì phù hợp",
              404
            )
          );
      }

      // Use the fallback slot
      timeSlot = fallbackTimeSlot;
    }

    // Use the toggle function to revert to available
    const result = await timeslotService.toggleMaintenanceStatus(
      timeSlot.id,
      null, // No reason needed for removal
      null, // No estimated completion
      getSocketInstance()
    );

    if (result.slot.status === "available" || result.slot.deleted) {
      return res.json(
        responseFormatter.success(
          result,
          "Đã hủy trạng thái bảo trì thành công"
        )
      );
    } else {
      return res
        .status(400)
        .json(responseFormatter.error("Không thể hủy trạng thái bảo trì", 400));
    }
  } catch (error) {
    console.error("Error removing maintenance by field time:", error);
    return res
      .status(500)
      .json(responseFormatter.error("Lỗi khi hủy trạng thái bảo trì", 500));
  }
};

/**
 * Set maintenance status for full day (all available time slots)
 */
const setFullDayMaintenance = async (req, res) => {
  try {
    const {
      subFieldIds,
      date,
      reason,
      estimatedCompletion,
    } = req.body;

    // Validation
    if (
      !subFieldIds ||
      !Array.isArray(subFieldIds) ||
      subFieldIds.length === 0
    ) {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng chọn ít nhất một sân", 400));
    }

    if (!date) {
      return res
        .status(400)
        .json(
          responseFormatter.error("Vui lòng chọn ngày bảo trì", 400)
        );
    }

    if (!reason || reason.trim().length === 0) {
      return res
        .status(400)
        .json(responseFormatter.error("Vui lòng nhập lý do bảo trì", 400));
    }

    // Call service to set maintenance for full day
    const result = await timeslotService.setFullDayMaintenanceStatus(
      {
        subFieldIds,
        date,
        reason: reason.trim(),
        estimatedCompletion,
      },
      getSocketInstance()
    );

    return res.json(
      responseFormatter.success(
        result,
        "Đã đặt bảo trì cả ngày thành công"
      )
    );
  } catch (error) {
    console.error("Error setting full day maintenance:", error);
    return res
      .status(500)
      .json(responseFormatter.error(error.message || "Lỗi cập nhật trạng thái bảo trì", 500));
  }
};

/**
 * Check for existing maintenance slots before setting maintenance
 */
const checkMaintenanceDuplicates = async (req, res) => {
  try {
    const {
      subFieldIds,
      date,
      startTime,
      endTime,
    } = req.body;

    // Validation
    if (!subFieldIds || !Array.isArray(subFieldIds) || subFieldIds.length === 0) {
      return res.status(400).json(
        responseFormatter.error("Vui lòng chọn ít nhất một sân", 400)
      );
    }

    if (!date || !startTime || !endTime) {
      return res.status(400).json(
        responseFormatter.error("Vui lòng nhập đầy đủ thông tin thời gian", 400)
      );
    }

    const duplicateCheck = await timeslotService.checkExistingMaintenance(
      subFieldIds,
      date,
      startTime,
      endTime
    );

    return res.status(200).json(
      responseFormatter.success(duplicateCheck, "Kiểm tra trùng lặp bảo trì thành công")
    );
  } catch (error) {
    console.error("Error checking maintenance duplicates:", error);
    return res.status(500).json(
      responseFormatter.error("Lỗi kiểm tra trùng lặp bảo trì: " + error.message, 500)
    );
  }
};

module.exports = {
  setMaintenance,
  removeMaintenance,
  removeSingleMaintenance,
  toggleMaintenance,
  getMaintenanceHistory,
  removeMaintenanceByFieldTime,
  setFullDayMaintenance,
  checkMaintenanceDuplicates,
};
