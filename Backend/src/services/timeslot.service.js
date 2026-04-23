const { TimeSlot, SubField, Field, FieldPricingRule, Booking } = require("../models");
const { Op, Sequelize } = require("sequelize");
const dbOptimizer = require("../utils/dbOptimizer");

const { formatDateForDB } = require("../utils/dateUtils"); // Giả sử bạn có một tiện ích để định dạng ngày

/**
 * Lấy danh sách SubFields của một Field
 * @param {string} fieldId - ID của Field
 */
const getSubFieldsByFieldId = async (fieldId) => {
  const subFields = await SubField.findAll({
    where: { field_id: fieldId },
    include: [
      {
        model: Field,
        as: "field",
        attributes: ["price_per_hour"],
      },
    ],
    order: [["name", "ASC"]],
  });

  return subFields.map((subField) => ({
    id: subField.id,
    name: subField.name,
    fieldId: subField.field_id,
    fieldType: subField.field_type,
    image: subField.image,
    pricePerHour: subField.field?.price_per_hour || 0,
  }));
};

// Alternative approach - Query SubField price separately if needed
const getSubFieldPrice = async (subFieldId) => {
  try {
    const subField = await SubField.findByPk(subFieldId, {
      include: [
        {
          model: Field,
          as: "field",
          attributes: ["price_per_hour"],
        },
      ],
    });

    return subField?.field?.price_per_hour || 300000;
  } catch (error) {
    console.error(`Error getting price for subField ${subFieldId}:`, error);
    return 300000; // Default fallback
  }
};

/**
 * Tính giá cho một time slot dựa trên FieldPricingRule
 * @param {string} fieldId - ID của field
 * @param {string} startTime - Thời gian bắt đầu (HH:mm)
 * @returns {Object} - Thông tin giá và hệ số
 */
const calculatePriceWithPricingRule = async (fieldId, startTime) => {
  try {
    // Lấy thông tin field và giá cơ bản
    const field = await Field.findByPk(fieldId);
    if (!field) {
      throw new Error("Field not found");
    }

    const basePrice = parseFloat(field.price_per_hour) || 0;
    const startHour = parseInt(startTime.split(":")[0]);

    // Tìm quy tắc giá phù hợp
    const pricingRule = await FieldPricingRule.findOne({
      where: {
        field_id: fieldId,
        from_hour: { [Op.lte]: startHour },
        to_hour: { [Op.gt]: startHour },
      },
    });

    const multiplier = pricingRule ? parseFloat(pricingRule.multiplier) : 1.0;
    const finalPrice = basePrice * multiplier;

    return {
      basePrice,
      multiplier,
      finalPrice,
      pricingRule: pricingRule
        ? {
            id: pricingRule.id,
            from_hour: pricingRule.from_hour,
            to_hour: pricingRule.to_hour,
            multiplier: pricingRule.multiplier,
          }
        : null,
    };
  } catch (error) {
    console.error("Error calculating price with pricing rule:", error);
    throw error;
  }
};

/**
 * Set maintenance status for time slots with realtime updates
 * @param {Object} params - Maintenance parameters
 * @param {Array} params.subFieldIds - Array of sub field IDs
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD, optional)
 * @param {string} params.startTime - Start time (HH:mm)
 * @param {string} params.endTime - End time (HH:mm)
 * @param {string} params.reason - Maintenance reason
 * @param {string} params.estimatedCompletion - Estimated completion time (optional)
 * @param {Object} io - Socket.IO instance for realtime updates
 */
