const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const SubField = sequelize.define('subfield', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  field_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.TEXT
  },  field_type: {
    type: DataTypes.ENUM('5vs5', '7vs7')
  }
}, {
  timestamps: false
});

module.exports = SubField; 