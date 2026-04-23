const { User, Field } = require('../models');
const { Op } = require('sequelize');

/**
 * Middleware để kiểm tra và cập nhật trạng thái verify của field dựa trên gói dịch vụ
 */
const validateFieldsPackageStatus = async () => {
    try {
        console.log('[PACKAGE_VALIDATION] Bắt đầu kiểm tra trạng thái gói dịch vụ...');
        
        // Tìm tất cả user có gói đã hết hạn nhưng vẫn có sân verified
        const expiredPackageUsers = await User.findAll({
            where: {
                package_expire_date: {
                    [Op.lt]: new Date() // Đã hết hạn
                },
                package_type: {
                    [Op.ne]: 'none' // Có gói dịch vụ
                }
            },
            include: [{
                model: Field,
                as: 'ownedFields', // Sử dụng đúng alias từ models/index.js
                where: {
                    is_verified: true
                },
                required: true
            }]
        });

        if (expiredPackageUsers.length === 0) {
            console.log('[PACKAGE_VALIDATION] Không có user nào có gói hết hạn với sân verified');
            return;
        }

        // Vô hiệu hóa tất cả field của những user có gói hết hạn
        for (const user of expiredPackageUsers) {
            await Field.update(
                { 
                    is_verified: false,
                    updated_at: new Date()
                },
                {
                    where: {
                        owner_id: user.id,
                        is_verified: true
                    }
                }
            );

            console.log(`[PACKAGE_VALIDATION] Đã vô hiệu hóa ${user.ownedFields.length} sân của user ${user.id} (gói hết hạn: ${user.package_expire_date})`);
        }

        console.log(`[PACKAGE_VALIDATION] Hoàn thành kiểm tra. Đã xử lý ${expiredPackageUsers.length} user`);
        
    } catch (error) {
        console.error('[PACKAGE_VALIDATION] Lỗi khi kiểm tra trạng thái gói:', error);
    }
};

/**
 * Middleware để kiểm tra gói dịch vụ của user trước khi thực hiện các thao tác với field
 */
const checkUserPackageStatus = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return next();
        }

        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'package_type', 'package_expire_date']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'Không tìm thấy thông tin người dùng'
                }
            });
        }

        // Kiểm tra nếu user không có gói hoặc gói đã hết hạn
        if (user.package_type === 'none' || 
            (user.package_expire_date && new Date(user.package_expire_date) < new Date())) {
            
            // Vô hiệu hóa tất cả field của user này
            await Field.update(
                { is_verified: false },
                { where: { owner_id: user.id, is_verified: true } }
            );

            req.userPackageExpired = true;
        } else {
            req.userPackageExpired = false;
        }

        next();
    } catch (error) {
        console.error('Error in checkUserPackageStatus middleware:', error);
        next();
    }
};

/**
 * Helper function để lấy điều kiện where cho field query với kiểm tra gói dịch vụ
 */
const getFieldQueryWithPackageValidation = () => {
    return {
        is_verified: true,
        '$owner.package_expire_date$': {
            [Op.or]: [
                { [Op.gte]: new Date() }, // Gói chưa hết hạn
                { [Op.is]: null } // Hoặc không có thông tin gói (legacy data)
            ]
        },
        '$owner.package_type$': {
            [Op.ne]: 'none' // Có gói dịch vụ
        }
    };
};

module.exports = {
    validateFieldsPackageStatus,
    checkUserPackageStatus,
    getFieldQueryWithPackageValidation
};
