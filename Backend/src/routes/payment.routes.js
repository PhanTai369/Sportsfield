const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Middleware for optional authentication
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    return authMiddleware(req, res, next);
  }
  next();
};

// Create booking and payment intent together
router.post('/create-booking-payment', 
  authMiddleware, 
  PaymentController.createBookingWithPayment.bind(PaymentController)
);

// Create payment intent for existing booking
router.post('/create-intent', optionalAuth, PaymentController.createPaymentIntent.bind(PaymentController));

// Continue payment for existing booking
router.post('/continue-payment/:bookingId', optionalAuth, PaymentController.continuePaymentForBooking.bind(PaymentController));

// Confirm payment
router.post('/confirm', PaymentController.confirmPayment.bind(PaymentController));

// Get payment details
router.get('/:payment_id', PaymentController.getPaymentDetails.bind(PaymentController));

// Get payment methods
router.get('/methods/list', PaymentController.getPaymentMethods.bind(PaymentController));

// Create refund (admin only)
router.post('/:payment_id/refund', authMiddleware, PaymentController.createRefund.bind(PaymentController));

// Webhook endpoint (no auth required, Stripe signature verification instead)
router.post('/webhook', PaymentController.handleWebhook.bind(PaymentController));

// Get booking details by session ID (for success page)
router.get('/session/:sessionId/booking', PaymentController.getBookingBySessionId.bind(PaymentController));

// Get booking details by booking ID
router.get('/booking/:bookingId', PaymentController.getBookingById.bind(PaymentController));

// Sync payment status for a booking
router.post('/booking/:bookingId/sync', PaymentController.syncPaymentStatus.bind(PaymentController));

// Create payment intent for package purchase
router.post('/create-package-payment', authMiddleware, PaymentController.createPackagePayment.bind(PaymentController));

// Get package status for current user
router.get('/package-status', authMiddleware, PaymentController.getPackageStatus.bind(PaymentController));

// ===== ROUTES MỚI CHO PACKAGE STATS =====
// Lấy thống kê package của user hiện tại
router.get('/package/stats', authMiddleware, PaymentController.getPackageStats.bind(PaymentController));

module.exports = router;
