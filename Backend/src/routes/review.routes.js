const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  createReview,
  getReviewsByField,
  updateReview,
  upsertReviewByBooking,
  getReviewByBooking
} = require('../controllers/review.controller');

// Tạo đánh giá mới
router.post('/create', authMiddleware, createReview);

// Lấy danh sách đánh giá theo sân
router.get('/field/:field_id', getReviewsByField);

// Cập nhật đánh giá
router.put('/update', authMiddleware, updateReview);

// Lấy review theo booking
router.get('/by-booking', authMiddleware, getReviewByBooking);

// Tạo hoặc cập nhật review theo booking
router.post('/by-booking', authMiddleware, upsertReviewByBooking);

module.exports = router;