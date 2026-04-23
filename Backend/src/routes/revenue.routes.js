const express = require('express');
const revenueController = require('../controllers/revenue.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route GET /api/revenue/dashboard
 * @desc Get all revenue data for dashboard
 * @access Private (Owner only)
 */
router.get('/dashboard', authMiddleware, revenueController.getDashboardData);

/**
 * @route GET /api/revenue/dashboard-stats
 * @desc Get dashboard statistics
 * @access Private (Owner only)
 */
router.get('/dashboard-stats', authMiddleware, revenueController.getDashboardStats);

/**
 * @route GET /api/revenue/field-revenue
 * @desc Get revenue by field
 * @access Private (Owner only)
 */
router.get('/field-revenue', authMiddleware, revenueController.getFieldRevenue);

/**
 * @route GET /api/revenue/monthly-revenue
 * @desc Get monthly revenue data
 * @access Private (Owner only)
 */
router.get('/monthly-revenue', authMiddleware, revenueController.getMonthlyRevenue);

/**
 * @route GET /api/revenue/recent-bookings
 * @desc Get recent bookings for owner
 * @access Private (Owner only)
 */
router.get('/recent-bookings', authMiddleware, revenueController.getRecentBookings);

/**
 * @route GET /api/revenue/popular-timeslots
 * @desc Get popular time slots for owner
 * @access Private (Owner only)
 */
router.get('/popular-timeslots', authMiddleware, revenueController.getPopularTimeSlots);

/**
 * @route GET /api/revenue/recent-reviews
 * @desc Get recent reviews for owner fields
 * @access Private (Owner only)
 */
router.get('/recent-reviews', authMiddleware, revenueController.getRecentReviews);

/**
 * @route GET /api/revenue/reviews-detailed
 * @desc Get detailed reviews with pagination and filtering
 * @access Private (Owner only)
 */
router.get('/reviews-detailed', authMiddleware, revenueController.getReviewsWithPagination);

/**
 * @route POST /api/revenue/reviews/:reviewId/reply
 * @desc Reply to a review
 * @access Private (Owner only)
 */
router.post('/reviews/:reviewId/reply', authMiddleware, revenueController.replyToReview);

/**
 * @route PUT /api/revenue/reviews/:reviewId/reply/:replyId
 * @desc Update a reply to a review
 * @access Private (Owner only)
 */
router.put('/reviews/:reviewId/reply/:replyId', authMiddleware, revenueController.updateReply);

/**
 * @route DELETE /api/revenue/reviews/:reviewId/reply/:replyId
 * @desc Delete a reply to a review
 * @access Private (Owner only)
 */
router.delete('/reviews/:reviewId/reply/:replyId', authMiddleware, revenueController.deleteReply);

/**
 * @route GET /api/revenue/owner-bookings
 * @desc Get owner bookings with pagination and filters
 * @access Private (Owner only)
 */
router.get('/owner-bookings', authMiddleware, revenueController.getOwnerBookings);

/**
 * @route GET /api/revenue/owner-booking-stats
 * @desc Get owner booking statistics
 * @access Private (Owner only)
 */
router.get('/owner-booking-stats', authMiddleware, revenueController.getOwnerBookingStatsEndpoint);

/**
 * @route GET /api/revenue/detailed-reports
 * @desc Get detailed reports data for owner
 * @access Private (Owner only)
 */
router.get('/detailed-reports', authMiddleware, revenueController.getDetailedReports);

module.exports = router;
