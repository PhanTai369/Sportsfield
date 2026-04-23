const { Field, User, Location, SubField } = require('../models');
const { Op } = require('sequelize');
const { successResponse, errorResponse, forbiddenResponse } = require('../common/responses/apiResponse');
const { USER_ROLES } = require('../common/constants');
const excel = require('exceljs');

class AdminController {
  // Lấy danh sách field chờ duyệt
  async getPendingFields(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await Field.findAndCountAll({
        where: { is_verified: false },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone', 'business_license_image', 'identity_card_image'],
            where: { role: USER_ROLES.OWNER }
          },
          {
            model: Location,
            as: 'location',
            attributes: ['address_text', 'city', 'district', 'ward', 'latitude', 'longitude']
          },
          {
            model: SubField,
            as: 'subfields',
            attributes: ['id', 'name', 'field_type', 'image']
          }
        ],
        attributes: [
          'id',
          'name',
          'description',
          'price_per_hour',
          'images1',
          'images2',
          'images3',
          'is_verified',
          'created_at'
        ],
        limit,
        offset,
        order: [['created_at', 'ASC']]
      });

      const totalPages = Math.ceil(count / limit);

      return successResponse(res, 'Lấy danh sách sân chờ duyệt thành công', {
        items: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages
        }
      });

    } catch (error) {
      console.error('Error getting pending fields:', error);
      return errorResponse(res, 'Lỗi lấy danh sách sân chờ duyệt', 500);
    }
  }

  // Duyệt sân
  async approveField(req, res) {
    try {
      const { fieldId } = req.params;
      const { approved, reason } = req.body;

      const field = await Field.findByPk(fieldId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!field) {
        return errorResponse(res, 'Không tìm thấy sân', 404);
      }

      if (field.is_verified) {
        return errorResponse(res, 'Sân đã được duyệt trước đó', 400);
      }

      if (approved) {
        // Duyệt sân
        await Field.update(
          { is_verified: true },
          { where: { id: fieldId } }
        );

        // TODO: Gửi notification cho owner về việc sân được duyệt
        
        return successResponse(res, 'Duyệt sân thành công', {
          fieldId,
          approved: true,
          ownerName: field.owner.name
        });
      } else {
        // Từ chối sân - có thể xóa hoặc giữ lại với ghi chú
        if (!reason) {
          return errorResponse(res, 'Cần cung cấp lý do từ chối', 400);
        }

        // Ở đây bạn có thể chọn xóa sân hoặc thêm field lý do từ chối
        await Field.destroy({ where: { id: fieldId } });

        // TODO: Gửi notification cho owner về việc sân bị từ chối kèm lý do

        return successResponse(res, 'Từ chối sân thành công', {
          fieldId,
          approved: false,
          reason,
          ownerName: field.owner.name
        });
      }

    } catch (error) {
      console.error('Error approving field:', error);
      return errorResponse(res, 'Lỗi duyệt sân', 500);
    }
  }

  // Lấy thống kê tổng quan
  async getDashboardStats(req, res) {
    try {
      const totalUsers = await User.count();
      const totalOwners = await User.count({ where: { role: USER_ROLES.OWNER } });
      const totalCustomers = await User.count({ where: { role: USER_ROLES.CUSTOMER } });
      const totalFields = await Field.count();
      const verifiedFields = await Field.count({ where: { is_verified: true } });
      const pendingFields = await Field.count({ where: { is_verified: false } });
      
      // Thống kê gói dịch vụ
      const basicPackageUsers = await User.count({ where: { package_type: 'basic' } });
      const premiumPackageUsers = await User.count({ where: { package_type: 'premium' } });
      const noPackageUsers = await User.count({ where: { package_type: 'none' } });

      return successResponse(res, 'Lấy thống kê thành công', {
        users: {
          total: totalUsers,
          owners: totalOwners,
          customers: totalCustomers
        },
        fields: {
          total: totalFields,
          verified: verifiedFields,
          pending: pendingFields
        },
        packages: {
          basic: basicPackageUsers,
          premium: premiumPackageUsers,
          none: noPackageUsers
        }
      });

    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return errorResponse(res, 'Lỗi lấy thống kê', 500);
    }
  }

  // Lấy danh sách tất cả field (cho admin)
  async getAllFieldsForAdmin(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status; // 'verified', 'pending', 'all'

      let whereCondition = {};
      if (status === 'verified') {
        whereCondition.is_verified = true;
      } else if (status === 'pending') {
        whereCondition.is_verified = false;
      }

      const { count, rows } = await Field.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone', 'package_type']
          },
          {
            model: Location,
            as: 'location',
            attributes: ['address_text', 'city', 'district', 'ward']
          }
        ],
        attributes: [
          'id',
          'name',
          'description',
          'price_per_hour',
          'images1',
          'is_verified',
          'created_at'
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      return successResponse(res, 'Lấy danh sách sân thành công', {
        items: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages
        }
      });

    } catch (error) {
      console.error('Error getting all fields for admin:', error);
      return errorResponse(res, 'Lỗi lấy danh sách sân', 500);
    }
  }

  // Lấy danh sách tất cả user (cho admin)
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await User.findAndCountAll({
        where: {
          role: {
            [Op.ne]: USER_ROLES.ADMIN // Loại trừ admin
          }
        },
        attributes: [
          'id',
          'name',
          'email', 
          'phone',
          'role',
          'is_active',
          'is_verified',
          'created_at',
          'updated_at',
          'profileImage',
          'address',
          'gender',
          'dateOfBirth',
          'bio'
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      return successResponse(res, 'Lấy danh sách người dùng thành công', {
        users: rows,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: count,
          totalPages
        }
      });

    } catch (error) {
      console.error('Error getting all users:', error);
      return errorResponse(res, 'Lỗi lấy danh sách người dùng', 500);
    }
  }

  // Lấy chi tiết một user (cho admin)
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: [
          'id',
          'name',
          'email',
          'phone',
          'role',
          'is_active',
          'is_verified',
          'created_at',
          'updated_at',
          'profileImage',
          'address',
          'gender',
          'dateOfBirth',
          'bio'
        ]
      });

      if (!user) {
        return errorResponse(res, 'Không tìm thấy người dùng', 404);
      }

      return successResponse(res, 'Lấy thông tin người dùng thành công', user);

    } catch (error) {
      console.error('Error getting user details:', error);
      return errorResponse(res, 'Lỗi lấy thông tin người dùng', 500);
    }
  }

  // Cập nhật trạng thái hoạt động của user (cho admin)
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return errorResponse(res, 'Trạng thái hoạt động không hợp lệ', 400);
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return errorResponse(res, 'Không tìm thấy người dùng', 404);
      }

      // Không cho phép thay đổi trạng thái của admin
      if (user.role === USER_ROLES.ADMIN) {
        return errorResponse(res, 'Không thể thay đổi trạng thái của admin', 403);
      }

      await user.update({ is_active });

      return successResponse(res, 'Cập nhật trạng thái người dùng thành công', {
        userId,
        is_active
      });

    } catch (error) {
      console.error('Error updating user status:', error);
      return errorResponse(res, 'Lỗi cập nhật trạng thái người dùng', 500);
    }
  }

  // Xuất danh sách user ra file Excel
  async exportUsersToExcel(req, res) {
    try {
      // Lấy tất cả user không phân trang
      const users = await User.findAll({
        attributes: [
          'id',
          'name',
          'email', 
          'phone',
          'role',
          'is_active',
          'is_verified',
          'created_at',
          'address',
          'gender',
          'dateOfBirth'
        ],
        order: [['created_at', 'DESC']]
      });

      // Chuẩn bị dữ liệu cho Excel
      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      // Định nghĩa cột
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Họ tên', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Số điện thoại', key: 'phone', width: 20 },
        { header: 'Vai trò', key: 'role', width: 15 },
        { header: 'Trạng thái', key: 'is_active', width: 15 },
        { header: 'Đã xác thực', key: 'is_verified', width: 15 },
        { header: 'Ngày tham gia', key: 'created_at', width: 20 },
        { header: 'Địa chỉ', key: 'address', width: 40 },
        { header: 'Giới tính', key: 'gender', width: 15 },
        { header: 'Ngày sinh', key: 'dateOfBirth', width: 20 }
      ];

      // Style cho header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Thêm dữ liệu và format
      users.forEach(user => {
        worksheet.addRow({
          ...user.toJSON(),
          role: user.role === 'customer' ? 'Người dùng' : user.role === 'owner' ? 'Chủ sân' : 'Quản trị viên',
          is_active: user.is_active ? 'Hoạt động' : 'Bị khóa',
          is_verified: user.is_verified ? 'Đã xác thực' : 'Chưa xác thực',
          created_at: new Date(user.created_at).toLocaleDateString('vi-VN'),
          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : ''
        });
      });

      // Auto fit columns
      worksheet.columns.forEach(column => {
        column.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=users.xlsx'
      );

      // Gửi file về client
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error exporting users to Excel:', error);
      return errorResponse(res, 'Lỗi khi xuất dữ liệu', 500);
    }
  }

  // Kiểm tra gói dịch vụ thủ công (Admin only)
  async validatePackagesManual(req, res) {
    try {
      const { runPackageValidationNow } = require('../utils/cronJobs');
      
      console.log('[ADMIN_VALIDATION] Admin đang chạy kiểm tra gói dịch vụ thủ công...');
      await runPackageValidationNow();
      
      return successResponse(res, null, 'Đã hoàn thành kiểm tra và cập nhật trạng thái gói dịch vụ');
    } catch (error) {
      console.error('Error in admin validatePackagesManual:', error);
      return errorResponse(res, 'Có lỗi xảy ra khi kiểm tra gói dịch vụ', 500);
    }
  }

  // Lấy báo cáo trạng thái gói dịch vụ
  async getPackageStatusReport(req, res) {
    try {
      // Thống kê tổng quan
      const totalUsers = await User.count();
      const usersWithPackages = await User.count({
        where: { package_type: { [Op.ne]: 'none' } }
      });
      const expiredPackages = await User.count({
        where: {
          package_type: { [Op.ne]: 'none' },
          package_expire_date: { [Op.lt]: new Date() }
        }
      });
      const activePackages = await User.count({
        where: {
          package_type: { [Op.ne]: 'none' },
          package_expire_date: { [Op.gte]: new Date() }
        }
      });

      // Chi tiết các user có gói hết hạn
      const usersWithExpiredPackages = await User.findAll({
        where: {
          package_type: { [Op.ne]: 'none' },
          package_expire_date: { [Op.lt]: new Date() }
        },
        include: [{
          model: Field,
          as: 'ownedFields',
          attributes: ['id', 'name', 'is_verified'],
          required: false
        }],
        attributes: ['id', 'name', 'email', 'package_type', 'package_expire_date', 'package_purchase_date'],
        order: [['package_expire_date', 'ASC']]
      });

      // Fields có owner với gói hết hạn nhưng vẫn verified
      const problematicFields = await Field.findAll({
        where: { is_verified: true },
        include: [{
          model: User,
          as: 'owner',
          where: {
            [Op.or]: [
              { package_type: 'none' },
              { package_expire_date: { [Op.lt]: new Date() } }
            ]
          },
          attributes: ['id', 'name', 'package_type', 'package_expire_date']
        }],
        attributes: ['id', 'name', 'is_verified', 'created_at']
      });

      const reportData = {
        summary: {
          totalUsers,
          usersWithPackages,
          activePackages,
          expiredPackages,
          problematicFields: problematicFields.length
        },
        details: {
          usersWithExpiredPackages: usersWithExpiredPackages.map(user => ({
            ...user.toJSON(),
            fieldsCount: user.ownedFields ? user.ownedFields.length : 0,
            verifiedFieldsCount: user.ownedFields ? user.ownedFields.filter(f => f.is_verified).length : 0
          })),
          problematicFields
        },
        generatedAt: new Date().toISOString()
      };

      return successResponse(res, reportData, 'Báo cáo trạng thái gói dịch vụ');
    } catch (error) {
      console.error('Error in getPackageStatusReport:', error);
      return errorResponse(res, 'Có lỗi xảy ra khi tạo báo cáo', 500);
    }
  }
}

module.exports = new AdminController();
