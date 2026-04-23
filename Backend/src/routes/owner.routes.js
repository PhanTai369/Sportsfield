const express = require('express');
const {
  getOwnerProfile,
  updateOwnerProfile,
  uploadOwnerProfileImage,
  changeOwnerPassword
} = require('../controllers/owner.controller');
const { authMiddleware, isOwner } = require('../middlewares/auth.middleware');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { upload, handleMulterError } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route GET /api/owners/profile
 * @desc Get owner profile
 * @access Private (Owner only)
 */
router.get('/profile', [authMiddleware, isOwner], getOwnerProfile);

/**
 * @route PUT /api/owners/profile
 * @desc Update owner profile
 * @access Private (Owner only)
 */
router.put(
  '/profile', 
  [
    authMiddleware, 
    isOwner,
    validateRequest(schemas.updateOwner)
  ], 
  updateOwnerProfile
);

/**
 * @route POST /api/owners/profile/image
 * @desc Upload owner profile image
 * @access Private (Owner only)
 */
router.post(
  '/profile/image',
  [
    authMiddleware,
    isOwner,
    upload.single('image'),
    handleMulterError
  ],
  uploadOwnerProfileImage
);

/**
 * @route POST /api/owners/change-password
 * @desc Change owner password
 * @access Private (Owner only)
 */
router.post(
  '/change-password',
  [
    authMiddleware,
    isOwner,
    validateRequest(schemas.changePassword)
  ],
  changeOwnerPassword
);

module.exports = router; 