const setMaintenanceStatus = async (params, io = null) => {
  const {
    subFieldIds,
    startDate,
    endDate,
    startTime,
    endTime,
    reason,
    estimatedCompletion,
  } = params;
  try {
    // Format the date range for the query
    const formattedStartDate = formatDateForDB(startDate);
    const formattedEndDate = endDate
      ? formatDateForDB(endDate)
      : formattedStartDate;

    // Validate time against current time for today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDate = new Date(startDate);
    const selectedDateNormalized = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    // Check if the selected date is in the past
    if (selectedDateNormalized < today) {
      throw new Error("Không thể đặt bảo trì cho ngày trong quá khứ");
    }

    // Parse time values
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);

    // Additional validation for today's time slots
    const isToday = selectedDateNormalized.getTime() === today.getTime();
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      // Check if start time has already passed
      const startTotalMinutes = startHour * 60;
      if (startTotalMinutes < currentTotalMinutes) {
        throw new Error(
          `Không thể đặt bảo trì cho khung giờ đã qua. Hiện tại: ${currentHour}:${currentMinute
            .toString()
            .padStart(2, "0")}, Khung giờ: ${startTime}`
        );
      }
    }

    let affectedSlots = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedMaintenanceCount = 0;

    // Process each subfield and time slot
    for (const subFieldId of subFieldIds) {
      // Generate time slots for the specified time range
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        // Check if slot already exists
        let slot = await TimeSlot.findOne({
          where: {
            sub_field_id: subFieldId,
            date: formattedStartDate,
            start_time: startTime,
            end_time: endTime,
          },
          include: [
            {
              model: SubField,
              as: "subfield",
              attributes: ["field_id", "name"],
              required: true,
            },
            {
              model: Booking,
              as: "booking",
              attributes: ["id", "status", "payment_status"],
              required: false,
            },
          ],
        });

        if (slot) {
          // Check if slot is occupied by a booking (including pending payment)
          const isOccupied = 
            slot.status === "booked" || 
            (slot.booking_id && slot.booking && 
             (slot.booking.status === "payment_pending" || slot.booking.status === "confirmed"));

          if (isOccupied) {
            // Skip occupied slots (booked or pending payment) - don't count them as affected
            continue;
          } else if (slot.status !== "maintenance") {
            // Only update if not already in maintenance and not occupied
            await slot.update({
              status: "maintenance",
              maintenance_reason: reason,
              maintenance_until: estimatedCompletion,
              updated_at: new Date(),
            });
            affectedSlots.push(slot);
            updatedCount++;
          } else {
            // Already in maintenance, skip but count
            skippedMaintenanceCount++;
          }
          // If already in maintenance, skip silently (no update needed)
        } else {
          // Create new slot for maintenance
          slot = await TimeSlot.create({
            sub_field_id: subFieldId,
            date: formattedStartDate,
            start_time: startTime,
            end_time: endTime,
            status: "maintenance",
            maintenance_reason: reason,
            maintenance_until: estimatedCompletion,
            booking_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Load the subfield relationship for socket emission
          await slot.reload({
            include: [
              {
                model: SubField,
                as: "subfield",
                attributes: ["field_id", "name"],
                required: true,
              },
            ],
          });

          affectedSlots.push(slot);
          createdCount++;
        }
      }
    }

    if (affectedSlots.length === 0) {
      return {
        affected: 0,
        slots: 0,
        skippedMaintenance: skippedMaintenanceCount,
        message:
          skippedMaintenanceCount > 0
            ? `Không có slot nào cần cập nhật. ${skippedMaintenanceCount} slot đã ở trạng thái bảo trì`
            : "Không có khung giờ nào phù hợp để đặt bảo trì",
      };
    } // Group affected slots by field_id for emitting realtime events
    if (io) {
      const fieldSlots = {};
      affectedSlots.forEach((slot) => {
        const fieldId = slot.subfield.field_id;
        if (!fieldSlots[fieldId]) {
          fieldSlots[fieldId] = [];
        }
        fieldSlots[fieldId].push({
          id: slot.id,
          subFieldId: slot.sub_field_id,
          subFieldName: slot.subfield.name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          status: "maintenance",
          maintenanceReason: reason,
          maintenanceUntil: estimatedCompletion,
        });
      });      // Emit realtime updates to all clients viewing affected fields
      Object.keys(fieldSlots).forEach((fieldId) => {
        const formattedSlots = fieldSlots[fieldId].map((slot) => ({
          id: slot.id,
          subFieldId: slot.sub_field_id,
          subFieldName: slot.subFieldName || "Unknown",
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          status: "maintenance",
          maintenanceReason: reason,
          maintenanceUntil: estimatedCompletion,
        }));

        io.to(`field-${fieldId}`).emit("timeslot-maintenance-update", {
          type: "maintenance-added",
          fieldId,
          affectedSlots: formattedSlots,
          timestamp: new Date().toISOString(),
        });
      });

      // Clear availability cache for affected field-date combinations
      const uniqueFieldDates = new Set();
      affectedSlots.forEach((slot) => {
        const fieldId = slot.subfield.field_id;
        const date = slot.date;
        uniqueFieldDates.add(`${fieldId}:${date}`);
      });

      // Clear cache for each unique field-date combination
      for (const fieldDate of uniqueFieldDates) {
        const [fieldId, date] = fieldDate.split(':');
        try {
          await dbOptimizer.clearAvailabilityCache(fieldId, date);
          console.log(`✅ Cleared availability cache for field ${fieldId} on ${date} after setting maintenance`);
        } catch (error) {
          console.error(`❌ Error clearing cache for field ${fieldId} on ${date}:`, error);
        }
      }
    }
    return {
      affected: createdCount + updatedCount,
      slots: affectedSlots.length,
      created: createdCount,
      updated: updatedCount,
      skippedMaintenance: skippedMaintenanceCount,
      affectedSlots: affectedSlots.map((slot) => ({
        id: slot.id,
        subFieldId: slot.sub_field_id,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        status: slot.status,
      })),
    };
  } catch (error) {
    console.error("Error setting maintenance status:", error);
    throw error;
  }
};

