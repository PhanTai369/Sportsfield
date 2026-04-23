const { Notification, User } = require('../models');
const { errorHandler } = require('../common');
const { NotFoundError } = errorHandler;

class NotificationService {
  /**
   * Tạo notification mới
   * @param {string} userId - Người nhận thông báo
   * @param {string} title
   * @param {string} message
   * @returns {Promise<Notification>}
   */
  async createNotification(userId, title, message) {
    return Notification.create({ user_id: userId, title, message });
  }

  /**
   * Lấy danh sách notification của user
   * @param {string} userId
   * @returns {Promise<Array<Notification>>}
   */
  async getUserNotifications(userId) {
    return Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Đánh dấu notification đã đọc
   * @param {string} notificationId
   * @param {string} userId
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    notification.is_read = true;
    await notification.save();
    return notification;
  }

  /**
   * Lấy số lượng notification chưa đọc
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUnreadNotificationCount(userId) {
    return Notification.count({
      where: { 
        user_id: userId, 
        is_read: false 
      },
    });
  }
}

module.exports = new NotificationService();
