const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Lấy danh sách notification của user
router.get('/', authMiddleware, notificationController.getUserNotifications);

// Lấy số lượng notification chưa đọc
router.get('/unread/count', authMiddleware, notificationController.getUnreadNotificationCount);

// Đánh dấu notification đã đọc
router.put('/:notificationId/read', authMiddleware, notificationController.markNotificationAsRead);

// Route test để tạo notification mới (chỉ dùng cho testing)
router.post('/test', authMiddleware, notificationController.createTestNotification);

module.exports = router;
