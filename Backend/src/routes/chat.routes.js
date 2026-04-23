const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');

/**
 * @route POST /api/chats
 * @desc Tạo hoặc lấy chat giữa user hiện tại và user khác
 * @access Private (Authenticated users only)
 */
router.post('/', 
  [authMiddleware, validateRequest(schemas.createChat)], 
  chatController.createOrGetChat
);

/**
 * @route GET /api/chats
 * @desc Lấy danh sách tất cả chat của user hiện tại
 * @access Private (Authenticated users only)
 */
router.get('/', 
  authMiddleware, 
  chatController.getUserChats
);

/**
 * @route GET /api/chats/:chatId
 * @desc Lấy chi tiết một chat và tất cả tin nhắn
 * @access Private (Authenticated users only)
 */
router.get('/:chatId', 
  authMiddleware, 
  chatController.getChatDetail
);

/**
 * @route POST /api/chats/:chatId/messages
 * @desc Gửi tin nhắn trong chat
 * @access Private (Authenticated users only)
 */
router.post('/:chatId/messages', 
  [authMiddleware, validateRequest(schemas.sendMessage)], 
  chatController.sendMessage
);

/**
 * @route DELETE /api/chats/messages/:messageId
 * @desc Xóa một tin nhắn (chỉ người gửi mới có thể xóa)
 * @access Private (Authenticated users only)
 */
router.delete('/messages/:messageId', 
  authMiddleware, 
  chatController.deleteMessage
);

/**
 * @route PUT /api/chats/:chatId/read
 * @desc Đánh dấu tất cả tin nhắn trong chat là đã đọc
 * @access Private (Authenticated users only)
 */
router.put('/:chatId/read', 
  authMiddleware, 
  chatController.markMessagesAsRead
);

/**
 * @route GET /api/chats/unread/count
 * @desc Lấy tổng số tin nhắn chưa đọc của user
 * @access Private (Authenticated users only)
 */
router.get('/unread/count', 
  authMiddleware, 
  chatController.getUnreadMessagesCount
);

/**
 * @route GET /api/chats/unread/count-by-chat
 * @desc Lấy số tin nhắn chưa đọc theo từng chat
 * @access Private (Authenticated users only)
 */
router.get('/unread/count-by-chat', 
  authMiddleware, 
  chatController.getUnreadMessagesCountByChat
);

module.exports = router;
