const { Promotion, Field, User } = require('../models');
const { ValidationError, Op } = require('sequelize');
const responseFormatter = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Get all promotions for owner
const getOwnerPromotions = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get owner's fields first
        const ownerFields = await Field.findAll({
            where: { owner_id },
            attributes: ['id']
        });

        if (ownerFields.length === 0) {
            return res.json({
                success: true,
                data: {
                    promotions: [],
                    pagination: {
                        total: 0,
                        page,
                        limit,
                        totalPages: 0,
                        hasMore: false
                    }
                }
            });
        }

        const fieldIds = ownerFields.map(field => field.id);

        const { count, rows: promotions } = await Promotion.findAndCountAll({
            where: { 
                field_id: { [Op.in]: fieldIds }
            },
            include: [
                {
                    model: Field,
                    as: 'field',
                    attributes: ['id', 'name', 'images1', 'price_per_hour']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        return res.json({
            success: true,
            data: {
                promotions,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages,
                    hasMore: page < totalPages
                }
            }
        });
    } catch (error) {
        logger.error('Error in getOwnerPromotions:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy danh sách ưu đãi'
        }));
    }
};

// Get promotion detail
const getPromotionDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;

        // Get owner's field IDs
        const ownerFields = await Field.findAll({
            where: { owner_id },
            attributes: ['id']
        });

        const fieldIds = ownerFields.map(field => field.id);

        const promotion = await Promotion.findOne({
            where: { 
                id,
                field_id: { [Op.in]: fieldIds }
            },
            include: [
                {
                    model: Field,
                    as: 'field',
                    attributes: ['id', 'name', 'images1', 'price_per_hour']
                }
            ]
        });

        if (!promotion) {
            return res.status(404).json(responseFormatter.error({
                code: 'PROMOTION_NOT_FOUND',
                message: 'Không tìm thấy chương trình ưu đãi'
            }));
        }

        return res.json(responseFormatter.success(promotion));
    } catch (error) {
        logger.error('Error in getPromotionDetail:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy thông tin ưu đãi'
        }));
    }
};

// Create new promotion
const createPromotion = async (req, res) => {
    try {
        const {
            title,
            discount_percent,
            valid_from,
            valid_to,
            field_id
        } = req.body;
        const owner_id = req.user.id;

        // Validate required fields
        if (!title || !discount_percent || !valid_from || !valid_to || !field_id) {
            return res.status(400).json(responseFormatter.error({
                code: 'MISSING_REQUIRED_FIELDS',
                message: 'Thiếu thông tin bắt buộc: tiêu đề, phần trăm giảm giá, ngày bắt đầu, ngày kết thúc và sân bóng'
            }));
        }

        // Validate discount percent
        if (discount_percent < 1 || discount_percent > 100) {
            return res.status(400).json(responseFormatter.error({
                code: 'INVALID_DISCOUNT_PERCENT',
                message: 'Phần trăm giảm giá phải từ 1% đến 100%'
            }));
        }

        // Validate dates
        const fromDate = new Date(valid_from);
        const toDate = new Date(valid_to);
        const now = new Date();

        if (fromDate >= toDate) {
            return res.status(400).json(responseFormatter.error({
                code: 'INVALID_DATE_RANGE',
                message: 'Ngày kết thúc phải sau ngày bắt đầu'
            }));
        }

        if (toDate <= now) {
            return res.status(400).json(responseFormatter.error({
                code: 'INVALID_END_DATE',
                message: 'Ngày kết thúc phải trong tương lai'
            }));
        }

        // Check if field belongs to owner
        const field = await Field.findOne({
            where: { 
                id: field_id,
                owner_id 
            }
        });

        if (!field) {
            return res.status(404).json(responseFormatter.error({
                code: 'FIELD_NOT_FOUND',
                message: 'Không tìm thấy sân bóng hoặc bạn không có quyền truy cập'
            }));
        }

        // Create promotion
        const promotion = await Promotion.create({
            title: title.trim(),
            discount_percent: parseInt(discount_percent),
            valid_from: fromDate,
            valid_to: toDate,
            field_id
        });

        // Fetch created promotion with field info
        const createdPromotion = await Promotion.findByPk(promotion.id, {
            include: [
                {
                    model: Field,
                    as: 'field',
                    attributes: ['id', 'name', 'images1', 'price_per_hour']
                }
            ]
        });

        return res.status(201).json(responseFormatter.success({
            message: 'Tạo chương trình ưu đãi thành công',
            data: createdPromotion
        }));
    } catch (error) {
        logger.error('Error in createPromotion:', error);
        if (error instanceof ValidationError) {
            return res.status(400).json(responseFormatter.error({
                code: 'VALIDATION_ERROR',
                message: 'Dữ liệu không hợp lệ',
                details: error.errors
            }));
        }
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi tạo ưu đãi'
        }));
    }
};