/**
 * Revert maintenance status back to available with realtime updates
 * @param {Array} slotIds - Array of time slot IDs to revert
 * @param {Object} io - Socket.IO instance for realtime updates
 */
const revertMaintenanceStatus = async (slotIds, io = null) => {
  try {
    // First get the slots to know which field they belong to
    const slotsToUpdate = await TimeSlot.findAll({
      where: {
        id: { [Op.in]: slotIds },
        status: "maintenance",
      },
      include: [
        {
          model: SubField,
          as: "subfield",
          attributes: ["field_id", "name"],
          required: true,
        },
      ],
    });

    if (slotsToUpdate.length === 0) {
      return {
        affected: 0,
        message: "Không có khung giờ bảo trì nào để hủy",
      };
    }

    // Delete maintenance slots instead of updating to available
    // This prevents unique constraint violations when users try to book
    const deletedCount = await TimeSlot.destroy({
      where: {
        id: { [Op.in]: slotIds },
        status: "maintenance",
      },
    });

    // Group by field for realtime updates
    if (io) {
      const fieldSlots = {};
      slotsToUpdate.forEach((slot) => {
        const fieldId = slot.subfield.field_id;
        if (!fieldSlots[fieldId]) {
          fieldSlots[fieldId] = [];
        }
        fieldSlots[fieldId].push({
          id: slot.id,
          subFieldId: slot.sub_field_id,
          subFieldName: slot.subfield.name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          status: "available",
        });
      });

      // Emit realtime updates
      Object.keys(fieldSlots).forEach((fieldId) => {
        io.to(`field-${fieldId}`).emit("timeslot-maintenance-update", {
          type: "maintenance-removed",
          fieldId,
          affectedSlots: fieldSlots[fieldId],
          timestamp: new Date().toISOString(),
        });
      });
    }

    // Clear availability cache for affected field-date combinations
    const uniqueFieldDates = new Set();
    slotsToUpdate.forEach((slot) => {
      const fieldId = slot.subfield.field_id;
      const date = slot.date;
      uniqueFieldDates.add(`${fieldId}:${date}`);
    });

    // Clear cache for each unique field-date combination
    for (const fieldDate of uniqueFieldDates) {
      const [fieldId, date] = fieldDate.split(':');
      try {
        await dbOptimizer.clearAvailabilityCache(fieldId, date);
        console.log(`✅ Cleared availability cache for field ${fieldId} on ${date}`);
      } catch (error) {
        console.error(`❌ Error clearing cache for field ${fieldId} on ${date}:`, error);
      }
    }

    return {
      affected: deletedCount,
      revertedSlots: slotsToUpdate.map((slot) => ({
        id: slot.id,
        subFieldId: slot.sub_field_id,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
      })),
    };
  } catch (error) {
    console.error("Error reverting maintenance status:", error);
    throw error;
  }
};

/**
 * Toggle maintenance status for a single time slot
 * @param {string} slotId - Time slot ID
 * @param {string} reason - Maintenance reason (required if setting to maintenance)
 * @param {string} estimatedCompletion - Estimated completion time (optional)
 * @param {Object} io - Socket.IO instance for realtime updates
 */
