const { User, Booking, Field } = require('../models');
const { sequelize } = require('../config/db.config');
const { Op } = require('sequelize');
const constants = require('../common/constants');
const { USER_ROLES } = constants;
const moment = require('moment');

// Log DB connection details
console.log('Database connection details:');
console.log('- USE_POSTGRES:', process.env.USE_POSTGRES);
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_USER:', process.env.DB_USER);

/**
 * Get dashboard statistics for admin
 * This includes:
 * - Total customer count
 * - Total owner count
 * - Total revenue from bookings
 */
const getDashboardStatistics = async (req, res) => {
    try {
        console.log('Getting dashboard statistics...');
        
        // Get count of customers (role = customer)
        const customerCount = await User.count({
            where: {
                role: USER_ROLES.CUSTOMER
            }
        });
        console.log('Customer count:', customerCount);

        // Get count of field owners (role = owner)
        const ownerCount = await User.count({
            where: {
                role: USER_ROLES.OWNER
            }
        });
        console.log('Owner count:', ownerCount);

        // Calculate total revenue from all paid bookings (confirmed/completed with paid/completed payment)
        const totalRevenue = await Booking.sum('total_price', {
            where: {
                status: {
                    [Op.or]: ['confirmed', 'completed']
                },
                payment_status: {
                    [Op.or]: ['paid', 'completed']
                }
            }
        }) || 0;
        console.log('Total revenue:', totalRevenue);
        
        // Calculate revenue from regular bookings (isPackage = false or null)
        const regularBookingsRevenue = await Booking.sum('total_price', {
            where: {
                status: {
                    [Op.or]: ['confirmed', 'completed']
                },
                payment_status: {
                    [Op.or]: ['paid', 'completed']
                },
                isPackage: {
                    [Op.or]: [false, null]
                }
            }
        }) || 0;
        console.log('Regular bookings revenue:', regularBookingsRevenue);
        
        // Calculate revenue from package bookings (isPackage = true)
        const packageBookingsRevenue = await Booking.sum('total_price', {
            where: {
                status: {
                    [Op.or]: ['confirmed', 'completed']
                },
                payment_status: {
                    [Op.or]: ['paid', 'completed']
                },
                isPackage: true
            }
        }) || 0;
        console.log('Package bookings revenue:', packageBookingsRevenue);
        
        // Calculate booking cancellation rate
        const totalBookings = await Booking.count();
        const cancelledBookings = await Booking.count({
            where: {
                status: 'cancelled'
            }
        });
        const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
        console.log('Total bookings:', totalBookings);
        console.log('Cancelled bookings:', cancelledBookings);
        console.log('Cancellation rate:', cancellationRate.toFixed(2) + '%');

        // Get total fields count (active and inactive)
        const totalFields = await Field.count();
        // Count verified fields (active)
        const activeFields = await Field.count({
            where: {
                is_verified: true
            }
        });
        const inactiveFields = totalFields - activeFields;
        console.log('Total fields:', totalFields);
        console.log('Verified fields:', activeFields);
        console.log('Unverified fields:', inactiveFields);

        const totalUsers = customerCount + ownerCount;

        // Return the simplified statistics
        return res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    customers: customerCount,
                    owners: ownerCount
                },
                revenue: {
                    total: totalRevenue,
                    regular: regularBookingsRevenue,
                    package: packageBookingsRevenue
                },
                bookings: {
                    total: totalBookings,
                    cancelled: cancelledBookings,
                    cancellationRate: parseFloat(cancellationRate.toFixed(2))
                },
                fields: {
                    total: totalFields,
                    active: activeFields,
                    inactive: inactiveFields
                }
            }
        });
    } catch (error) {
        console.error('Error in getDashboardStatistics:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy thống kê dashboard',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Get monthly revenue data for the revenue bar chart
 */
const getMonthlyRevenueData = async (req, res) => {
    try {
        // Get year from query params or use current year as default
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        console.log(`Getting monthly revenue data for year: ${year}`);
        
        // Get additional filter params if provided
        const quarter = req.query.quarter;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        let whereClause = `WHERE EXTRACT(YEAR FROM booking_date) = ${year}`;
        
        // Add quarter filter if provided
        if (quarter) {
            const quarterStart = (parseInt(quarter) - 1) * 3 + 1;
            const quarterEnd = quarterStart + 2;
            whereClause += ` AND EXTRACT(MONTH FROM booking_date) BETWEEN ${quarterStart} AND ${quarterEnd}`;
        }
        
        // Add custom date range filter if provided
        if (startDate && endDate) {
            whereClause = `WHERE booking_date BETWEEN '${startDate}' AND '${endDate}'`;
        }
        
        // Using Sequelize to get monthly revenue data
        const result = await sequelize.query(`
            SELECT 
                EXTRACT(MONTH FROM booking_date) as month,
                SUM(total_price) as revenue
            FROM bookings
            ${whereClause}
            AND status IN ('confirmed', 'completed')
            AND payment_status IN ('paid', 'completed')
            GROUP BY EXTRACT(MONTH FROM booking_date)
            ORDER BY EXTRACT(MONTH FROM booking_date)
        `, { type: sequelize.QueryTypes.SELECT });

        // Fill in missing months with zero values
        const monthlyData = Array(12).fill(null).map((_, index) => {
            const month = index + 1;
            const monthName = moment().month(index).format('MMMM');
            const existingData = result.find(item => Number(item.month) === month);
            
            return {
                month,
                month_name: monthName,
                revenue: existingData ? parseFloat(existingData.revenue) : 0
            };
        });

        return res.json({
            success: true,
            data: monthlyData
        });
    } catch (error) {
        console.error('Error in getMonthlyRevenueData:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy dữ liệu doanh thu theo tháng',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Get top 5 field owners with the most bookings
 */
const getTopFieldOwners = async (req, res) => {
    try {
        // Find top 5 field owners with the most bookings
        const result = await sequelize.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u."profileImage" as avatar_url,
                COUNT(DISTINCT b.id) as booking_count,
                COUNT(DISTINCT f.id) as fields_count,
                SUM(b.total_price) as total_revenue
            FROM users u
            JOIN fields f ON u.id = f.owner_id
            JOIN subfields sf ON f.id = sf.field_id
            JOIN timeslots ts ON sf.id = ts.sub_field_id
            JOIN bookings b ON ts.booking_id = b.id
            WHERE u.role = '${USER_ROLES.OWNER}'
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            GROUP BY u.id, u.name, u.email, u."profileImage"
            ORDER BY booking_count DESC
            LIMIT 5
        `, { type: sequelize.QueryTypes.SELECT });

        // Format the results
        const topOwners = result.map(owner => ({
            id: owner.id,
            full_name: owner.name, // Map name to full_name for frontend compatibility
            email: owner.email,
            avatar_url: owner.avatar_url || '',
            booking_count: parseInt(owner.booking_count),
            fields_count: parseInt(owner.fields_count),
            total_revenue: parseFloat(owner.total_revenue) || 0
        }));

        return res.json({
            success: true,
            data: topOwners
        });
    } catch (error) {
        console.error('Error in getTopFieldOwners:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy danh sách chủ sân hàng đầu',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Get detailed package service statistics
 */
const getPackageServiceStats = async (req, res) => {
    try {
        console.log('Getting package service statistics...');
        
        // Get total package revenue
        const totalPackageRevenue = await Booking.sum('total_price', {
            where: {
                status: {
                    [Op.or]: ['confirmed', 'completed']
                },
                payment_status: {
                    [Op.or]: ['paid', 'completed']
                },
                ['"isPackage"']: true
            }
        }) || 0;
        
        // Get package statistics by type (basic vs premium)
        const packageStats = await sequelize.query(`
            SELECT 
                b.booking_metadata->>'packageType' as package_type,
                b.booking_metadata->>'packageName' as package_name,
                COUNT(*) as total_purchases,
                SUM(b.total_price) as total_revenue,
                AVG(b.total_price) as avg_price,
                MIN(b.booking_date) as first_purchase,
                MAX(b.booking_date) as latest_purchase
            FROM bookings b
            WHERE b."isPackage" = true
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            AND b.booking_metadata->>'packageType' IS NOT NULL
            GROUP BY 
                b.booking_metadata->>'packageType',
                b.booking_metadata->>'packageName'
            ORDER BY total_revenue DESC
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Get monthly package revenue trend
        const monthlyPackageRevenue = await sequelize.query(`
            SELECT 
                EXTRACT(YEAR FROM booking_date) as year,
                EXTRACT(MONTH FROM booking_date) as month,
                COUNT(*) as purchases_count,
                SUM(total_price) as revenue,
                b.booking_metadata->>'packageType' as package_type
            FROM bookings b
            WHERE b."isPackage" = true
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            AND booking_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY 
                EXTRACT(YEAR FROM booking_date),
                EXTRACT(MONTH FROM booking_date),
                b.booking_metadata->>'packageType'
            ORDER BY year, month, package_type
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Get top users by package spending
        const topPackageUsers = await sequelize.query(`
            SELECT 
                u.name,
                u.email,
                u.role,
                COUNT(b.id) as total_packages_purchased,
                SUM(b.total_price) as total_spent,
                MAX(b.booking_date) as latest_purchase,
                string_agg(DISTINCT b.booking_metadata->>'packageType', ', ') as package_types
            FROM users u
            JOIN bookings b ON u.id = b.user_id
            WHERE b."isPackage" = true
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            GROUP BY u.id, u.name, u.email, u.role
            ORDER BY total_spent DESC
            LIMIT 10
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Get recent package purchases
        const recentPackagePurchases = await sequelize.query(`
            SELECT 
                b.id,
                b.booking_date,
                b.total_price,
                b.booking_metadata->>'packageType' as package_type,
                b.booking_metadata->>'packageName' as package_name,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b."isPackage" = true
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            ORDER BY b.booking_date DESC
            LIMIT 20
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Format data
        const formattedPackageStats = packageStats.map(stat => ({
            packageType: stat.package_type,
            packageName: stat.package_name,
            totalPurchases: parseInt(stat.total_purchases),
            totalRevenue: parseFloat(stat.total_revenue),
            avgPrice: parseFloat(stat.avg_price),
            firstPurchase: stat.first_purchase,
            latestPurchase: stat.latest_purchase
        }));
        
        const formattedMonthlyRevenue = monthlyPackageRevenue.map(item => ({
            year: parseInt(item.year),
            month: parseInt(item.month),
            purchasesCount: parseInt(item.purchases_count),
            revenue: parseFloat(item.revenue),
            packageType: item.package_type
        }));
        
        const formattedTopUsers = topPackageUsers.map(user => ({
            name: user.name,
            email: user.email,
            role: user.role,
            totalPackages: parseInt(user.total_packages_purchased),
            totalSpent: parseFloat(user.total_spent),
            latestPurchase: user.latest_purchase,
            packageTypes: user.package_types
        }));
        
        const formattedRecentPurchases = recentPackagePurchases.map(purchase => ({
            id: purchase.id,
            date: purchase.booking_date,
            price: parseFloat(purchase.total_price),
            packageType: purchase.package_type,
            packageName: purchase.package_name,
            userName: purchase.user_name,
            userEmail: purchase.user_email,
            userRole: purchase.user_role
        }));
        
        return res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue: totalPackageRevenue,
                    totalPackages: formattedPackageStats.reduce((sum, stat) => sum + stat.totalPurchases, 0),
                    basicPackages: formattedPackageStats.find(s => s.packageType === 'basic')?.totalPurchases || 0,
                    premiumPackages: formattedPackageStats.find(s => s.packageType === 'premium')?.totalPurchases || 0
                },
                packageStats: formattedPackageStats,
                monthlyRevenue: formattedMonthlyRevenue,
                topUsers: formattedTopUsers,
                recentPurchases: formattedRecentPurchases
            }
        });
    } catch (error) {
        console.error('Error in getPackageServiceStats:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy thống kê gói dịch vụ',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Get detailed field booking revenue statistics for admin
 * This includes revenue breakdown by owner with daily, monthly, yearly data
 */
const getFieldBookingRevenueStats = async (req, res) => {
    try {
        console.log('Getting field booking revenue statistics...');
        
        const { 
            period = 'monthly', // daily, monthly, yearly
            year = new Date().getFullYear(),
            month,
            ownerId,
            limit = 20,
            page = 1
        } = req.query;

        const offset = (page - 1) * limit;

        // Base query for owner revenue statistics
        let dateCondition = '';
        let groupByClause = '';
        let selectClause = '';

        // Configure date conditions and grouping based on period
        switch (period) {
            case 'daily':
                if (month) {
                    dateCondition = `AND EXTRACT(YEAR FROM b.booking_date) = ${year} AND EXTRACT(MONTH FROM b.booking_date) = ${month}`;
                    groupByClause = 'GROUP BY u.id, u.name, u.email, u."profileImage", DATE(b.booking_date)';
                    selectClause = 'DATE(b.booking_date) as period_date,';
                } else {
                    dateCondition = `AND EXTRACT(YEAR FROM b.booking_date) = ${year}`;
                    groupByClause = 'GROUP BY u.id, u.name, u.email, u."profileImage", DATE(b.booking_date)';
                    selectClause = 'DATE(b.booking_date) as period_date,';
                }
                break;
            case 'yearly':
                dateCondition = '';
                groupByClause = 'GROUP BY u.id, u.name, u.email, u."profileImage", EXTRACT(YEAR FROM b.booking_date)';
                selectClause = 'EXTRACT(YEAR FROM b.booking_date) as period_year,';
                break;
            default: // monthly
                dateCondition = `AND EXTRACT(YEAR FROM b.booking_date) = ${year}`;
                groupByClause = 'GROUP BY u.id, u.name, u.email, u."profileImage", EXTRACT(MONTH FROM b.booking_date)';
                selectClause = 'EXTRACT(MONTH FROM b.booking_date) as period_month,';
        }

        // Add owner filter if specified
        const ownerCondition = ownerId ? `AND u.id = ${ownerId}` : '';

        // Get detailed revenue data by owner
        const revenueQuery = `
            SELECT 
                u.id as owner_id,
                u.name as owner_name,
                u.email as owner_email,
                u."profileImage" as owner_avatar,
                ${selectClause}
                COUNT(DISTINCT f.id) as total_fields,
                SUM(b.total_price) as total_revenue,
                AVG(b.total_price) as avg_booking_value,
                COUNT(DISTINCT b.user_id) as unique_customers
            FROM users u
            JOIN fields f ON u.id = f.owner_id
            JOIN subfields sf ON f.id = sf.field_id
            JOIN timeslots ts ON sf.id = ts.sub_field_id
            JOIN bookings b ON ts.booking_id = b.id
            WHERE u.role = '${USER_ROLES.OWNER}'
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            ${dateCondition}
            ${ownerCondition}
            ${groupByClause}
            ORDER BY total_revenue DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            JOIN fields f ON u.id = f.owner_id
            JOIN subfields sf ON f.id = sf.field_id
            JOIN timeslots ts ON sf.id = ts.sub_field_id
            JOIN bookings b ON ts.booking_id = b.id
            WHERE u.role = '${USER_ROLES.OWNER}'
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            ${dateCondition}
            ${ownerCondition}
        `;

        // Get summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(DISTINCT u.id) as total_owners,
                COUNT(DISTINCT f.id) as total_fields,
                COUNT(DISTINCT b.id) as total_bookings,
                SUM(b.total_price) as total_revenue,
                AVG(b.total_price) as avg_booking_value,
                COUNT(DISTINCT b.user_id) as total_customers
            FROM users u
            JOIN fields f ON u.id = f.owner_id
            JOIN subfields sf ON f.id = sf.field_id
            JOIN timeslots ts ON sf.id = ts.sub_field_id
            JOIN bookings b ON ts.booking_id = b.id
            WHERE u.role = '${USER_ROLES.OWNER}'
            AND b.status IN ('confirmed', 'completed')
            AND b.payment_status IN ('paid', 'completed')
            ${dateCondition}
            ${ownerCondition}
        `;

        const [revenueData, countResult, summaryResult] = await Promise.all([
            sequelize.query(revenueQuery, { type: sequelize.QueryTypes.SELECT }),
            sequelize.query(countQuery, { type: sequelize.QueryTypes.SELECT }),
            sequelize.query(summaryQuery, { type: sequelize.QueryTypes.SELECT })
        ]);

        // Format the revenue data
        const formattedRevenueData = revenueData.map(item => {
            return {
                ownerId: item.owner_id,
                ownerName: item.owner_name,
                ownerEmail: item.owner_email,
                ownerAvatar: item.owner_avatar,
                ...(period === 'daily' && { periodDate: item.period_date }),
                ...(period === 'monthly' && { periodMonth: item.period_month }),
                ...(period === 'yearly' && { periodYear: item.period_year }),
                totalFields: parseInt(item.total_fields),
                totalRevenue: parseFloat(item.total_revenue || 0),
                avgBookingValue: parseFloat(item.avg_booking_value || 0),
                uniqueCustomers: parseInt(item.unique_customers)
            };
        });

        const totalCount = parseInt(countResult[0].total);
        const totalPages = Math.ceil(totalCount / limit);
        const summary = summaryResult[0];

        return res.json({
            success: true,
            data: {
                summary: {
                    totalOwners: parseInt(summary.total_owners),
                    totalFields: parseInt(summary.total_fields),
                    totalBookings: parseInt(summary.total_bookings),
                    totalRevenue: parseFloat(summary.total_revenue || 0),
                    avgBookingValue: parseFloat(summary.avg_booking_value || 0),
                    totalCustomers: parseInt(summary.total_customers)
                },
                owners: formattedRevenueData,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    totalPages: totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: {
                    period,
                    year: parseInt(year),
                    month: month ? parseInt(month) : null,
                    ownerId: ownerId ? parseInt(ownerId) : null
                }
            }
        });
    } catch (error) {
        console.error('Error in getFieldBookingRevenueStats:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Đã có lỗi xảy ra khi lấy thống kê doanh thu đặt sân',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

module.exports = {
    getDashboardStatistics,
    getMonthlyRevenueData,
    getTopFieldOwners,
    getPackageServiceStats,
    getFieldBookingRevenueStats
};
