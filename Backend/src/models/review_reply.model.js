const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const ReviewReply = sequelize.define('ReviewReply', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  reviewId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'review_id',
    references: {
      model: 'reviews',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 1000] // Giới hạn độ dài phản hồi
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at'
  }
}, {
  tableName: 'review_replies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['review_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = ReviewReply;