const toggleMaintenanceStatus = async (
  slotId,
  reason = null,
  estimatedCompletion = null,
  io = null
) => {
  try {
    // Get the current slot
    const slot = await TimeSlot.findByPk(slotId, {
      include: [
        {
          model: SubField,
          as: "subfield",
          attributes: ["field_id", "name"],
          required: true,
        },
        {
          model: Booking,
          as: "booking",
          attributes: ["id", "status", "payment_status"],
          required: false,
        },
      ],
    });

    if (!slot) {
      throw new Error("Time slot not found");
    }

    // Check if slot is occupied by a booking (including pending payment)
    const isOccupied = 
      slot.status === "booked" || 
      (slot.booking_id && slot.booking && 
       (slot.booking.status === "payment_pending" || slot.booking.status === "confirmed"));

    // Don't allow changing occupied slots
    if (isOccupied) {
      throw new Error("Cannot change maintenance status of occupied time slots (booked or pending payment)");
    }

    const newStatus =
      slot.status === "maintenance" ? "available" : "maintenance";

    let affectedSlotInfo = {
      id: slot.id,
      subFieldId: slot.sub_field_id,
      subFieldName: slot.subfield.name,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      status: newStatus,
      maintenanceReason: newStatus === "maintenance" ? reason : null,
      maintenanceUntil: newStatus === "maintenance" ? estimatedCompletion : null,
    };

    if (newStatus === "maintenance") {
      // Setting maintenance - update the slot
      if (!reason) {
        throw new Error("Maintenance reason is required");
      }
      const updateData = {
        status: "maintenance",
        maintenance_reason: reason,
        maintenance_until: estimatedCompletion,
        updated_at: new Date(),
      };

      await TimeSlot.update(updateData, {
        where: { id: slotId },
      });
    } else {
      // Removing maintenance - delete the slot instead of updating to available
      // This prevents unique constraint violations when users try to book
      await TimeSlot.destroy({
        where: { id: slotId },
      });
    }

    // Emit realtime update
    if (io) {
      const fieldId = slot.subfield.field_id;
      io.to(`field-${fieldId}`).emit("timeslot-maintenance-update", {
        type:
          newStatus === "maintenance"
            ? "maintenance-added"
            : "maintenance-removed",
        fieldId,
        affectedSlots: [affectedSlotInfo],
        timestamp: new Date().toISOString(),
      });

      // Clear availability cache when maintenance status changes
      try {
        await dbOptimizer.clearAvailabilityCache(fieldId, slot.date);
        console.log(`✅ Cleared availability cache for field ${fieldId} on ${slot.date} after toggling maintenance`);
      } catch (error) {
        console.error(`❌ Error clearing cache for field ${fieldId} on ${slot.date}:`, error);
      }
    }

    return {
      success: true,
      slot: {
        id: slot.id,
        status: newStatus,
        maintenanceReason: newStatus === "maintenance" ? reason : null,
        maintenanceUntil:
          newStatus === "maintenance" ? estimatedCompletion : null,
        deleted: newStatus === "available", // Indicate if slot was deleted
      },
    };
  } catch (error) {
    console.error("Error toggling maintenance status:", error);
    throw error;
  }
};

/**
 * Get a time slot by ID
 * @param {string} slotId - ID of the time slot
 */
const getTimeSlotById = async (slotId) => {
  try {
    const slot = await TimeSlot.findByPk(slotId, {
      include: [
        {
          model: SubField,
          as: "subfield",
          attributes: ["id", "name", "field_id"],
          include: [
            {
              model: Field,
              as: "field",
              attributes: ["id", "name", "price_per_hour"],
            },
          ],
        },
      ],
    });

    if (!slot) {
      return null;
    }

    return {
      id: slot.id,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time,
      status: slot.status,
      isAvailable: slot.status === "available",
      maintenanceReason: slot.maintenance_reason,
      maintenanceUntil: slot.maintenance_until,
      subField: slot.subfield
        ? {
            id: slot.subfield.id,
            name: slot.subfield.name,
            fieldId: slot.subfield.field_id,
            field: slot.subfield.field,
          }
        : null,
      createdAt: slot.created_at,
      updatedAt: slot.updated_at,
    };
  } catch (error) {
    console.error("Error getting time slot by ID:", error);
    throw error;
  }
};

/**
 * Update a time slot
 * @param {string} slotId - ID of the time slot
 * @param {object} updateData - Data to update
 */
const updateTimeSlot = async (slotId, updateData) => {
  try {
    const slot = await TimeSlot.findByPk(slotId);

    if (!slot) {
      throw new Error("Time slot not found");
    }

    // Update the slot
    await TimeSlot.update(
      {
        ...updateData,
        updated_at: new Date(),
      },
      {
        where: { id: slotId },
      }
    );

    // Return updated slot
    return await getTimeSlotById(slotId);
  } catch (error) {
    console.error("Error updating time slot:", error);
    throw error;
  }
};

/**
 * Set maintenance status for full day (all time slots from 5:00 to 23:00)
 * Validates against current time to prevent setting maintenance for past slots
 */
