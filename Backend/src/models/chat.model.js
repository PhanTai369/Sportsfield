const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Chat = sequelize.define('chat', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  user_id1: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id2: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Chat; 