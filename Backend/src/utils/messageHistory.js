/**
 * Message history service for chat functionality
 * Handles database operations for chat messages
 */
const { Message, User } = require('../models');
const { Op } = require('sequelize');

class MessageHistoryManager {
  constructor(maxMessagesPerRoom = 50) {
    this.history = new Map();
    this.maxMessagesPerRoom = maxMessagesPerRoom;
  }

  /**
   * Add message to room history
   * @param {string} roomName - Room identifier
   * @param {object} message - Message object
   */
  addMessage(roomName, message) {
    if (!this.history.has(roomName)) {
      this.history.set(roomName, []);
    }
    
    const roomHistory = this.history.get(roomName);
    
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = new Date();
    }
    
    // Add to history
    roomHistory.push(message);
    
    // Trim history if necessary
    if (roomHistory.length > this.maxMessagesPerRoom) {
      roomHistory.shift();
    }
    
    return roomHistory.length;
  }

  /**
   * Get message history for a room
   * @param {string} roomName - Room identifier
   * @param {number} limit - Maximum number of messages to return
   * @returns {Array} Array of messages
   */
  getHistory(roomName, limit = this.maxMessagesPerRoom) {
    const roomHistory = this.history.get(roomName) || [];
    
    if (limit && limit < roomHistory.length) {
      return roomHistory.slice(-limit);
    }
    
    return [...roomHistory];
  }

  /**
   * Clear history for a room
   * @param {string} roomName - Room identifier
   */
  clearHistory(roomName) {
    this.history.delete(roomName);
  }

  /**
   * Get all message history
   * @returns {Map} Map of all message history
   */
  getAllHistory() {
    return this.history;
  }
  
  /**
   * Save booking status update message
   * @param {string} bookingId - Booking ID
   * @param {object} statusData - Status data
   */
  saveBookingStatusUpdate(bookingId, statusData) {
    const roomName = `booking:${bookingId}`;
    
    const message = {
      type: 'status_update',
      bookingId,
      ...statusData,
      timestamp: new Date()
    };
    
    return this.addMessage(roomName, message);
  }
  
  /**
   * Get booking status history
   * @param {string} bookingId - Booking ID
   * @returns {Array} Array of status updates
   */
  getBookingStatusHistory(bookingId) {
    const roomName = `booking:${bookingId}`;
    return this.getHistory(roomName);
  }

  /**
   * Get recent messages from database for a chat
   * @param {string} chatId - Chat ID
   * @param {number} limit - Number of messages to fetch
   * @returns {Array} Array of messages
   */
  async getRecentMessages(chatId, limit = 50) {
    try {
      const messages = await Message.findAll({
        where: { chat_id: chatId },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'profileImage']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        raw: false
      });

      return messages.reverse().map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        is_read: msg.is_read,
        sender: msg.sender ? {
          id: msg.sender.id,
          name: msg.sender.name,
          profileImage: msg.sender.profileImage
        } : null
      }));
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Mark messages as read for a user in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {number} Number of messages marked as read
   */
  async markMessagesAsRead(chatId, userId) {
    try {
      const [updatedCount] = await Message.update(
        { is_read: true },
        {
          where: {
            chat_id: chatId,
            sender_id: { [Op.ne]: userId }, // Don't mark own messages as read
            is_read: false
          }
        }
      );

      return updatedCount;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return 0;
    }
  }

  /**
   * Get unread message count for a user in a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {number} Number of unread messages
   */
  async getUnreadCount(chatId, userId) {
    try {
      const count = await Message.count({
        where: {
          chat_id: chatId,
          sender_id: { [Op.ne]: userId }, // Don't count own messages
          is_read: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get messages with pagination
   * @param {string} chatId - Chat ID
   * @param {number} page - Page number
   * @param {number} limit - Messages per page
   * @param {string} beforeMessageId - Load messages before this message ID
   * @returns {object} Paginated messages result
   */
  async getMessagesWithPagination(chatId, page = 1, limit = 20, beforeMessageId = null) {
    try {
      const whereCondition = { chat_id: chatId };
      
      if (beforeMessageId) {
        const beforeMessage = await Message.findByPk(beforeMessageId);
        if (beforeMessage) {
          whereCondition.created_at = { [Op.lt]: beforeMessage.created_at };
        }
      }

      const offset = (page - 1) * limit;
      
      const { count, rows: messages } = await Message.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'profileImage']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset,
        raw: false
      });

      const formattedMessages = messages.reverse().map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        is_read: msg.is_read,
        sender: msg.sender ? {
          id: msg.sender.id,
          name: msg.sender.name,
          profileImage: msg.sender.profileImage
        } : null
      }));

      return {
        messages: formattedMessages,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        hasMore: offset + messages.length < count
      };
    } catch (error) {
      console.error('Error getting messages with pagination:', error);
      return {
        messages: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasMore: false
      };
    }
  }
}

module.exports = new MessageHistoryManager();