// Update promotion
const updatePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            discount_percent,
            valid_from,
            valid_to,
            field_id
        } = req.body;
        const owner_id = req.user.id;

        // Get owner's field IDs
        const ownerFields = await Field.findAll({
            where: { owner_id },
            attributes: ['id']
        });

        const fieldIds = ownerFields.map(field => field.id);

        // Find existing promotion
        const promotion = await Promotion.findOne({
            where: { 
                id,
                field_id: { [Op.in]: fieldIds }
            }
        });

        if (!promotion) {
            return res.status(404).json(responseFormatter.error({
                code: 'PROMOTION_NOT_FOUND',
                message: 'Không tìm thấy chương trình ưu đãi'
            }));
        }

        // Validate dates if provided
        if (valid_from && valid_to) {
            const fromDate = new Date(valid_from);
            const toDate = new Date(valid_to);
            
            if (fromDate >= toDate) {
                return res.status(400).json(responseFormatter.error({
                    code: 'INVALID_DATE_RANGE',
                    message: 'Ngày kết thúc phải sau ngày bắt đầu'
                }));
            }
        }

        // Validate discount percent
        if (discount_percent && (discount_percent < 1 || discount_percent > 100)) {
            return res.status(400).json(responseFormatter.error({
                code: 'INVALID_DISCOUNT_PERCENT',
                message: 'Phần trăm giảm giá phải từ 1% đến 100%'
            }));
        }

        // Check field ownership if field_id is being updated
        if (field_id && field_id !== promotion.field_id) {
            const field = await Field.findOne({
                where: { 
                    id: field_id,
                    owner_id 
                }
            });

            if (!field) {
                return res.status(404).json(responseFormatter.error({
                    code: 'FIELD_NOT_FOUND',
                    message: 'Không tìm thấy sân bóng hoặc bạn không có quyền truy cập'
                }));
            }
        }

        // Update promotion
        await promotion.update({
            title: title ? title.trim() : promotion.title,
            discount_percent: discount_percent ? parseInt(discount_percent) : promotion.discount_percent,
            valid_from: valid_from ? new Date(valid_from) : promotion.valid_from,
            valid_to: valid_to ? new Date(valid_to) : promotion.valid_to,
            field_id: field_id || promotion.field_id
        });

        // Fetch updated promotion with field info
        const updatedPromotion = await Promotion.findByPk(id, {
            include: [
                {
                    model: Field,
                    as: 'field',
                    attributes: ['id', 'name', 'images1', 'price_per_hour']
                }
            ]
        });

        return res.json(responseFormatter.success({
            message: 'Cập nhật chương trình ưu đãi thành công',
            data: updatedPromotion
        }));
    } catch (error) {
        logger.error('Error in updatePromotion:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi cập nhật ưu đãi'
        }));
    }
};

// Delete promotion
const deletePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const owner_id = req.user.id;

        // Get owner's field IDs
        const ownerFields = await Field.findAll({
            where: { owner_id },
            attributes: ['id']
        });

        const fieldIds = ownerFields.map(field => field.id);

        const promotion = await Promotion.findOne({
            where: { 
                id,
                field_id: { [Op.in]: fieldIds }
            }
        });

        if (!promotion) {
            return res.status(404).json(responseFormatter.error({
                code: 'PROMOTION_NOT_FOUND',
                message: 'Không tìm thấy chương trình ưu đãi'
            }));
        }

        await promotion.destroy();

        return res.json(responseFormatter.success({
            message: 'Xóa chương trình ưu đãi thành công'
        }));
    } catch (error) {
        logger.error('Error in deletePromotion:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi xóa ưu đãi'
        }));
    }
};

// Get owner fields for promotion dropdown
const getOwnerFieldsForPromotion = async (req, res) => {
    try {
        const owner_id = req.user.id;
        console.log('Getting fields for owner_id:', owner_id);

        const fields = await Field.findAll({
            where: { 
                owner_id,
                is_verified: true // Since you mentioned all fields are verified
            },
            attributes: ['id', 'name', 'images1', 'price_per_hour', 'is_verified'],
            order: [['name', 'ASC']]
        });

        console.log('Found fields:', fields.length);
        console.log('Fields data:', fields.map(f => ({ id: f.id, name: f.name, is_verified: f.is_verified })));

        return res.json(responseFormatter.success(fields));
    } catch (error) {
        console.error('Error in getOwnerFieldsForPromotion:', error);
        logger.error('Error in getOwnerFieldsForPromotion:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy danh sách sân bóng'
        }));
    }
};

// Get promotion statistics
const getPromotionStats = async (req, res) => {
    try {
        const owner_id = req.user.id;
        const now = new Date();

        // Get owner's field IDs
        const ownerFields = await Field.findAll({
            where: { owner_id },
            attributes: ['id']
        });

        if (ownerFields.length === 0) {
            return res.json(responseFormatter.success({
                total: 0,
                active: 0,
                expired: 0
            }));
        }

        const fieldIds = ownerFields.map(field => field.id);

        const totalPromotions = await Promotion.count({
            where: { field_id: { [Op.in]: fieldIds } }
        });

        const activePromotions = await Promotion.count({
            where: { 
                field_id: { [Op.in]: fieldIds },
                valid_to: { [Op.gte]: now }
            }
        });

        const expiredPromotions = await Promotion.count({
            where: { 
                field_id: { [Op.in]: fieldIds },
                valid_to: { [Op.lt]: now }
            }
        });

        return res.json(responseFormatter.success({
            total: totalPromotions,
            active: activePromotions,
            expired: expiredPromotions
        }));
    } catch (error) {
        logger.error('Error in getPromotionStats:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy thống kê ưu đãi'
        }));
    }
};

// Get available promotions for a specific field (for customers)
const getFieldPromotions = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const now = new Date();

        // Find all active promotions for this field
        const promotions = await Promotion.findAll({
            where: { 
                field_id: fieldId,
                valid_from: { [Op.lte]: now },
                valid_to: { [Op.gte]: now }
            },
            include: [
                {
                    model: Field,
                    as: 'field',
                    attributes: ['id', 'name', 'price_per_hour']
                }
            ],
            order: [['discount_percent', 'DESC']] // Order by highest discount first
        });

        return res.json(responseFormatter.success(promotions));
    } catch (error) {
        logger.error('Error in getFieldPromotions:', error);
        return res.status(500).json(responseFormatter.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Đã có lỗi xảy ra khi lấy danh sách ưu đãi'
        }));
    }
};

module.exports = {
    getOwnerPromotions,
    getPromotionDetail,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getOwnerFieldsForPromotion,
    getPromotionStats,
    getFieldPromotions
};
