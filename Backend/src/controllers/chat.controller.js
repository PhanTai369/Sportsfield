const { apiResponse, errorHandler, constants } = require("../common");
const { chatService } = require("../services");
const {
  emitNewMessage,
  emitMessageDeleted,
  emitNewChat,
  emitMessagesRead,
} = require("../config/socket.config");

const { asyncHandler } = errorHandler;
const { successResponse, errorResponse, notFoundResponse } = apiResponse;
const { HTTP_STATUS } = constants;

//Tạo hoặc lấy chat giữa hai user (customer và owner)

const createOrGetChat = asyncHandler(async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user.id;

    const chat = await chatService.findOrCreateChat(currentUserId, otherUserId);

    const isNew = chat.created_at === chat.updated_at;
    const message = isNew ? "Chat đã được tạo thành công" : "Chat đã tồn tại";
    const statusCode = isNew ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;    // Emit new chat to both users if it's newly created
    if (isNew) {
      // Format chat for both users
      const formattedChatForUser1 = chatService.formatChatForList(chat, currentUserId, 0);
      const formattedChatForUser2 = chatService.formatChatForList(chat, otherUserId, 0);
      
      // Emit formatted chat to each user
      emitNewChat([currentUserId], formattedChatForUser1);
      emitNewChat([otherUserId], formattedChatForUser2);
    }

    return successResponse(res, message, chat, statusCode);
  } catch (error) {
    console.error("Error in createOrGetChat:", error);
    return errorResponse(
      res,
      error.message || "Lỗi khi tạo chat",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Lấy danh sách tất cả chat của user hiện tại

const getUserChats = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const chats = await chatService.getUserChats(currentUserId);

    return successResponse(res, "Danh sách chat", chats, HTTP_STATUS.OK);
  } catch (error) {
    console.error("Error in getUserChats:", error);
    return errorResponse(
      res,
      error.message || "Lỗi khi lấy danh sách chat",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Lấy chi tiết một chat và tất cả tin nhắn

const getChatDetail = asyncHandler(async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;

    const chatDetail = await chatService.getChatDetail(chatId, currentUserId);

    // Thêm currentUserId vào response để frontend sử dụng
    const responseData = {
      ...chatDetail,
      currentUserId: currentUserId
    };

    return successResponse(res, "Chi tiết chat", responseData, HTTP_STATUS.OK);
  } catch (error) {
    console.error("Error in getChatDetail:", error);

    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }

    return errorResponse(
      res,
      error.message || "Lỗi khi lấy chi tiết chat",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Gửi tin nhắn trong chat

const sendMessage = asyncHandler(async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.id;

    const message = await chatService.sendMessage(
      chatId,
      currentUserId,
      content
    );

    // Emit new message to chat participants via Socket.IO
    emitNewMessage(chatId, message);

    return successResponse(
      res,
      "Tin nhắn đã được gửi",
      message,
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error("Error in sendMessage:", error);

    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }

    return errorResponse(
      res,
      error.message || "Lỗi khi gửi tin nhắn",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Xóa một tin nhắn (chỉ người gửi mới có thể xóa)
const deleteMessage = asyncHandler(async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    // Get message to get chat ID before deletion
    const messageInfo = await chatService.getMessageInfo(messageId);

    await chatService.deleteMessage(messageId, currentUserId);

    // Emit message deleted to chat participants
    emitMessageDeleted(messageInfo.chatId, messageId);

    return successResponse(res, "Tin nhắn đã được xóa", null, HTTP_STATUS.OK);
  } catch (error) {
    console.error("Error in deleteMessage:", error);

    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }

    if (error.statusCode === HTTP_STATUS.FORBIDDEN) {
      return errorResponse(res, error.message, HTTP_STATUS.FORBIDDEN);
    }

    return errorResponse(
      res,
      error.message || "Lỗi khi xóa tin nhắn",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Đánh dấu tất cả tin nhắn trong chat là đã đọc
const markMessagesAsRead = asyncHandler(async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.id;

    const result = await chatService.markMessagesAsRead(chatId, currentUserId);

    // Emit socket event to notify other participants
    if (result && result.chatParticipants) {
      emitMessagesRead(chatId, result.chatParticipants, {
        userId: currentUserId,
        readAt: new Date()
      });
    }

    return successResponse(
      res,
      "Đã đánh dấu tất cả tin nhắn là đã đọc",
      null,
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);

    if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
      return notFoundResponse(res, error.message);
    }

    if (error.statusCode === HTTP_STATUS.FORBIDDEN) {
      return errorResponse(res, error.message, HTTP_STATUS.FORBIDDEN);
    }

    return errorResponse(
      res,
      error.message || "Lỗi khi đánh dấu tin nhắn đã đọc",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Lấy tổng số tin nhắn chưa đọc của user
const getUnreadMessagesCount = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const count = await chatService.getUnreadMessagesCount(currentUserId);

    return successResponse(
      res,
      "Số lượng tin nhắn chưa đọc",
      { unreadCount: count },
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    return errorResponse(
      res,
      error.message || "Lỗi khi lấy số lượng tin nhắn chưa đọc",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

//Lấy số tin nhắn chưa đọc theo từng chat
const getUnreadMessagesCountByChat = asyncHandler(async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const unreadCounts = await chatService.getUnreadMessagesCountByChat(currentUserId);

    return successResponse(
      res,
      "Số lượng tin nhắn chưa đọc theo chat",
      unreadCounts,
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error("Error in getUnreadMessagesCountByChat:", error);
    return errorResponse(
      res,
      error.message || "Lỗi khi lấy số lượng tin nhắn chưa đọc theo chat",
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

module.exports = {
  createOrGetChat,
  getUserChats,
  getChatDetail,
  sendMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadMessagesCount,
  getUnreadMessagesCountByChat,
};
