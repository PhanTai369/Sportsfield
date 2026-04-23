const { User, Field } = require('../models');
const secureImageUtils = require('../utils/secureImageUtils');
const logger = require('../utils/logger');

/**
 * Generate signed URL for secure document images
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Response} - JSON response with signed URL or error
 */
const getSecureImageUrl = async (req, res) => {
  try {
    const { imageType, id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Validate image type
    const validTypes = ['business_license', 'identity_card', 'identity_card_back'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_TYPE',
          message: 'Loại hình ảnh không hợp lệ'
        }
      });
    }
    
    // Get the target user (owner of the document)
    let targetUser = null;
    
    // Check if it's a field-related document or direct user document
    if (id.startsWith('field_')) {
      // Extract field ID from the parameter, handling both numeric and UUID formats
      const rawFieldId = id.replace('field_', '');
      // Don't convert to integer - keep original format which could be UUID
      const fieldId = rawFieldId;
      logger.debug(`Field-related document requested, field ID: ${fieldId}`);
      
      if (!fieldId) {
        logger.warn(`Invalid field ID format: ${id}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'ID sân không hợp lệ'
          }
        });
      }
      
      // Find the field and its owner - handle both integer and UUID field IDs
      const field = await Field.findOne({
        where: { id: fieldId },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'business_license_image', 'identity_card_image', 'identity_card_back_image']
        }]
      });
      
      if (!field) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FIELD_NOT_FOUND',
            message: 'Field not found'
          }
        });
      }
      
      targetUser = field.owner;
      
      // Check permissions (only admin or the owner can access)
      if (!isAdmin && userId !== targetUser.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this document'
          }
        });
      }
    } else {
      // Direct user document access - keep original format which could be UUID
      const targetUserId = id;
      logger.debug(`Direct user document requested, user ID: ${targetUserId}`);
      
      // Check permissions (only admin or the user themselves can access)
      // Note: Convert to string for comparison since userId may be an integer
      if (!isAdmin && String(userId) !== String(targetUserId)) {
        logger.warn(`Permission denied: User ${userId} tried to access documents for user ${targetUserId}`);
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have permission to access this document'
          }
        });
      }
      
      // Find the target user - use findOne to handle both integer and UUID IDs
      targetUser = await User.findOne({
        where: { id: targetUserId },
        attributes: ['id', 'business_license_image', 'identity_card_image', 'identity_card_back_image']
      });
      
      if (!targetUser) {
        logger.warn(`User not found: ${targetUserId}`);
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }
      
      logger.debug(`User found: ${targetUser.id}`);
    }
    
    // Get the appropriate image URL based on type
    let imageUrl = null;
    switch(imageType) {
      case 'business_license':
        imageUrl = targetUser.business_license_image;
        break;
      case 'identity_card':
        imageUrl = targetUser.identity_card_image;
        break;
      case 'identity_card_back':
        imageUrl = targetUser.identity_card_back_image;
        break;
    }
    
    logger.debug(`Image URL for ${imageType}: ${imageUrl ? 'found' : 'not found'}`);
    
    if (!imageUrl) {
      logger.warn(`Image not found for ${imageType}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: `${imageType.replace(/_/g, ' ')} image not found`
        }
      });
    }
    
    // Extract the storage key from the stored URL
    const publicId = secureImageUtils.extractPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      logger.error(`Failed to extract public ID from URL: ${imageUrl}`);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INVALID_IMAGE_URL',
          message: 'Unable to process image URL'
        }
      });
    }
    
    // Simplified URL generation approach with robust fallbacks
    let signedUrl = null;
    
    try {
      // First try - standard signed URL
      signedUrl = await secureImageUtils.generateSignedUrl(publicId, 600, imageUrl); // Increased to 10 minutes
      
      if (!signedUrl) {
        logger.debug('First attempt at signed URL generation failed, trying direct delivery method');
        // Second try - direct delivery URL
        signedUrl = await secureImageUtils.generateDirectDeliveryUrl(publicId, 600, imageUrl);
      }
      
      if (!signedUrl) {
        logger.debug('All signed URL methods failed, using original URL as fallback');
        // Final fallback - use original URL
        signedUrl = imageUrl;
      }
      
      logger.debug(`Final URL type: ${signedUrl === imageUrl ? 'Original' : 'Generated'}`);
    } catch (error) {
      logger.error(`Error in URL generation: ${error.message}`);
      // In case of any error, use original URL
      signedUrl = imageUrl;
    }
    
    if (!signedUrl) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SIGNED_URL_GENERATION_FAILED',
          message: 'Failed to generate secure access URL'
        }
      });
    }
    
    return res.json({
      success: true,
      data: {
        secure_url: signedUrl,
        expires_in: 600
      }
    });
  } catch (error) {
    console.error('Error in getSecureImageUrl:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while processing your request'
      }
    });
  }
};

// Export controller functions
const controller = {
  getSecureImageUrl: getSecureImageUrl
};

// Log export to help with debugging
console.log('Exporting secureImageController:', 
  typeof controller.getSecureImageUrl === 'function' ? 'Function properly defined' : 'Function NOT properly defined');

module.exports = controller;
