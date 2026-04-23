const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Message = sequelize.define('message', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false
  },  content: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chat_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'update_at'
});

module.exports = Message; 