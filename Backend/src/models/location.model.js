const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Location = sequelize.define('location', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  geom: {
    type: DataTypes.JSON,
    comment: 'GeoJSON format for geometry data'
  },
  address_text: {
    type: DataTypes.STRING,
    allowNull: false
  },
  formatted_address: {
    type: DataTypes.STRING,
    comment: 'Formatted address from geocoding service'
  },
  city: {
    type: DataTypes.STRING
  },
  district: {
    type: DataTypes.STRING
  },
  ward: {
    type: DataTypes.STRING
  },
  country: {
    type: DataTypes.STRING
  },
  country_code: {
    type: DataTypes.STRING(2)
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'location_coordinates_idx',
      fields: ['latitude', 'longitude']
    },
    {
      name: 'location_city_idx',
      fields: ['city']
    },
    {
      name: 'location_district_idx',
      fields: ['district']
    }
  ]
});

module.exports = Location; 