const express = require("express");
const timeSlotController = require("../controllers/timeslot.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");

const router = express.Router();

// API tìm time slot theo field, date và time
router.get(
  "/find",
  authMiddleware,
  timeSlotController.findTimeSlotByFieldDateTime
);

// API lấy sub fields của một field
router.get(
  "/field/:fieldId/subfields",
  authMiddleware,
  timeSlotController.getSubFieldsByFieldId
);

// API lấy thông tin time slot theo ID
router.get(
  "/:slotId",
  authMiddleware,
  timeSlotController.getTimeSlotById
);

// API cập nhật trạng thái time slot
router.patch(
  "/:slotId",
  authMiddleware,
  timeSlotController.updateTimeSlotStatus
);

// API tính giá cho time slot cụ thể
router.post(
  "/calculate-price",
  timeSlotController.calculateSlotPrice
);

module.exports = router;
