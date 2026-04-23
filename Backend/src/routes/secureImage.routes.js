const express = require('express');
const secureImageController = require('../controllers/secureImage.controller');
const { authMiddleware, isOwnerOrAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route GET /api/secure-images/:imageType/:id
 * @desc Get secure URL for protected document images
 * @access Private (Admin/Owner)
 */
// Import controller function directly to ensure it's defined
const getSecureImageUrl = secureImageController.getSecureImageUrl;

// Make sure the function exists before setting up the route
if (typeof getSecureImageUrl !== 'function') {
  console.error('Error: secureImageController.getSecureImageUrl is not a function');
  console.error('Value:', getSecureImageUrl);
}

// Use authMiddleware instead of requireAuth
router.get('/:imageType/:id', authMiddleware, isOwnerOrAdmin, getSecureImageUrl);

module.exports = router;