const setFullDayMaintenanceStatus = async (params, io = null) => {
  const { subFieldIds, date, reason, estimatedCompletion } = params;

  try {
    // Format the date for the query
    const formattedDate = formatDateForDB(date);

    // Get current time for validation
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDate = new Date(date);
    const selectedDateNormalized = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

    // Check if the selected date is in the past
    if (selectedDateNormalized < today) {
      throw new Error("Không thể đặt bảo trì cho ngày trong quá khứ");
    }

    // Determine start hour based on current time if it's today
    let startHour = 5;
    const endHour = 23;
    const isToday = selectedDateNormalized.getTime() === today.getTime();

    if (isToday) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // If current time is past start hour, adjust start hour to next available slot
      if (currentHour >= startHour) {
        // If we're in the middle of an hour (e.g., 15:30), start from the next hour (16:00)
        startHour = currentMinute > 0 ? currentHour + 1 : currentHour;

        // If all slots for today have passed, return error
        if (startHour >= endHour) {
          throw new Error(
            "Tất cả khung giờ hôm nay đã qua. Không thể đặt bảo trì cả ngày."
          );
        }
      }
    }

    let affectedSlots = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedBookedCount = 0;
    let skippedMaintenanceCount = 0;

    // Process each subfield and all time slots for the day
    for (const subFieldId of subFieldIds) {
      // Generate time slots for the full day
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        // Check if slot already exists
        let slot = await TimeSlot.findOne({
          where: {
            sub_field_id: subFieldId,
            date: formattedDate,
            start_time: startTime,
            end_time: endTime,
          },
          include: [
            {
              model: SubField,
              as: "subfield",
              attributes: ["field_id", "name"],
              required: true,
            },
            {
              model: Booking,
              as: "booking",
              attributes: ["id", "status", "payment_status"],
              required: false,
            },
          ],
        });

        if (slot) {
          // Check if slot is occupied by a booking (including pending payment)
          const isOccupied = 
            slot.status === "booked" || 
            (slot.booking_id && slot.booking && 
             (slot.booking.status === "payment_pending" || slot.booking.status === "confirmed"));

          if (isOccupied) {
            // Skip occupied slots (booked or pending payment)
            skippedBookedCount++;
          } else if (slot.status !== "maintenance") {
            // Only update if not already in maintenance and not occupied
            await slot.update({
              status: "maintenance",
              maintenance_reason: reason,
              maintenance_until: estimatedCompletion,
              updated_at: new Date(),
            });
            affectedSlots.push(slot);
            updatedCount++;
          } else {
            // Already in maintenance, skip but count
            skippedMaintenanceCount++;
          }
          // If already in maintenance, skip silently (no update needed)
        } else {
          // Create new slot for maintenance
          slot = await TimeSlot.create({
            sub_field_id: subFieldId,
            date: formattedDate,
            start_time: startTime,
            end_time: endTime,
            status: "maintenance",
            maintenance_reason: reason,
            maintenance_until: estimatedCompletion,
            booking_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Load the subfield relationship for socket emission
          await slot.reload({
            include: [
              {
                model: SubField,
                as: "subfield",
                attributes: ["field_id", "name"],
                required: true,
              },
            ],
          });

          affectedSlots.push(slot);
          createdCount++;
        }
      }
    }

    if (affectedSlots.length === 0) {
      return {
        affected: 0,
        slots: 0,
        skippedBooked: skippedBookedCount,
        skippedMaintenance: skippedMaintenanceCount,
        message: `Không có slot nào cần cập nhật.${
          skippedBookedCount > 0
            ? ` ${skippedBookedCount} slot đã được đặt.`
            : ""
        }${
          skippedMaintenanceCount > 0
            ? ` ${skippedMaintenanceCount} slot đã ở trạng thái bảo trì.`
            : ""
        }`,
      };
    }

    // Group affected slots by field_id for emitting realtime events
    if (io) {
      const fieldSlots = {};
      affectedSlots.forEach((slot) => {
        const fieldId = slot.subfield.field_id;
        if (!fieldSlots[fieldId]) {
          fieldSlots[fieldId] = [];
        }
        fieldSlots[fieldId].push({
          id: slot.id,
          subFieldId: slot.sub_field_id,
          subFieldName: slot.subfield.name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          status: "maintenance",
          maintenanceReason: reason,
          maintenanceUntil: estimatedCompletion,
        });
      });

      // Emit realtime updates to all clients viewing affected fields
      Object.keys(fieldSlots).forEach((fieldId) => {
        const formattedSlots = fieldSlots[fieldId].map((slot) => ({
          id: slot.id,
          subFieldId: slot.sub_field_id,
          subFieldName: slot.subFieldName || "Unknown",
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          status: "maintenance",
          maintenanceReason: reason,
          maintenanceUntil: estimatedCompletion,
        }));

        io.to(`field-${fieldId}`).emit("timeslot-maintenance-update", {
          type: "full-day-maintenance-added",
          fieldId,
          affectedSlots: formattedSlots,
          date: formattedDate,
          reason,
          estimatedCompletion,
          timestamp: new Date().toISOString(),
        });
      });
    }

    const totalSlotsInDay = endHour - 5; // Total slots from 5:00 to 23:00
    const skippedPastSlots = isToday ? (startHour - 5) * subFieldIds.length : 0;

    return {
      affected: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      skippedBooked: skippedBookedCount,
      skippedMaintenance: skippedMaintenanceCount,
      skippedPast: skippedPastSlots,
      slots: affectedSlots.length,
      totalPossibleSlots: (endHour - startHour) * subFieldIds.length,
      message:
        isToday && skippedPastSlots > 0
          ? `Đã đặt bảo trì cho ${
              subFieldIds.length
            } sân từ ${startHour}:00-${endHour}:00. Tạo mới: ${createdCount}, Cập nhật: ${updatedCount}. Bỏ qua ${skippedPastSlots} slot đã qua.${
              skippedBookedCount > 0
                ? ` Bỏ qua ${skippedBookedCount} slot đã đặt.`
                : ""
            }${
              skippedMaintenanceCount > 0
                ? ` Bỏ qua ${skippedMaintenanceCount} slot đã bảo trì.`
                : ""
            }`
          : `Đã đặt bảo trì cả ngày cho ${
              subFieldIds.length
            } sân. Tạo mới: ${createdCount}, Cập nhật: ${updatedCount}${
              skippedBookedCount > 0
                ? `, Bỏ qua (đã đặt): ${skippedBookedCount}`
                : ""
            }${
              skippedMaintenanceCount > 0
                ? `, Bỏ qua (đã bảo trì): ${skippedMaintenanceCount}`
                : ""
            }`,
    };
  } catch (error) {
    console.error("Error setting full day maintenance:", error);
    throw new Error("Không thể đặt bảo trì cả ngày: " + error.message);
  }
};

