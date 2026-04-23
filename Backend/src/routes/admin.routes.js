const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminFieldController = require('../controllers/admin.field.controller');
const adminDashboardController = require('../controllers/admin.dashboard.controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');

// Dashboard routes không cần xác thực khi test
router.get('/dashboard/statistics', adminDashboardController.getDashboardStatistics);
router.get('/dashboard/monthly-revenue', adminDashboardController.getMonthlyRevenueData);
router.get('/dashboard/top-field-owners', adminDashboardController.getTopFieldOwners);
router.get('/dashboard/package-service-stats', adminDashboardController.getPackageServiceStats);
router.get('/dashboard/field-booking-revenue', adminDashboardController.getFieldBookingRevenueStats);

// Tất cả routes admin đều cần authentication và role admin
router.use(authMiddleware, isAdmin);

// Thống kê tổng quan
router.get('/dashboard/stats', adminController.getDashboardStats);

// Quản lý field
router.get('/fields', adminController.getAllFieldsForAdmin);
router.get('/fields/pending', adminController.getPendingFields);
router.put('/fields/:fieldId/approve', adminController.approveField);

// New Field Management routes
router.get('/fields/all', adminFieldController.getAdminFields);
router.get('/fields/paginated', adminFieldController.getAdminFieldsPaginated);
router.get('/fields/detail/:id', adminFieldController.getAdminFieldDetail);
router.put('/fields/verify/:id', adminFieldController.verifyField);
router.put('/fields/reject/:id', adminFieldController.rejectField);

// Quản lý user
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.get('/users/export/excel', adminController.exportUsersToExcel);

// Quản lý gói dịch vụ
router.post('/packages/validate', adminController.validatePackagesManual);
router.get('/packages/status', adminController.getPackageStatusReport);

module.exports = router;
