const { Review, Field, User, Booking, TimeSlot, SubField, ReviewReply } = require('../models');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const axios = require('axios');
const { moderateContent } = require('../services/gemini.service');
const { uploadImage } = require('../config/s3Config');
require('dotenv').config();


// Middleware multer nhận tối đa 3 ảnh
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Hàm upload buffer lên S3
const uploadToS3 = async (fileBuffer) => {
  const result = await uploadImage(fileBuffer, {
    folder: 'review-images',
    public_id: `review_${Date.now()}_${uuidv4()}`
  });

  return result.secure_url;
};

const createReview = async (req, res) => {
  try {
    await new Promise((resolve, reject) => upload.array('images', 3)(req, res, (err) => err ? reject(err) : resolve()));
    const { rating, comment } = req.body;
    const user_id = req.user?.id;
    const field_id = req.body.field_id;

    // Kiểm duyệt comment bằng Gemini service
    if (comment) {
      const isSafe = await moderateContent(comment);
      if (!isSafe) {
        return res.status(400).json({ success: false, message: 'Nội dung đánh giá chứa từ ngữ không phù hợp.' });
      }
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để gửi đánh giá.',
      });
    }
    if (!field_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp field_id và rating hợp lệ (từ 1 đến 5).',
      });
    }

    // Kiểm tra user có ít nhất 1 booking completed cho field này
    // Tự động cập nhật booking đã qua thời gian thành completed
    const BookingStatusService = require('../services/bookingStatusService');
    
    // Tìm các booking completed qua relationship (chính xác nhất)
    const completedBookings = await Booking.findAll({
      where: {
        user_id,
        status: 'completed',
      },
      include: [{
        model: TimeSlot,
        as: 'timeSlots',
        include: [{
          model: SubField,
          as: 'subfield',
          where: { field_id: field_id },
          required: true
        }],
        required: true
      }]
    });
    
    let hasCompleted = false;
    let booking_id = null;
    
    if (completedBookings.length > 0) {
      hasCompleted = true;
      booking_id = completedBookings[0].id;
    } else {
      // Nếu không có completed booking, kiểm tra booking confirmed đã qua thời gian
      const confirmedBookings = await Booking.findAll({
        where: {
          user_id,
          status: 'confirmed',
          payment_status: 'paid'
        },
        include: [{
          model: TimeSlot,
          as: 'timeSlots',
          include: [{
            model: SubField,
            as: 'subfield',
            where: { field_id: field_id },
            required: true
          }],
          required: true
        }]
      });
      
      // Kiểm tra và tự động cập nhật booking đã qua thời gian
      for (const booking of confirmedBookings) {
        const wasUpdated = await BookingStatusService.checkAndUpdateBookingToCompleted(booking.id);
        if (wasUpdated) {
          hasCompleted = true;
          booking_id = booking.id;
          break;
        }
      }
      
      // Fallback: kiểm tra qua metadata
      if (!hasCompleted) {
        const allCompletedBookings = await Booking.findAll({
          where: {
            user_id,
            status: 'completed',
          },
        });
        
        for (const booking of allCompletedBookings) {
          const metadataFieldId = booking.booking_metadata?.fieldId || 
                                 booking.booking_metadata?.field_id ||
                                 booking.booking_metadata?.fieldID;
                                 
          if (String(metadataFieldId) === String(field_id)) {
            hasCompleted = true;
            booking_id = booking.id;
            break;
          }
        }
      }
    }
    
    if (!hasCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ được đánh giá khi đã sử dụng dịch vụ tại sân này.',
      });
    }

    // Kiểm tra đã review field này chưa (1 lần cho mỗi user/field)
    const existingReview = await Review.findOne({
      where: {
        user_id,
        field_id,
      },
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chỉ được đánh giá 1 lần cho mỗi sân đã sử dụng.',
      });
    }

    // Kiểm tra sân tồn tại
    const field = await Field.findByPk(field_id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Sân bóng không tồn tại.',
      });
    }

    // Xử lý upload ảnh nếu có
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToS3(file.buffer);
        imageUrls.push(url);
      }
    }

    // Tạo review
    const review = await Review.create({
      id: uuidv4(),
      user_id,
      field_id,
      booking_id, // optional, for traceability
      rating,
      comment: comment || null,
      images: imageUrls,
      created_at: new Date(),
    });

    // Lấy thông tin review kèm user và field
    const reviewWithDetails = await Review.findOne({
      where: { id: review.id },
      include: [
        { model: User, attributes: ['id', 'name', 'profileImage'] },
        { model: Field, attributes: ['id', 'name'] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Đã tạo đánh giá thành công.',
      data: reviewWithDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đánh giá.',
      error: error.message,
    });
  }
};