/**
 * Check for existing maintenance slots to avoid duplicates
 * @param {Array} subFieldIds - Array of sub field IDs
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:mm)
 * @param {string} endTime - End time (HH:mm)
 */
const checkExistingMaintenance = async (
  subFieldIds,
  date,
  startTime,
  endTime
) => {
  try {
    const formattedDate = formatDateForDB(date);
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);

    const existingMaintenanceSlots = [];

    for (const subFieldId of subFieldIds) {
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStartTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const slotEndTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;

        const existingSlot = await TimeSlot.findOne({
          where: {
            sub_field_id: subFieldId,
            date: formattedDate,
            start_time: slotStartTime,
            end_time: slotEndTime,
            status: "maintenance",
          },
          include: [
            {
              model: SubField,
              as: "subfield",
              attributes: ["name", "field_id"],
              required: true,
            },
          ],
        });

        if (existingSlot) {
          existingMaintenanceSlots.push({
            id: existingSlot.id,
            subFieldId: existingSlot.sub_field_id,
            subFieldName: existingSlot.subfield.name,
            date: existingSlot.date,
            startTime: existingSlot.start_time,
            endTime: existingSlot.end_time,
            reason: existingSlot.maintenance_reason,
            estimatedCompletion: existingSlot.maintenance_until,
          });
        }
      }
    }

    return {
      hasExisting: existingMaintenanceSlots.length > 0,
      count: existingMaintenanceSlots.length,
      slots: existingMaintenanceSlots,
    };
  } catch (error) {
    console.error("Error checking existing maintenance:", error);
    throw error;
  }
};

module.exports = {
  getSubFieldsByFieldId,
  getSubFieldPrice,
  calculatePriceWithPricingRule,
  setMaintenanceStatus,
  revertMaintenanceStatus,
  toggleMaintenanceStatus,
  getTimeSlotById,
  updateTimeSlot,
  setFullDayMaintenanceStatus,
  checkExistingMaintenance,
};
