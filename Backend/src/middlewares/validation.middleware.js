const Joi = require('joi');
const { errorHandler, constants } = require('../common');
const { BadRequestError } = errorHandler;
const { USER_ROLES } = constants;

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details[0].message.replace(/['"]/g, '');
      return next(new BadRequestError(errorMessage));
    }
    
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^[0-9+]{10,15}$/),
    role: Joi.string().valid(USER_ROLES.CUSTOMER, USER_ROLES.OWNER, USER_ROLES.ADMIN).default(USER_ROLES.CUSTOMER)
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  resendVerification: Joi.object({
    email: Joi.string().email().required()
  }),
  
  googleAuth: Joi.object({
    tokenId: Joi.string().required(),
    profileObj: Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      imageUrl: Joi.string().uri().optional().allow('', null),
      googleId: Joi.string().required(),
      role: Joi.string().valid(USER_ROLES.CUSTOMER, USER_ROLES.OWNER, USER_ROLES.ADMIN).default(USER_ROLES.CUSTOMER)
    }).required()
  }),
  
  updateUser: Joi.object({
    name: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    password: Joi.string().min(6),
    phone: Joi.string().pattern(/^[0-9+]{10,15}$/),
    bio: Joi.string().max(500),
    gender: Joi.string().valid('male', 'female', 'other'),
    dateOfBirth: Joi.date(),
    address: Joi.string().max(200),
    is_active: Joi.boolean()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),
  
  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),
  
  updateOwner: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/),
    bio: Joi.string().max(500),
    gender: Joi.string().valid('male', 'female', 'other'),
    dateOfBirth: Joi.date().iso(),
    address: Joi.string().max(200)
  }),

  checkGoogleAccount: Joi.object({
    email: Joi.string().email().required()
  }),
  // Chat validation schemas
  createChat: Joi.object({
    otherUserId: Joi.string().uuid().required()
  }),
  sendMessage: Joi.object({
    content: Joi.string().min(1).max(1000).required()
  }),

  generateTimeSlots: Joi.object({
    subFieldId: Joi.string().uuid().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    weekDays: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required(),
    timeRanges: Joi.array().items(
      Joi.object({
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        price: Joi.number().positive().required()
      })
    ).min(1).required(),
    peakHourStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    peakHourMultiplier: Joi.number().min(1).max(5).required()
  })
};

module.exports = {
  validateRequest,
  schemas
};