const getReviewsByField = async (req, res) => {
  const { field_id } = req.params;
  const user_id = req.user?.id;

  try {
    const reviews = await Review.findAll({
      where: { field_id },
      include: [
        { model: User, attributes: ['id', 'name', 'profileImage'] },
        { model: Field, attributes: ['id', 'name'] },
        { 
          model: ReviewReply,
          as: 'reply',
          required: false,
          attributes: ['id', 'content', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']],
    });

    // Helper function to calculate time ago
    const getTimeAgo = (date) => {
      const now = new Date();
      const diff = now - new Date(date);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 60) {
        return `${minutes} phút trước`;
      } else if (hours < 24) {
        return `${hours} giờ trước`;
      } else if (days < 7) {
        return `${days} ngày trước`;
      } else {
        return new Date(date).toLocaleDateString('vi-VN');
      }
    };

    // Đảm bảo images luôn là array string và format reply
    const reviewsWithImages = reviews.map(r => {
      let images = r.images;
      if (!Array.isArray(images)) images = [];
      
      const reviewData = { ...r.toJSON(), images };
      
      // Format reply nếu có
      if (reviewData.reply) {
        reviewData.reply = {
          ...reviewData.reply,
          timeAgo: getTimeAgo(reviewData.reply.created_at)
        };
      }
      
      return reviewData;
    });

    // Kiểm tra xem người dùng đã đánh giá sân này chưa
    let canReview = false;
    let hasReviewed = false;
    
    if (user_id) {
      const existingReview = await Review.findOne({
        where: {
          user_id,
          field_id
        }
      });
      
      hasReviewed = !!existingReview;
      // Kiểm tra nếu người dùng có booking "completed" để cho phép đánh giá
      const completedBooking = await Booking.findOne({
        include: [{
          model: TimeSlot,
          include: [{
            model: SubField,
            where: { field_id }
          }]
        }],
        where: {
          user_id,
          status: 'completed'
        }
      });
      canReview = !hasReviewed && !!completedBooking;
    }

    if (!reviewsWithImages || reviewsWithImages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Chưa có đánh giá nào cho sân này',
        data: [],
        canReview,
        hasReviewed,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Danh sách đánh giá',
      data: reviewsWithImages,
      canReview,
      hasReviewed,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá',
      error: error.message,
      canReview: false,
      hasReviewed: false,
    });
  }
};

const getOwnerFieldsReviews = async (req, res) => {
  const owner_id = req.user?.id;

  try {
    // Lấy tất cả reviews của các sân thuộc về owner
    const reviews = await Review.findAll({
      include: [
        { 
          model: Field, 
          where: { owner_id },
          attributes: ['id', 'name'] 
        },
        { 
          model: User, 
          attributes: ['id', 'name', 'profileImage'] 
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Danh sách đánh giá của tất cả sân',
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá',
      error: error.message,
    });
  }
};

const updateReview = async (req, res) => {
  try {
    await new Promise((resolve, reject) => upload.array('images', 3)(req, res, (err) => err ? reject(err) : resolve()));
    const { field_id, rating, comment } = req.body;
    const user_id = req.user?.id;
    // Kiểm duyệt comment bằng Gemini service
    if (comment) {
      const isSafe = await moderateContent(comment);
      if (!isSafe) {
        return res.status(400).json({ success: false, message: 'Nội dung đánh giá chứa từ ngữ không phù hợp.' });
      }
    }
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập.' });
    }
    if (!field_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin hoặc rating không hợp lệ.' });
    }
    // Tìm review theo user_id và field_id
    const review = await Review.findOne({ where: { user_id, field_id } });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy review để cập nhật.' });
    }
    // Xử lý ảnh: chỉ giữ ảnh mới upload (frontend đã gửi lại file cũ dưới dạng file upload nếu muốn giữ)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToS3(file.buffer);
        imageUrls.push(url);
      }
    }
    await review.update({
      rating,
      comment: comment || null,
      images: imageUrls,
    });
    // Lấy lại review kèm user và field
    const reviewWithDetails = await Review.findOne({
      where: { id: review.id },
      include: [
        { model: User, attributes: ['id', 'name', 'profileImage'] },
        { model: Field, attributes: ['id', 'name'] },
      ],
    });
    return res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công.',
      data: reviewWithDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đánh giá.',
      error: error.message,
    });
  }
};

