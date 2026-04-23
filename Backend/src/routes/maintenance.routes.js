const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// All maintenance routes require authentication
router.use(authMiddleware);

// Set maintenance status for multiple time slots (batch operation)
router.post('/timeslots/maintenance', maintenanceController.setMaintenance);

// Check for existing maintenance duplicates before setting
router.post('/timeslots/maintenance/check-duplicates', maintenanceController.checkMaintenanceDuplicates);

// Set maintenance status for full day (all time slots)
router.post('/timeslots/maintenance/full-day', maintenanceController.setFullDayMaintenance);

// Remove maintenance status from time slots
router.delete('/timeslots/maintenance', maintenanceController.removeMaintenance);

// Remove maintenance status from a single time slot
router.delete('/timeslots/:slotId/maintenance', maintenanceController.removeSingleMaintenance);

// Toggle maintenance status for a single time slot
router.patch('/timeslots/:slotId/maintenance', maintenanceController.toggleMaintenance);

// Get maintenance history for a field
router.get('/fields/:fieldId/maintenance/history', maintenanceController.getMaintenanceHistory);

// Remove maintenance by field, time, and date (fallback endpoint)
router.post('/remove-by-field-time', maintenanceController.removeMaintenanceByFieldTime);

module.exports = router;
