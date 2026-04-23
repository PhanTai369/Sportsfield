const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Payment = sequelize.define('payment', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  stripe_payment_intent_id: {
    type: DataTypes.STRING,
    allowNull: true, // Changed to allow null for checkout sessions
    unique: true
  },
  stripe_session_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  stripe_charge_id: {
    type: DataTypes.STRING
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'vnd'
  },
  payment_method: {
    type: DataTypes.ENUM('stripe_card', 'stripe_wallet'),
    defaultValue: 'stripe_card'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'),
    defaultValue: 'pending'
  },
  stripe_status: {
    type: DataTypes.STRING // Stripe's actual status
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  failure_reason: {
    type: DataTypes.TEXT
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  refund_reason: {
    type: DataTypes.TEXT
  },
  metadata: {
    type: DataTypes.JSON // Store additional data like field info, time slots, etc.
  },
  processed_at: {
    type: DataTypes.DATE
  },
  webhook_received_at: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['stripe_payment_intent_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Payment;
