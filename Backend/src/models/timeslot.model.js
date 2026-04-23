const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db.config');

const TimeSlot = sequelize.define('timeslot', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  sub_field_id: {
    type: DataTypes.UUID,
    allowNull: false
  },  booking_id: {
    type: DataTypes.UUID
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'available',
    validate: {
      isIn: [['available', 'booked', 'maintenance']]
    }
  },
  maintenance_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  maintenance_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: false,
  indexes: [
    {
      // Unique constraint to prevent double booking
      unique: true,
      fields: ['sub_field_id', 'date', 'start_time', 'end_time'],
      where: {
        status: { [Op.ne]: 'available' }
      },
      name: 'unique_booked_timeslot'
    },
    {
      // Performance index for availability queries
      fields: ['sub_field_id', 'date', 'status'],
      name: 'timeslot_availability_index'
    }
  ]
});

module.exports = TimeSlot; 