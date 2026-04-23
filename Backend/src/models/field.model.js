const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Field = sequelize.define('field', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  price_per_hour: {
    type: DataTypes.DECIMAL(10, 2)
  },
  images1: {
    type: DataTypes.TEXT
  },
  images2: {
    type: DataTypes.TEXT
  },
  images3: {
    type: DataTypes.TEXT
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Field;