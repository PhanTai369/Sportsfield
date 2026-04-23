const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Promotion = sequelize.define('promotion', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  discount_percent: {
    type: DataTypes.INTEGER
  },
  valid_from: {
    type: DataTypes.DATE,
    allowNull: false
  },
  valid_to: {
    type: DataTypes.DATE,
    allowNull: false
  },
  field_id: {
    type: DataTypes.UUID
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Promotion; 