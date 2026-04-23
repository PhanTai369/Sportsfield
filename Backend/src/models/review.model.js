const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Review = sequelize.define('review', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  field_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Associations will be defined in models/index.js
module.exports = Review;