// Tạo hoặc cập nhật review cho sân từ booking (dựa vào fieldId của booking)
const upsertReviewByBooking = async (req, res) => {
  try {
    await new Promise((resolve, reject) => upload.array('images', 3)(req, res, (err) => err ? reject(err) : resolve()));
    const { rating, comment, booking_id } = req.body;
    const user_id = req.user?.id;
    // Lấy booking để lấy fieldId
    const booking = await Booking.findOne({ where: { id: booking_id, user_id } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
    }
    const field_id = booking.booking_metadata?.fieldId || booking.field_id;
    if (!field_id) {
      return res.status(400).json({ success: false, message: 'Booking không có fieldId.' });
    }
    // Kiểm duyệt comment bằng Gemini service
    if (comment) {
      const isSafe = await moderateContent(comment);
      if (!isSafe) {
        return res.status(400).json({ success: false, message: 'Nội dung đánh giá chứa từ ngữ không phù hợp.' });
      }
    }
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập.' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating không hợp lệ.' });
    }
    // Kiểm tra đã có review chưa
    let review = await Review.findOne({ where: { user_id, field_id } });
    // Xử lý upload ảnh nếu có
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToS3(file.buffer);
        imageUrls.push(url);
      }
    }
    if (review) {
      // Nếu không upload ảnh mới, giữ nguyên ảnh cũ
      if (imageUrls.length === 0) {
        imageUrls = review.images || [];
      }
      await review.update({ rating, comment: comment || null, images: imageUrls });
      const reviewWithDetails = await Review.findOne({
        where: { id: review.id },
        include: [
          { model: User, attributes: ['id', 'name', 'profileImage'] },
          { model: Field, attributes: ['id', 'name'] },
        ],
      });
      return res.status(200).json({ success: true, message: 'Cập nhật đánh giá thành công.', data: reviewWithDetails });
    } else {
      // Tạo review mới
      const newReview = await Review.create({
        id: uuidv4(),
        user_id,
        field_id,
        booking_id,
        rating,
        comment: comment || null,
        images: imageUrls,
        created_at: new Date(),
      });
      const reviewWithDetails = await Review.findOne({
        where: { id: newReview.id },
        include: [
          { model: User, attributes: ['id', 'name', 'profileImage'] },
          { model: Field, attributes: ['id', 'name'] },
        ],
      });
      return res.status(201).json({ success: true, message: 'Đã tạo đánh giá thành công.', data: reviewWithDetails });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo/cập nhật đánh giá.', error: error.message });
  }
};

// Lấy review theo booking_id
const getReviewByBooking = async (req, res) => {
  try {
    const { booking_id } = req.query;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập.' });
    }

    if (!booking_id) {
      return res.status(400).json({ success: false, message: 'Thiếu booking_id.' });
    }

    // Lấy booking để lấy fieldId
    const booking = await Booking.findOne({ where: { id: booking_id, user_id } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
    }

    const field_id = booking.booking_metadata?.fieldId || booking.field_id;
    if (!field_id) {
      return res.status(400).json({ success: false, message: 'Booking không có fieldId.' });
    }

    // Tìm review của user cho field này
    const review = await Review.findOne({
      where: { user_id, field_id },
      include: [
        { model: User, attributes: ['id', 'name', 'profileImage'] },
        { model: Field, attributes: ['id', 'name'] },
      ],
    });

    if (!review) {
      return res.status(404).json({ success: false, message: 'Chưa có đánh giá cho booking này.' });
    }

    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error getting review by booking:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá.', error: error.message });
  }
};

module.exports = {
  createReview,
  getReviewsByField,
  updateReview,
  upsertReviewByBooking,
  getReviewByBooking,
};
