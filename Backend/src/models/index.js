const User = require('./user.model');
const Field = require('./field.model');
const SubField = require('./subfield.model');
const Location = require('./location.model');
const Booking = require('./booking.model');
const Payment = require('./payment.model');
const TimeSlot = require('./timeslot.model');
const Promotion = require('./promotion.model');
const Review = require('./review.model');
const ReviewReply = require('./review_reply.model');
const Favorite = require('./favorite.model');
const Notification = require('./notification.model');
const BlacklistUser = require('./blacklist_user.model');
const Chat = require('./chat.model');
const Message = require('./message.model');
const FieldPricingRule = require('./field_pricing_rule.model');
const { sequelize, testDbConnection } = require('../config/db.config');

// Define relationships
// User relationships
User.hasMany(Field, { foreignKey: 'owner_id', as: 'ownedFields' });
Field.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

User.hasMany(Booking, { foreignKey: 'user_id' });
Booking.belongsTo(User, { foreignKey: 'user_id', required: false }); // Allow null for guest bookings, or stores owner_id for owner bookings

User.hasMany(Review, { foreignKey: 'user_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });

// Review-ReviewReply relationship
Review.hasOne(ReviewReply, { foreignKey: 'reviewId', as: 'reply' });
ReviewReply.belongsTo(Review, { foreignKey: 'reviewId', as: 'review' });

User.hasMany(Favorite, { foreignKey: 'user_id' });
Favorite.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// BlacklistUser relationship with User
User.hasMany(BlacklistUser, { foreignKey: 'blacklist_id' });
BlacklistUser.belongsTo(User, { foreignKey: 'blacklist_id', as: 'blacklistedUser' });

// Chat relationship with User
User.hasMany(Chat, { foreignKey: 'user_id1', as: 'chatsAsUser1' });
User.hasMany(Chat, { foreignKey: 'user_id2', as: 'chatsAsUser2' });
Chat.belongsTo(User, { foreignKey: 'user_id1', as: 'user1' });
Chat.belongsTo(User, { foreignKey: 'user_id2', as: 'user2' });

// Message relationship with User
User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

// Field relationships
Field.hasMany(SubField, { foreignKey: 'field_id', as: 'subfields' });
SubField.belongsTo(Field, { foreignKey: 'field_id', as: 'field' });

Field.hasMany(Review, { foreignKey: 'field_id' });
Review.belongsTo(Field, { foreignKey: 'field_id' });

Field.hasMany(Favorite, { foreignKey: 'field_id' });
Favorite.belongsTo(Field, { foreignKey: 'field_id' });

Field.hasMany(Promotion, { foreignKey: 'field_id' });
Promotion.belongsTo(Field, { foreignKey: 'field_id' });

Field.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });
Location.hasMany(Field, { foreignKey: 'location_id', as: 'fields' });

// Field pricing rule relationships
Field.hasMany(FieldPricingRule, { foreignKey: 'field_id', as: 'pricingRules' });
FieldPricingRule.belongsTo(Field, { foreignKey: 'field_id', as: 'field' });

// Booking relationships
Booking.hasMany(TimeSlot, { foreignKey: 'booking_id', as: 'timeSlots' });
TimeSlot.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// SubField relationships (TimeSlot associations)  
SubField.hasMany(TimeSlot, { foreignKey: 'sub_field_id', as: 'timeSlots' });
TimeSlot.belongsTo(SubField, { foreignKey: 'sub_field_id', as: 'subfield' });

// Payment relationships
Booking.hasOne(Payment, { foreignKey: 'booking_id', as: 'payment' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Chat and Message relationships
Chat.hasMany(Message, { foreignKey: 'chat_id' });
Message.belongsTo(Chat, { foreignKey: 'chat_id' });

// Function to sync all models with the database
const syncModels = async () => {
  try {
    const forceSync = process.env.DB_FORCE_SYNC === 'true';
    await sequelize.sync({ force: forceSync });
    console.log(`All models were synchronized successfully. Force sync: ${forceSync}`);
  } catch (error) {
    console.error('Failed to sync models:', error);
  }
};

module.exports = {
  User,
  Field,
  SubField,
  Location,
  Booking,
  Payment,
  TimeSlot,
  Promotion,
  Review,
  ReviewReply,
  Favorite,
  Notification,
  BlacklistUser,
  Chat,
  Message,
  FieldPricingRule,
  sequelize,
  testDbConnection,
  syncModels
};