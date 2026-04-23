/**
 * Room Manager for WebSocket communication
 * Manages booking room subscriptions and notifications
 */

const { Chat, User } = require('../models');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.bookingSubscribers = new Map();
  }

  /**
   * Subscribe user to a booking room
   * @param {string} userId - User ID
   * @param {string} bookingId - Booking ID
   * @param {object} socket - Socket instance
   */
  subscribeToBooking(userId, bookingId, socket) {
    const roomName = `booking:${bookingId}`;
    socket.join(roomName);
    
    if (!this.bookingSubscribers.has(bookingId)) {
      this.bookingSubscribers.set(bookingId, new Map());
    }
    
    this.bookingSubscribers.get(bookingId).set(userId, {
      socketId: socket.id,
      subscribedAt: new Date()
    });
    
    console.log(`User ${userId} subscribed to booking ${bookingId}`);
    return roomName;
  }

  /**
   * Unsubscribe user from a booking room
   * @param {string} userId - User ID
   * @param {string} bookingId - Booking ID
   * @param {object} socket - Socket instance
   */
  unsubscribeFromBooking(userId, bookingId, socket) {
    const roomName = `booking:${bookingId}`;
    socket.leave(roomName);
    
    if (this.bookingSubscribers.has(bookingId)) {
      this.bookingSubscribers.get(bookingId).delete(userId);
      
      if (this.bookingSubscribers.get(bookingId).size === 0) {
        this.bookingSubscribers.delete(bookingId);
      }
    }
    
    console.log(`User ${userId} unsubscribed from booking ${bookingId}`);
  }

  /**
   * Get all subscribers for a booking
   * @param {string} bookingId - Booking ID
   * @returns {Map} Map of subscribers
   */
  getBookingSubscribers(bookingId) {
    return this.bookingSubscribers.get(bookingId) || new Map();
  }

  /**
   * Check if a user is subscribed to a booking
   * @param {string} userId - User ID
   * @param {string} bookingId - Booking ID
   * @returns {boolean} True if subscribed
   */
  isSubscribed(userId, bookingId) {
    return this.bookingSubscribers.has(bookingId) && 
           this.bookingSubscribers.get(bookingId).has(userId);
  }

  /**
   * Create or get chat room
   * @param {string} roomName - Room identifier
   * @returns {object} Room object
   */
  createOrGetRoom(roomName) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        name: roomName,
        users: new Set(),
        createdAt: new Date()
      });
    }
    
    return this.rooms.get(roomName);
  }

  /**
   * Add user to room
   * @param {string} roomName - Room identifier
   * @param {string} userId - User ID
   */
  addUserToRoom(roomName, userId) {
    const room = this.createOrGetRoom(roomName);
    room.users.add(userId);
    return room;
  }

  /**
   * Remove user from room
   * @param {string} roomName - Room identifier
   * @param {string} userId - User ID
   */
  removeUserFromRoom(roomName, userId) {
    if (this.rooms.has(roomName)) {
      const room = this.rooms.get(roomName);
      room.users.delete(userId);
      
      if (room.users.size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  /**
   * Get all rooms
   * @returns {Map} Map of all rooms
   */
  getAllRooms() {
    return this.rooms;
  }
  
  /**
   * Get chat by ID
   * @param {string} chatId - Chat ID
   * @returns {object|null} Chat object or null
   */
  async getChat(chatId) {
    try {
      const chat = await Chat.findByPk(chatId);
      return chat;
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  }

  /**
   * Get chat participants
   * @param {string} chatId - Chat ID
   * @returns {Array} Array of participant user objects
   */
  async getChatParticipants(chatId) {
    try {
      const chat = await Chat.findByPk(chatId, {
        include: [
          {
            model: User,
            as: 'user1',
            attributes: ['id', 'name', 'email', 'profileImage']
          },
          {
            model: User,
            as: 'user2',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      });

      if (!chat) {
        return [];
      }

      const participants = [];
      if (chat.user1) participants.push(chat.user1);
      if (chat.user2) participants.push(chat.user2);

      return participants;
    } catch (error) {
      console.error('Error getting chat participants:', error);
      return [];
    }
  }

  /**
   * Check if a user can join a chat
   * @param {string} userId - User ID
   * @param {string} chatId - Chat ID
   * @returns {boolean} True if user can join
   */
  async canUserJoinChat(userId, chatId) {
    try {
      // For booking chats, check if the user owns the booking or field
      if (chatId.startsWith('booking_')) {
        const bookingId = chatId.split('_')[1];
        const { Booking, Field } = require('../models');
        
        // Check if user is booking owner
        const booking = await Booking.findByPk(bookingId);
        if (booking && booking.user_id === userId) {
          return true;
        }
        
        // Check if user is field owner
        if (booking) {
          const field = await Field.findByPk(booking.booking_metadata.fieldId);
          if (field && field.owner_id === userId) {
            return true;
          }
        }
        
        return false;
      }
      
      // For regular chats, check if user is a participant
      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        return false;
      }

      return chat.user_id1 === userId || chat.user_id2 === userId;
    } catch (error) {
      console.error('Error checking chat permissions:', error);
      return false;
    }
  }
}

module.exports = new RoomManager();
