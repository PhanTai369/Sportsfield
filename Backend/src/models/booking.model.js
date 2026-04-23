const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Booking = sequelize.define('booking', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  booking_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'payment_pending'),
    defaultValue: 'pending'
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  deposit_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'processing', 'partial', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  payment_due_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refund_method: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true // Changed to allow null for owner bookings
  },
  customer_info: {
    type: DataTypes.JSON // Store customer details
  },
  booking_metadata: {
    type: DataTypes.JSON // Store additional booking info
  },
  is_owner_booking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  remaining_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Thêm trường để phân biệt booking thường và package payment
  isPackage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'True nếu đây là giao dịch mua package, false nếu là booking sân thường'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Booking; 