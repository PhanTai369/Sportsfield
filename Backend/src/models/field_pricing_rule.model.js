const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const FieldPricingRule = sequelize.define('field_pricing_rule', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },  field_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'fields',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  from_hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 23
    }
  },
  to_hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 23
    }
  },
  multiplier: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0.1,
      max: 9.99
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['field_id']
    }
  ]
});

module.exports = FieldPricingRule;
