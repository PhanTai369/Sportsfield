const express = require('express');
const {
  getCurrentUser,
  updateCurrentUser,
  uploadProfileImage,
  deleteProfileImage,
  changePassword,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser
} = require('../controllers/user.controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');
const { validateRequest, schemas } = require('../middlewares/validation.middleware');
const { upload, handleMulterError } = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private (Any authenticated user)
 */
router.get('/profile', authMiddleware, getCurrentUser);

/**
 * @route PUT /api/users/profile
 * @desc Update current user profile
 * @access Private (Any authenticated user)
 */
router.put('/profile', [authMiddleware, validateRequest(schemas.updateUser)], updateCurrentUser);

/**
 * @route POST /api/users/profile/image
 * @desc Upload profile image
 * @access Private (Any authenticated user)
 */
router.post(
  '/profile/image', 
  [
    authMiddleware,
    upload.single('image'),
    handleMulterError
  ], 
  uploadProfileImage
);

/**
 * @route DELETE /api/users/profile/image
 * @desc Delete profile image
 * @access Private (Any authenticated user)
 */
router.delete('/profile/image', authMiddleware, deleteProfileImage);

/**
 * @route POST /api/users/change-password
 * @desc Change user password
 * @access Private (Any authenticated user)
 */
router.post('/change-password', [authMiddleware, validateRequest(schemas.changePassword)], changePassword);

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Private (Admin only)
 */
router.get('/', [authMiddleware, isAdmin], getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Admin only)
 */
router.get('/:id', [authMiddleware, isAdmin], getUserById);

/**
 * @route PUT /api/users/:id
 * @desc Update user by ID
 * @access Private (Admin only)
 */
router.put('/:id', [authMiddleware, isAdmin, validateRequest(schemas.updateUser)], updateUserById);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user (soft delete)
 * @access Private (Admin only)
 */
router.delete('/:id', [authMiddleware, isAdmin], deleteUser);

module.exports = router; 