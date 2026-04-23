const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Public routes
router.get('/field/:fieldId/availability', bookingController.getFieldAvailability);
router.get('/field/:fieldId/availability-with-pricing', bookingController.getFieldAvailabilityWithPricing);
router.post('/test-email-public', bookingController.testEmail); // Public test email endpoint

// Protected routes (require authentication) - specific routes first to avoid conflicts
router.get('/user', authMiddleware, bookingController.getUserBookings);
router.get('/stats', authMiddleware, bookingController.getBookingStats);
router.post('/test-email', authMiddleware, bookingController.testEmail); // Test email endpoint
router.post('/cancel-for-maintenance', authMiddleware, bookingController.cancelBookingForMaintenance); // Cancel booking for maintenance
router.post('/cancel-multiple-for-maintenance', authMiddleware, bookingController.cancelMultipleBookingsForMaintenance); // Cancel multiple bookings for maintenance
router.post('/owner-booking', authMiddleware, bookingController.createOwnerBooking); // Create owner booking
router.post('/', authMiddleware, bookingController.createBooking);
router.get('/:id', authMiddleware, bookingController.getBookingById); 
router.post('/:id/payment', authMiddleware, bookingController.processPayment);
router.post('/:id/cancel', authMiddleware, bookingController.cancelBooking);

module.exports = router;
