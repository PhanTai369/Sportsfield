const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');
const { constants, passwordUtils } = require('../common');
const { USER_ROLES, CONFIG } = constants;

const User = sequelize.define('user', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true
  },
  phone: {
    type: DataTypes.STRING
  },
  profileImage: {
    type: DataTypes.STRING
  },
  profileImageId: {
    type: DataTypes.STRING
  },
  bio: {
    type: DataTypes.TEXT
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other')
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY
  },
  address: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.ENUM(USER_ROLES.CUSTOMER, USER_ROLES.OWNER, USER_ROLES.ADMIN),
    defaultValue: USER_ROLES.CUSTOMER
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  verification_token: {
    type: DataTypes.STRING
  },
  reset_password_token: {
    type: DataTypes.STRING(128),
    get() {
      const token = this.getDataValue('reset_password_token');
      if (token) {
        const tokenCreatedAt = new Date(this.updated_at);
        const now = new Date();
        const hoursSinceCreation = (now - tokenCreatedAt) / (1000 * 60 * 60);
        
        if (hoursSinceCreation > 1) {
          this.update({ reset_password_token: null });
          return null;
        }
      }
      return token;
    }
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Các trường mới cho gói dịch vụ
  package_type: {
      type: DataTypes.ENUM('basic', 'premium', 'none'),
      defaultValue: 'none',
      allowNull: false
  },
  package_purchase_date: {
      type: DataTypes.DATE,
      allowNull: true
  },
  package_expire_date: {
      type: DataTypes.DATE,
      allowNull: true
  },
  business_license_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
          isUrl: true
      }
  },  identity_card_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
          isUrl: true
      }
  },
  identity_card_back_image: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
          isUrl: true
      }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await passwordUtils.hashPassword(user.password_hash, CONFIG.PASSWORD_SALT_ROUNDS);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await passwordUtils.hashPassword(user.password_hash, CONFIG.PASSWORD_SALT_ROUNDS);
      }
    }
  }
});

User.prototype.comparePassword = async function(password) {
  return await passwordUtils.comparePassword(password, this.password_hash);
};

module.exports = User; 