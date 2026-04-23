const express = require('express');
const {
    getOwnerPromotions,
    getPromotionDetail,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getOwnerFieldsForPromotion,
    getPromotionStats,
    getFieldPromotions
} = require('../controllers/promotion.controller');
const { authMiddleware, isOwner } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route GET /api/promotions/owner
 * @desc Get all promotions for owner
 * @access Private (Owner only)
 */
router.get('/owner', [authMiddleware, isOwner], getOwnerPromotions);

/**
 * @route GET /api/promotions/owner/fields
 * @desc Get owner fields for promotion dropdown
 * @access Private (Owner only)
 */
router.get('/owner/fields', [authMiddleware, isOwner], getOwnerFieldsForPromotion);

/**
 * @route GET /api/promotions/owner/stats
 * @desc Get promotion statistics for owner
 * @access Private (Owner only)
 */
router.get('/owner/stats', [authMiddleware, isOwner], getPromotionStats);

/**
 * @route GET /api/promotions/field/:fieldId
 * @desc Get available promotions for a specific field (for customers)
 * @access Public
 */
router.get('/field/:fieldId', getFieldPromotions);

/**
 * @route GET /api/promotions/:id
 * @desc Get promotion detail
 * @access Private (Owner only)
 */
router.get('/:id', [authMiddleware, isOwner], getPromotionDetail);

/**
 * @route POST /api/promotions
 * @desc Create new promotion
 * @access Private (Owner only)
 */
router.post('/', [authMiddleware, isOwner], createPromotion);

/**
 * @route PUT /api/promotions/:id
 * @desc Update promotion
 * @access Private (Owner only)
 */
router.put('/:id', [authMiddleware, isOwner], updatePromotion);

/**
 * @route DELETE /api/promotions/:id
 * @desc Delete promotion
 * @access Private (Owner only)
 */
router.delete('/:id', [authMiddleware, isOwner], deletePromotion);

module.exports = router;
