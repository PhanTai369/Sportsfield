const cron = require('node-cron');
const { validateFieldsPackageStatus } = require('../middlewares/packageValidation.middleware');
const logger = require('./logger');

/**
 * Khởi tạo các cron jobs cho hệ thống
 * Hiện tại các cron jobs đã bị vô hiệu hóa theo yêu cầu
 */
const initCronJobs = () => {
    console.log('[CRON] Khởi tạo cron jobs...');

    // Job kiểm tra gói dịch vụ hết hạn - chạy mỗi giờ
    /*
    cron.schedule('0 * * * *', async () => {
        logger.info('[CRON] Bắt đầu job kiểm tra gói dịch vụ hết hạn');
        try {
            await validateFieldsPackageStatus();
            logger.info('[CRON] Hoàn thành job kiểm tra gói dịch vụ');
        } catch (error) {
            logger.error('[CRON] Lỗi trong job kiểm tra gói dịch vụ:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });
    */

    // Job kiểm tra gói dịch vụ hết hạn trong ngày - chạy lúc 9h sáng mỗi ngày
    /*
    cron.schedule('0 9 * * *', async () => {
        logger.info('[CRON] Bắt đầu job kiểm tra gói dịch vụ hàng ngày');
        try {
            await validateFieldsPackageStatus();
            logger.info('[CRON] Hoàn thành job kiểm tra gói dịch vụ hàng ngày');
        } catch (error) {
            logger.error('[CRON] Lỗi trong job kiểm tra gói dịch vụ hàng ngày:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });
    */

    console.log('[CRON] Đã khởi tạo thành công các cron jobs (tất cả đã bị vô hiệu hóa)');
};

/**
 * Chạy kiểm tra gói dịch vụ ngay lập tức (cho testing)
 * Hiện tại chức năng này đã bị vô hiệu hóa theo yêu cầu
 */
const runPackageValidationNow = async () => {
    console.log('[MANUAL] Chức năng kiểm tra gói dịch vụ đã bị vô hiệu hóa');
    /*
    console.log('[MANUAL] Chạy kiểm tra gói dịch vụ thủ công...');
    try {
        await validateFieldsPackageStatus();
        console.log('[MANUAL] Hoàn thành kiểm tra gói dịch vụ thủ công');
    } catch (error) {
        console.error('[MANUAL] Lỗi khi chạy kiểm tra thủ công:', error);
        throw error;
    }
    */
};

module.exports = {
    initCronJobs,
    runPackageValidationNow
};