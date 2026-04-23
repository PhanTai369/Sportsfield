const { notificationService } = require('../services');
const { apiResponse, errorHandler, constants } = require("../common");
const { asyncHandler } = errorHandler;
const { successResponse, errorResponse } = apiResponse;
const { HTTP_STATUS } = constants;

// Lấy danh sách notification của user
const getUserNotifications = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const notifications = await notificationService.getUserNotifications(currentUserId);
    return successResponse(res, "Danh sách thông báo", notifications, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi khi lấy thông báo", error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Lấy số lượng notification chưa đọc
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const count = await notificationService.getUnreadNotificationCount(currentUserId);
    return successResponse(res, "Số lượng thông báo chưa đọc", { count }, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi khi lấy số lượng thông báo", error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Đánh dấu notification đã đọc
const markNotificationAsRead = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { notificationId } = req.params;
    const notification = await notificationService.markAsRead(notificationId, currentUserId);
    return successResponse(res, "Đã đánh dấu đã đọc", notification, HTTP_STATUS.OK);
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi khi cập nhật thông báo", error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Tạo notification test (chỉ dùng cho testing)
const createTestNotification = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { title, message } = req.body;
    const notification = await notificationService.createNotification(
      currentUserId, 
      title || "Test Notification", 
      message || "This is a test notification"
    );
    return successResponse(res, "Tạo thông báo test thành công", notification, HTTP_STATUS.CREATED);
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi khi tạo thông báo test", error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

module.exports = {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  createTestNotification,
};
