const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const BlacklistUser = sequelize.define('blacklist_user', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'blacklist_id'
  },
  reason: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = BlacklistUser; 