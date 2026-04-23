/**
 * Database Optimization Utilities
 * Provides optimized query patterns and indexing strategies for booking system
 */

const { Op, QueryTypes, Transaction } = require('sequelize');
const { sequelize } = require('../config/db.config');
const cache = require('./cache');

class DatabaseOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes default cache
  }

  /**
   * Optimized booking lookup with eager loading and indexing
   */
  async findBookingWithRelations(bookingId, options = {}) {
    const cacheKey = `booking:${bookingId}:${JSON.stringify(options)}`;
    
    // Check cache first    // Lock subfields to prevent concurrent booking attempts
    const query = `
SELECT id, name, field_type 
      FROM subfields 
      WHERE id IN (:subFieldIds) AND field_id = :fieldId
      FOR UPDATE
    `;
    
    await sequelize.query(query, {
      replacements: { 
        subFieldIds: subFieldIds,
        fieldId: fieldId
      },
      type: QueryTypes.SELECT,
      transaction
    });
    
    console.log('🔒 Subfields locked for booking:', subFieldIds);
  }

  /**
   * Get detailed booking by ID with full field and customer information
   */
  static async getDetailedBooking(bookingId, options = {}) {
    if (!options.skipCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { Booking, TimeSlot, Field, SubField, User, Location } = require('../models');
    
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: TimeSlot,
          as: 'timeSlots',
          include: [
            {
              model: SubField,
              as: 'subfield',
              include: [
                {
                  model: Field,
                  as: 'field',
                  include: [
                    {
                      model: Location,
                      as: 'location',
                      attributes: ['address_text', 'city', 'district', 'ward']
                    }
                  ],
                  attributes: ['id', 'name', 'description', 'price_per_hour', 'images1']
                }
              ],
              attributes: ['id', 'name', 'field_type']
            }
          ],
          attributes: ['id', 'date', 'start_time', 'end_time', 'status']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      ...options
    });

    // Cache result for 2 minutes
    if (booking && !options.skipCache) {
      await cache.set(cacheKey, booking, 2 * 60);
    }

    return booking;
  }

  /**
   * Batch lookup for multiple bookings with optimized queries
   */
  async findBookingsByIds(bookingIds, options = {}) {
    if (!bookingIds || bookingIds.length === 0) {
      return [];
    }

    const { Booking, TimeSlot, Field, SubField, User } = require('../models');
    
    // Use raw query for better performance on large datasets
    const bookings = await Booking.findAll({
      where: {
        id: {
          [Op.in]: bookingIds
        }
      },
      include: [
        {
          model: TimeSlot,
          as: 'timeSlots',
          required: false,
          include: [
            {
              model: SubField,
              as: 'subfield',
              include: [
                {
                  model: Field,
                  as: 'field'
                }
              ],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      ...options
    });

    return bookings;
  }

  /**
   * Optimized availability check with proper indexing
   */
  async checkAvailabilityOptimized(fieldId, date, timeSlots) {
    const cacheKey = `availability:${fieldId}:${date}`;
    // Use raw SQL for better performance - Updated with user and booking info
    const query = `
      SELECT 
        ts.sub_field_id,
        ts.start_time,
        ts.end_time,
        ts.status,
        ts.booking_id,
        ts.maintenance_reason,
        ts.maintenance_until,
        sf.name as subfield_name,
        sf.field_type,
        b.status as booking_status,
        b.payment_status,
        b.total_price as final_price,
        b.customer_info,
        b.is_owner_booking,
        CASE 
          WHEN b.is_owner_booking = true THEN 
            COALESCE(
              (b.customer_info->>'name')::text,
              (b.customer_info->>'fullName')::text,
              'Khách vãng lai'
            )
          ELSE u.name
        END as customer_name,
        CASE 
          WHEN b.is_owner_booking = true THEN 
            (b.customer_info->>'phone')::text
          ELSE u.phone
        END as customer_phone,
        b.created_at as booking_date
      FROM timeslots ts
      INNER JOIN subfields sf ON ts.sub_field_id = sf.id
      LEFT JOIN bookings b ON ts.booking_id = b.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE sf.field_id = :fieldId 
        AND ts.date = :date
        AND (
          ts.status = 'maintenance' 
          OR (ts.status != 'available' AND ts.booking_id IS NOT NULL AND (b.status IS NULL OR b.status NOT IN ('cancelled')))
        )
      ORDER BY ts.sub_field_id, ts.start_time
    `;
     
    const unavailableSlots = await sequelize.query(query, {
      replacements: { fieldId, date },
      type: QueryTypes.SELECT
    });

    console.log(`🔧 Found ${unavailableSlots.length} unavailable slots:`);
    
    // Also check all timeslots for this field/date regardless of status
    const allSlotsQuery = `
      SELECT 
        ts.sub_field_id,
        ts.start_time,
        ts.end_time,
        ts.status,
        ts.date,
        sf.field_id,
        sf.name as subfield_name
      FROM timeslots ts
      INNER JOIN subfields sf ON ts.sub_field_id = sf.id
      WHERE sf.field_id = :fieldId 
        AND ts.date = :date
      ORDER BY ts.sub_field_id, ts.start_time
    `;
    
    const allSlots = await sequelize.query(allSlotsQuery, {
      replacements: { fieldId, date },
      type: QueryTypes.SELECT
    });
    
    console.log(`📊 All slots for field ${fieldId} on ${date} (${allSlots.length} total):`);
    allSlots.forEach(slot => {
      console.log(`   📍 ${slot.subfield_name} (${slot.sub_field_id}): ${slot.start_time}-${slot.end_time} [${slot.status}]`);
    });
    
    unavailableSlots.forEach(slot => {
      if (slot.status === 'maintenance') {
        console.log(`   ⚠️ MAINTENANCE: ${slot.subfield_name} (${slot.start_time}-${slot.end_time}) - ${slot.maintenance_reason}`);
      } else {
        console.log(`   📋 ${slot.status.toUpperCase()}: ${slot.subfield_name} (${slot.start_time}-${slot.end_time})`);
      }
    });

    // Cache for shorter time to allow faster updates
    await cache.set(cacheKey, unavailableSlots, 30); // Reduced from 60 to 30 seconds

    return this.filterAvailabilityForSlots(unavailableSlots, timeSlots);
  }

  /**
   * Filter availability results for specific time slots
   */
  filterAvailabilityForSlots(unavailableSlots, requestedSlots) {
    const conflicts = [];
    
    for (const requestedSlot of requestedSlots) {
      // Handle both formats: camelCase (subFieldId, startTime, endTime) and snake_case (sub_field_id, start_time, end_time)
      const subFieldId = requestedSlot.subFieldId || requestedSlot.sub_field_id;
      const startTime = requestedSlot.startTime || requestedSlot.start_time;
      const endTime = requestedSlot.endTime || requestedSlot.end_time;
      
      const conflict = unavailableSlots.find(slot => 
        slot.sub_field_id === subFieldId &&
        this.timeRangesOverlap(
          slot.start_time,
          slot.end_time,
          startTime,
          endTime
        )
      );
      
      if (conflict) {
        conflicts.push({
          subFieldId: conflict.sub_field_id,
          subFieldName: conflict.subfield_name,
          conflictingSlot: {
            startTime: conflict.start_time,
            endTime: conflict.end_time,
            bookingId: conflict.booking_id
          },
          requestedSlot: requestedSlot
        });
      }
    }

    return {
      isAvailable: conflicts.length === 0,
      conflicts,
      unavailableSlots
    };
  }

  /**
   * Check if two time ranges overlap
   */
  timeRangesOverlap(start1, end1, start2, end2) {
    // 🔧 HOTFIX: Normalize time strings before comparison
    const normalizeTime = (time) => {
      if (!time) return null;
      if (typeof time !== 'string') return String(time);
      if (time.length === 5) return time + ':00';
      return time;
    };
    
    const normalizedStart1 = normalizeTime(start1);
    const normalizedEnd1 = normalizeTime(end1);
    const normalizedStart2 = normalizeTime(start2);
    const normalizedEnd2 = normalizeTime(end2);
    
    console.log('🔧 timeRangesOverlap comparison:');
    console.log(`  Range 1: ${normalizedStart1} - ${normalizedEnd1}`);
    console.log(`  Range 2: ${normalizedStart2} - ${normalizedEnd2}`);
    
    // Convert to comparable format for proper time comparison
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1Minutes = timeToMinutes(normalizedStart1);
    const end1Minutes = timeToMinutes(normalizedEnd1);
    const start2Minutes = timeToMinutes(normalizedStart2);
    const end2Minutes = timeToMinutes(normalizedEnd2);
    
    console.log(`  Range 1 (minutes): ${start1Minutes} - ${end1Minutes}`);
    console.log(`  Range 2 (minutes): ${start2Minutes} - ${end2Minutes}`);
    
    // Check overlap: ranges overlap if start1 < end2 AND start2 < end1
    const overlaps = start1Minutes < end2Minutes && start2Minutes < end1Minutes;
    
    console.log(`  Overlap result: ${overlaps}`);
    console.log(`  Logic: (${start1Minutes} < ${end2Minutes}) AND (${start2Minutes} < ${end1Minutes})`);
    console.log(`  Logic: (${start1Minutes < end2Minutes}) AND (${start2Minutes < end1Minutes})`);
    
    return overlaps;
  }

  /**
   * Optimized booking status sync with minimal queries
   */
  async syncBookingStatusOptimized(bookingId) {
    const { Booking } = require('../models');
    
    // Use raw query for atomic operation
    const query = `
      UPDATE bookings 
      SET updated_at = NOW()
      WHERE id = :bookingId
      RETURNING id, status, payment_status, total_price, updated_at
    `;

    const result = await sequelize.query(query, {
      replacements: { bookingId },
      type: QueryTypes.UPDATE
    });

    if (result && result[0] && result[0].length > 0) {
      const booking = result[0][0];
      
      // Clear related caches
      await this.clearBookingCache(bookingId);
      
      return booking;
    }

    return null;
  }

  /**
   * Batch update booking statuses for performance
   */
  async batchUpdateBookingStatuses(updates) {
    if (!updates || updates.length === 0) {
      return [];
    }

    const { Booking } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      const promises = updates.map(update => 
        Booking.update(
          {
            status: update.status,
            payment_status: update.paymentStatus,
            updated_at: new Date()
          },
          {
            where: { id: update.bookingId },
            transaction
          }
        )
      );

      await Promise.all(promises);
      await transaction.commit();

      // Clear caches for all updated bookings
      const cachePromises = updates.map(update => 
        this.clearBookingCache(update.bookingId)
      );
      await Promise.all(cachePromises);

      return updates.map(update => update.bookingId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Clear all cached data related to a booking
   */
  async clearBookingCache(bookingId) {
    const patterns = [
      `booking:${bookingId}:*`,
      `booking_status:${bookingId}`,
      `payment_status:${bookingId}`
    ];

    for (const pattern of patterns) {
      cache.delPattern(pattern);
    }
  }

  /**
   * Get booking statistics with optimized aggregation
   */
  async getBookingStatsOptimized(options = {}) {
    const { dateRange, fieldId, userId } = options;
    
    let whereClause = '';
    let timeslotWhereClause = '';
    const replacements = {};

    if (dateRange) {
      whereClause += ' AND b.booking_date BETWEEN :startDate AND :endDate';
      timeslotWhereClause += ' AND b2.booking_date BETWEEN :startDate AND :endDate';
      replacements.startDate = dateRange.start;
      replacements.endDate = dateRange.end;
    }

    if (fieldId) {
      whereClause += ' AND EXISTS (SELECT 1 FROM timeslots ts INNER JOIN subfields sf ON ts.sub_field_id = sf.id WHERE ts.booking_id = b.id AND sf.field_id = :fieldId)';
      timeslotWhereClause += ' AND EXISTS (SELECT 1 FROM timeslots ts2 INNER JOIN subfields sf2 ON ts2.sub_field_id = sf2.id WHERE ts2.booking_id = b2.id AND sf2.field_id = :fieldId)';
      replacements.fieldId = fieldId;
    }

    if (userId) {
      whereClause += ' AND b.user_id = :userId';
      timeslotWhereClause += ' AND b2.user_id = :userId';
      replacements.userId = userId;
    }

    const query = `
      SELECT 
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) as paid_bookings,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as total_revenue,
        AVG(b.total_price) as average_booking_value,
        COALESCE(
          (SELECT COUNT(ts.id)
           FROM timeslots ts 
           INNER JOIN bookings b2 ON ts.booking_id = b2.id
           WHERE b2.status != 'cancelled' ${timeslotWhereClause}), 
          0
        ) as total_hours
      FROM bookings b
      WHERE 1=1 ${whereClause}
    `;

    const stats = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return stats[0] || {};
  }

  /**
   * Create database indexes for optimal performance
   */
  async createOptimalIndexes() {
    const indexes = [
      // Booking indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status ON bookings(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date ON bookings(booking_date)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at ON bookings(created_at)',
      
      // TimeSlot indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeslots_date_subfield ON timeslots(date, sub_field_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeslots_booking_id ON timeslots(booking_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeslots_available ON timeslots(status) WHERE status != \'available\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeslots_date_time ON timeslots(date, start_time, end_time)',
      
      // SubField indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subfields_field_id ON subfields(field_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subfields_type ON subfields(field_type)',
      
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeslots_subfield_available ON timeslots(sub_field_id, status, date)'
    ];

    const results = [];
    for (const indexQuery of indexes) {
      try {
        await sequelize.query(indexQuery);
        results.push({ query: indexQuery, status: 'success' });
      } catch (error) {
        console.warn('Index creation warning:', error.message);
        results.push({ query: indexQuery, status: 'warning', error: error.message });
      }
    }

    return results;
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(query, replacements = {}) {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    
    try {
      const result = await sequelize.query(explainQuery, {
        replacements,
        type: QueryTypes.SELECT
      });

      const plan = result[0];
      return {
        executionTime: plan['Execution Time'],
        planningTime: plan['Planning Time'],
        totalCost: plan.Plan['Total Cost'],
        suggestions: this.generateOptimizationSuggestions(plan)
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate optimization suggestions based on query plan
   */
  generateOptimizationSuggestions(plan) {
    const suggestions = [];
    
    // Check for sequential scans
    if (plan.Plan['Node Type'] === 'Seq Scan') {
      suggestions.push('Consider adding an index for the scanned table');
    }

    // Check for high cost operations
    if (plan.Plan['Total Cost'] > 1000) {
      suggestions.push('Query cost is high, consider query optimization');
    }

    // Check execution time
    if (plan['Execution Time'] > 100) {
      suggestions.push('Query execution time is high, consider adding indexes or optimizing joins');
    }

    return suggestions;
  }

  /**
   * Find recent duplicate bookings to prevent accidental double payments
   * Searches for bookings with the same field, date, customer email and similar amount
   * within the specified time window (default 30 seconds)
   * 
   * @param {string} fieldId - The ID of the field being booked
   * @param {Date|string} bookingDate - The booking date
   * @param {string} customerEmail - Customer's email address
   * @param {number} totalAmount - The total booking amount
   * @param {number} timeWindowMs - Time window in milliseconds to check for duplicates (default: 30000ms)
   * @returns {Promise<Object|null>} - Returns the duplicate booking if found, null otherwise
   */
  async findRecentDuplicateBooking(fieldId, bookingDate, customerEmail, totalAmount, timeWindowMs = 30000) {
    const { Booking, TimeSlot, SubField } = require('../models');

    // Convert date if it's a string
    if (typeof bookingDate === 'string') {
      bookingDate = new Date(bookingDate);
    }

    // Calculate time threshold (current time minus window)
    const timeThreshold = new Date(Date.now() - timeWindowMs);

    try {
      // First find all recent bookings by this customer email
      const recentBookings = await Booking.findAll({
        where: {
          [Op.and]: [
            // Match by customer email (either in user_id relation or in customer_info JSON)
            {
              [Op.or]: [
                sequelize.literal(`customer_info->>'email' = '${customerEmail}'`),
                // Also check customer_info as a string for different JSON formats
                sequelize.where(
                  sequelize.fn('LOWER', sequelize.cast(sequelize.col('customer_info'), 'text')),
                  'LIKE',
                  `%${customerEmail.toLowerCase()}%`
                )
              ]
            },
            // Recent bookings only (within time window)
            {
              created_at: { [Op.gte]: timeThreshold }
            },
            // Similar amount (within 1% tolerance)
            {
              total_price: {
                [Op.between]: [
                  totalAmount * 0.99, // 1% lower
                  totalAmount * 1.01  // 1% higher
                ]
              }
            }
          ]
        },
        include: [
          {
            model: TimeSlot,
            as: 'timeSlots',
            include: [
              {
                model: SubField,
                as: 'subfield',
                where: {
                  field_id: fieldId
                }
              }
            ]
          }
        ]
      });

      // If no bookings found, return null
      if (!recentBookings || recentBookings.length === 0) {
        return null;
      }

      // Check if any of the bookings is for the same date
      for (const booking of recentBookings) {
        // Skip if no time slots
        if (!booking.timeSlots || booking.timeSlots.length === 0) {
          continue;
        }

        // Check if any time slot matches the booking date
        for (const timeSlot of booking.timeSlots) {
          // Compare dates (ignore time part)
          const slotDate = new Date(timeSlot.date);
          if (
            slotDate.getFullYear() === bookingDate.getFullYear() &&
            slotDate.getMonth() === bookingDate.getMonth() &&
            slotDate.getDate() === bookingDate.getDate()
          ) {
            return booking; // Found a duplicate
          }
        }
      }

      return null; // No duplicate found
    } catch (error) {
      console.error('Error checking for recent duplicate bookings:', error);
      return null;
    }
  }

  /**
   * Atomic booking creation with conflict prevention
   * This function combines availability check and booking creation in a single transaction
   * to prevent race conditions and double-booking
   */
  async createBookingAtomically(fieldId, bookingDate, timeSlots, bookingData) {
    const { Booking, TimeSlot, SubField } = require('../models');
    
    // Use SERIALIZABLE isolation level to prevent phantom reads and ensure atomicity
    const transaction = await sequelize.transaction({ 
      isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE 
    });
    
    try {
      console.log('🔒 Starting atomic booking creation with SERIALIZABLE transaction');
      
      // Step 1: Pre-lock all subfields to prevent concurrent booking attempts
      await this.lockSubfieldsForBooking(fieldId, timeSlots, transaction);
      
      // Step 2: Check availability within transaction with row locking
      const conflicts = await this.checkAvailabilityWithLocking(
        fieldId, 
        bookingDate, 
        timeSlots, 
        transaction
      );
      
      if (conflicts.length > 0) {
        console.log('❌ Conflicts detected during atomic check:', conflicts);
        await transaction.rollback();
        
        return {
          error: 'CONFLICT',
          code: 409,
          message: `Khung giờ ${conflicts[0].requestedSlot.start_time || 'không xác định'} đã được đặt`,
          details: conflicts
        };
      }
      
      // Step 3: Create booking within transaction
      console.log('✅ No conflicts detected, creating booking...');
      const booking = await Booking.create(bookingData, { transaction });
      
      // Step 4: IMMEDIATELY create timeslots to lock the slots (this is the key!)
      const timeSlotData = timeSlots.map(timeSlot => ({
        start_time: timeSlot.start_time,
        end_time: timeSlot.end_time,
        date: bookingDate,
        sub_field_id: timeSlot.sub_field_id,
        booking_id: booking.id,
        status: 'booked'  // Lock the slot immediately
      }));
      
      await TimeSlot.bulkCreate(timeSlotData, { 
        transaction,
        // Ensure we fail fast if there's a unique constraint violation
        ignoreDuplicates: false,
        validate: true
      });
      
      console.log('✅ Timeslots created and locked successfully');
      
      // Step 5: Commit transaction (slots are now locked)
      await transaction.commit();
      console.log('✅ Transaction committed - booking created with locked timeslots');
      
      // Clear relevant caches after successful booking
      await this.clearAvailabilityCache(fieldId, bookingDate);
      
      return booking;
      
    } catch (error) {
      console.error('❌ Error in atomic booking creation:', error);
      
      // Only rollback if transaction is still active
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      
      // Handle specific database constraint violations
      if (error.name === 'SequelizeUniqueConstraintError' || 
          error.original?.code === '23505' || // PostgreSQL unique violation
          error.original?.errno === 1062 ||   // MySQL duplicate entry
          error.message.includes('duplicate') || 
          error.message.includes('unique') ||
          error.message.includes('UNIQUE constraint')) {
        
        console.log('🚨 Detected duplicate booking attempt via database constraint');
        return {
          error: 'CONFLICT',
          code: 409, 
          message: 'Khung giờ đã được đặt bởi người dùng khác trong cùng thời điểm',
          details: [{
            error: 'Database constraint violation - timeslot already booked',
            timeSlots: timeSlots,
            originalError: error.message
          }]
        };
      }
      
      // Handle deadlock errors
      if (error.original?.code === '40P01' || // PostgreSQL deadlock
          error.original?.errno === 1213 ||   // MySQL deadlock
          error.message.includes('deadlock')) {
        
        console.log('🔄 Deadlock detected, this is expected under high concurrency');
        return {
          error: 'CONFLICT',
          code: 409,
          message: 'Hệ thống đang xử lý nhiều yêu cầu. Vui lòng thử lại.',
          details: [{
            error: 'Database deadlock - concurrent booking attempt',
            timeSlots: timeSlots
          }]
        };
      }
      
      throw error;
    }
  }

  /**
   * Lock subfields before checking availability to prevent race conditions
   */
  async lockSubfieldsForBooking(fieldId, timeSlots, transaction) {
    const subFieldIds = [...new Set(timeSlots.map(slot => slot.sub_field_id))];
    
    // Lock the subfields with SELECT FOR UPDATE to prevent concurrent operations
    const query = `
      SELECT id, name, field_type 
      FROM subfields 
      WHERE id IN (:subFieldIds) AND field_id = :fieldId
      FOR UPDATE
    `;
    
    await sequelize.query(query, {
      replacements: { 
        subFieldIds: subFieldIds,
        fieldId: fieldId
      },
      type: QueryTypes.SELECT,
      transaction
    });
    
    console.log('🔒 Subfields locked for booking:', subFieldIds);
  }

  /**
   * Check availability with row-level locking to prevent race conditions
   * This uses SELECT FOR UPDATE to lock existing timeslots during the check
   */
  async checkAvailabilityWithLocking(fieldId, date, timeSlots, transaction) {
    const conflicts = [];
    
    console.log('🔍 Checking availability with locking for timeslots:', timeSlots);
    
    // 🔧 HOTFIX: Normalize time formats to prevent string comparison issues
    const normalizeTime = (time) => {
      if (!time) {
        console.log('❌ WARNING: Time is undefined/null:', time);
        return null;
      }
      if (typeof time !== 'string') {
        console.log('❌ WARNING: Time is not a string:', time, typeof time);
        return String(time);
      }
      if (time.length === 5) return time + ':00';
      return time;
    };
    
    for (const requestedSlot of timeSlots) {
      console.log('🔧 DEBUG: Processing slot:', requestedSlot);
      console.log('🔧 DEBUG: Slot keys:', Object.keys(requestedSlot));
      console.log('🔧 DEBUG: start_time value:', requestedSlot.start_time, typeof requestedSlot.start_time);
      console.log('🔧 DEBUG: end_time value:', requestedSlot.end_time, typeof requestedSlot.end_time);
      
      // 🔧 HOTFIX: Ensure consistent time format before SQL query
      const normalizedSlot = {
        ...requestedSlot,
        start_time: normalizeTime(requestedSlot.start_time),
        end_time: normalizeTime(requestedSlot.end_time)
      };
      
      console.log('🔧 Original slot:', requestedSlot);
      console.log('🔧 Normalized slot:', normalizedSlot);
      
      // Validate normalized slot
      if (!normalizedSlot.start_time || !normalizedSlot.end_time) {
        console.log('❌ ERROR: Normalized slot has undefined time values');
        conflicts.push({
          subFieldId: requestedSlot.sub_field_id,
          error: 'INVALID_TIME_FORMAT',
          message: `Invalid time format: start_time=${normalizedSlot.start_time}, end_time=${normalizedSlot.end_time}`,
          requestedSlot: requestedSlot
        });
        continue;
      }
      // Use SELECT FOR UPDATE to lock rows and prevent concurrent modifications
      // This query finds any existing timeslots that overlap with the requested slot
      const query = `
        SELECT 
          ts.id,
          ts.sub_field_id,
          ts.start_time,
          ts.end_time,
          ts.booking_id,
          ts.status,
          sf.name as subfield_name,
          b.status as booking_status,
          b.payment_status as payment_status
        FROM timeslots ts
        INNER JOIN subfields sf ON ts.sub_field_id = sf.id
        LEFT JOIN bookings b ON ts.booking_id = b.id
        WHERE sf.field_id = :fieldId 
          AND ts.date = :date
          AND ts.sub_field_id = :subFieldId
          AND ts.status != 'available'
          AND (
            -- Check for time overlap: slot conflicts if it starts before requested ends 
            -- and ends after requested starts
            (ts.start_time < :endTime AND ts.end_time > :startTime)
          )
          -- Only consider active bookings (not cancelled)
          AND (b.status IS NULL OR b.status NOT IN ('cancelled'))
        -- Lock only the timeslots table to avoid outer join issue
        FOR UPDATE OF ts NOWAIT
      `;
      
      try {
        console.log('🔍 Executing overlap check query with params:', {
          fieldId,
          date,
          subFieldId: normalizedSlot.sub_field_id,
          startTime: normalizedSlot.start_time,
          endTime: normalizedSlot.end_time
        });

        const conflictingSlots = await sequelize.query(query, {
          replacements: { 
            fieldId, 
            date,
            subFieldId: normalizedSlot.sub_field_id,
            startTime: normalizedSlot.start_time,
            endTime: normalizedSlot.end_time
          },
          type: QueryTypes.SELECT,
          transaction
        });
        
        console.log('🔍 Query result - conflicting slots found:', conflictingSlots.length);
        if (conflictingSlots.length > 0) {
          console.log('❌ Conflicting slot details:', conflictingSlots[0]);
          console.log('❌ Overlap logic check:');
          console.log(`  Existing: ${conflictingSlots[0].start_time} - ${conflictingSlots[0].end_time}`);
          console.log(`  Requested: ${normalizedSlot.start_time} - ${normalizedSlot.end_time}`);
          console.log(`  Logic: (${conflictingSlots[0].start_time} < ${normalizedSlot.end_time}) AND (${conflictingSlots[0].end_time} > ${normalizedSlot.start_time})`);
          console.log(`  Result: (${conflictingSlots[0].start_time < normalizedSlot.end_time}) AND (${conflictingSlots[0].end_time > normalizedSlot.start_time})`);
        }
        
        if (conflictingSlots.length > 0) {
          console.log('❌ Found conflicting slots:', conflictingSlots);
          
          conflicts.push({
            subFieldId: normalizedSlot.sub_field_id,
            subFieldName: conflictingSlots[0].subfield_name,
            conflictingSlot: {
              id: conflictingSlots[0].id,
              startTime: conflictingSlots[0].start_time,
              endTime: conflictingSlots[0].end_time,
              bookingId: conflictingSlots[0].booking_id,
              isAvailable: conflictingSlots[0].status === 'available',
              bookingStatus: conflictingSlots[0].booking_status,
              paymentStatus: conflictingSlots[0].payment_status
            },
            requestedSlot: normalizedSlot
          });
        } else {
          console.log('✅ No conflicts found for slot:', normalizedSlot);
        }
        
      } catch (error) {
        // Handle lock timeout or deadlock
        if (error.original?.code === '55P03' || // PostgreSQL lock timeout
            error.original?.errno === 1205 ||   // MySQL lock timeout  
            error.message.includes('timeout') ||
            error.message.includes('NOWAIT')) {
          
          console.log('🔒 Lock timeout detected, treating as conflict');
          conflicts.push({
            subFieldId: normalizedSlot.sub_field_id,
            subFieldName: 'Unknown (lock timeout)',
            conflictingSlot: {
              error: 'Lock timeout - slot likely being booked by another user',
              lockTimeout: true
            },
            requestedSlot: normalizedSlot
          });
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    }
    
    console.log(`🔍 Availability check completed. Found ${conflicts.length} conflicts.`);
    return conflicts;
  }

  /**
   * Clear availability cache for a specific field and date
   */
  async clearAvailabilityCache(fieldId, date) {
    const cacheKey = `availability:${fieldId}:${date}`;
    await cache.del(cacheKey);
    console.log(`🗑️ Cleared availability cache for field ${fieldId} on ${date}`);
  }

  /**
   * Clear availability cache for all dates of a field
   */
  async clearFieldCache(fieldId) {
    // Get all cache keys that match the pattern
    const pattern = `availability:${fieldId}:*`;
    await cache.delPattern(pattern);
    console.log(`🗑️ Cleared all availability cache for field ${fieldId}`);
  }

  /**
   * Clean up expired or abandoned booking sessions
   * This function removes bookings that have been pending payment for too long
   */
  async cleanupExpiredBookings() {
    const { Booking, TimeSlot } = require('../models');
    const transaction = await sequelize.transaction();
    
    try {
      // Find bookings that are pending payment for more than 10 minutes
      const expiredBookings = await Booking.findAll({
        where: {
          status: 'payment_pending',
          payment_status: 'pending',
          created_at: {
            [Op.lt]: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
          }
        },
        transaction
      });
      
      if (expiredBookings.length === 0) {
        await transaction.commit();
        return { cleaned: 0 };
      }
      
      const expiredBookingIds = expiredBookings.map(booking => booking.id);
      
      // Delete associated timeslots to free up availability
      const deletedTimeslots = await TimeSlot.destroy({
        where: {
          booking_id: {
            [Op.in]: expiredBookingIds
          }
        },
        transaction
      });
      
      // Update booking status to cancelled instead of deleting (for audit trail)
      const updatedBookings = await Booking.update(
        { 
          status: 'cancelled',
          updated_at: new Date()
        },
        {
          where: {
            id: {
              [Op.in]: expiredBookingIds
            }
          },
          transaction
        }
      );
      
      await transaction.commit();
      
      // Clear availability caches for affected fields
      const cachePromises = expiredBookings.map(booking => {
        // Extract field info from booking to clear relevant caches
        // This assumes we can derive the field from the booking data
        return this.clearBookingCache(booking.id);
      });
      
      await Promise.all(cachePromises);
      
      console.log(`Cleaned up ${expiredBookings.length} expired bookings and ${deletedTimeslots} timeslots`);
      
      return {
        cleaned: expiredBookings.length,
        timeslotsFreed: deletedTimeslots
      };
      
    } catch (error) {
      // Only rollback if transaction is still active
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('Error cleaning up expired bookings:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic cleanup of expired bookings
   * Should be called when the application starts
   */
  startPeriodicCleanup() {
    // Run cleanup every 5 minutes
    const cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredBookings();
      } catch (error) {
        console.error('Periodic cleanup failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Also run an immediate cleanup on startup
    this.cleanupExpiredBookings().catch(error => {
      console.error('Initial cleanup failed:', error);
    });
    
    return cleanupInterval;
  }

  /**
   * Get user bookings with optimized query and eager loading
   */
  async getUserBookingsOptimized(userId, options = {}) {
    const { Booking, TimeSlot, Field, SubField, User, Location } = require('../models');
    
    const cacheKey = `user_bookings:${userId}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (!options.skipCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { limit = 50, offset = 0, status, dateRange } = options;
    
    let whereClause = { user_id: userId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (dateRange) {
      whereClause.booking_date = {
        [Op.between]: [dateRange.start, dateRange.end]
      };
    }

    console.log('getUserBookingsOptimized - Fetching bookings with userId:', userId);

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: TimeSlot,
          as: 'timeSlots', // Use correct alias
          include: [
            {
              model: SubField,
              as: 'subfield', // Use explicit alias
              include: [
                {
                  model: Field,
                  as: 'field', // Use explicit alias
                  include: [
                    {
                      model: Location,
                      as: 'location', // Use explicit alias
                      attributes: ['address_text', 'city', 'district', 'ward']
                    }
                  ],
                  attributes: ['id', 'name', 'description', 'price_per_hour', 'images1']
                }
              ],
              attributes: ['id', 'name', 'field_type']
            }
          ],
          attributes: ['id', 'date', 'start_time', 'end_time', 'status', 'sub_field_id']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    console.log(`getUserBookingsOptimized - Found ${bookings.length} bookings for user ${userId}`);

    // Transform data for frontend - use Promise.all to handle async operations
    const transformedBookings = await Promise.all(bookings.map(async (booking, index) => {
      console.log(`Processing booking ${index + 1}:`, {
        id: booking.id,
        timeSlots: booking.timeSlots?.length || 0,
        bookingMetadata: booking.booking_metadata
      });

      // Use correct accessor for TimeSlots
      const timeSlots = booking.timeSlots || [];
      const firstTimeSlot = timeSlots[0];
      
      // Try to get field info from booking metadata first, then from relationships
      let field = null;
      let subField = null;
      let location = null;

      if (firstTimeSlot) {
        subField = firstTimeSlot.subfield;
        if (subField) {
          field = subField.field;
          if (field) {
            location = field.location;
          }
        }
      }

      // Fallback to booking metadata if relationships are not loaded
      let fallbackFieldInfo = null;
      if (!field && booking.booking_metadata?.fieldId) {
        console.log('Using fallback to booking metadata for field info');
        // Try to fetch field info from metadata
        fallbackFieldInfo = await this.getFieldInfoFromMetadata(booking.booking_metadata);
      }

      const result = {
        id: booking.id,
        booking_date: booking.booking_date,
        fieldId: field?.id || booking.booking_metadata?.fieldId || fallbackFieldInfo?.fieldId || null, // Always include fieldId at top-level
        fieldName: field?.name || fallbackFieldInfo?.fieldName || 'Sân không xác định',
        fieldType: subField?.field_type || fallbackFieldInfo?.fieldType || 'Không xác định',
        fieldNumber: subField?.name || fallbackFieldInfo?.fieldNumber || 'N/A',
        fieldLocation: location ? `${location.district}, ${location.city}` : fallbackFieldInfo?.fieldLocation || 'Không xác định',
        date: firstTimeSlot?.date || booking.booking_date,
        timeSlots: timeSlots.length > 0 ? timeSlots.map(ts => `${ts.start_time} - ${ts.end_time}`) : (fallbackFieldInfo?.timeSlots || []),
        totalPrice: parseFloat(booking.total_price),
        status: booking.status,
        paymentStatus: booking.payment_status,
        bookingDate: booking.created_at,
        customerInfo: booking.customer_info || {},
        images: field?.images1 ? field.images1.split(',') : fallbackFieldInfo?.images || [],
        // Include raw timeslots data for frontend processing
        timeslots: timeSlots.length > 0 ? timeSlots.map(ts => ({
          id: ts.id,
          date: ts.date,
          start_time: ts.start_time,
          end_time: ts.end_time,
          sub_field_id: ts.sub_field_id,
          subfield: ts.subfield
        })) : (fallbackFieldInfo?.timeslots || [])
      };

      console.log('Transformed booking result:', {
        id: result.id,
        fieldName: result.fieldName,
        timeSlots: result.timeSlots
      });

      return result;
    }));

    // Cache for 2 minutes
    if (!options.skipCache) {
      await cache.set(cacheKey, transformedBookings, 2 * 60);
    }

    console.log(`getUserBookingsOptimized - Returning ${transformedBookings.length} transformed bookings`);
    return transformedBookings;
  }

  /**
   * Get field information from booking metadata when relationships are missing
   */
  async getFieldInfoFromMetadata(metadata) {
    if (!metadata || !metadata.fieldId) {
      return null;
    }

    try {
      // First, try to use cached field info from metadata if available
      if (metadata.fieldName && metadata.fieldLocation) {
        console.log('Using cached field info from booking metadata');
        
        // Format time slots from metadata
        let timeSlots = [];
        let timeslots = [];
        if (metadata.timeSlots && Array.isArray(metadata.timeSlots)) {
          timeSlots = metadata.timeSlots.map(ts => `${ts.start_time} - ${ts.end_time}`);
          timeslots = metadata.timeSlots.map((ts, index) => ({
            id: ts.id || null,
            date: metadata.playDate,
            start_time: ts.start_time,
            end_time: ts.end_time,
            sub_field_id: ts.sub_field_id || metadata.subFieldIds?.[0],
            subfield: metadata.subFields?.[0] || null
          }));
        }

        return {
          fieldName: metadata.fieldName,
          fieldType: metadata.subFields?.[0]?.field_type || 'Sân bóng đá',
          fieldNumber: metadata.subFields?.[0]?.name || 'N/A',
          fieldLocation: metadata.fieldLocation ? 
            `${metadata.fieldLocation.district}, ${metadata.fieldLocation.city}` : 
            'Không xác định',
          images: metadata.fieldImages ? metadata.fieldImages.split(',') : [],
          timeSlots,
          timeslots
        };
      }

      // Fallback: fetch from database if metadata is incomplete
      console.log('Fetching field info from database using metadata fallback');
      const { Field, SubField, Location } = require('../models');
      
      // Fetch field info directly from database using metadata
      const field = await Field.findByPk(metadata.fieldId, {
        include: [
          {
            model: Location,
            as: 'location',
            attributes: ['address_text', 'city', 'district', 'ward']
          }
        ],
        attributes: ['id', 'name', 'description', 'price_per_hour', 'images1']
      });

      if (!field) {
        console.log('Field not found in database using metadata fieldId:', metadata.fieldId);
        return null;
      }

      // Try to get subfield info if available
      let subFieldInfo = null;
      if (metadata.subFieldIds && metadata.subFieldIds.length > 0) {
        const subField = await SubField.findByPk(metadata.subFieldIds[0], {
          attributes: ['id', 'name', 'field_type']
        });
        subFieldInfo = subField;
      }

      // Format time slots from metadata - this is the key fix!
      let timeSlots = [];
      let timeslots = [];
      if (metadata.timeSlots && Array.isArray(metadata.timeSlots)) {
        console.log('Processing timeSlots from metadata:', metadata.timeSlots);
        timeSlots = metadata.timeSlots.map(ts => `${ts.start_time} - ${ts.end_time}`);
        timeslots = metadata.timeSlots.map((ts, index) => ({
          id: ts.id || `fallback-${index}`,
          date: metadata.playDate,
          start_time: ts.start_time,
          end_time: ts.end_time,
          sub_field_id: ts.sub_field_id || metadata.subFieldIds?.[0],
          subfield: subFieldInfo
        }));
        console.log('Formatted timeSlots:', timeSlots);
        console.log('Formatted timeslots:', timeslots);
      }

      return {
        fieldName: field.name,
        fieldType: subFieldInfo?.field_type || 'Sân bóng đá',
        fieldNumber: subFieldInfo?.name || 'N/A',
        fieldLocation: field.location ? `${field.location.district}, ${field.location.city}` : 'Không xác định',
        images: field.images1 ? field.images1.split(',') : [],
        timeSlots,
        timeslots
      };

    } catch (error) {
      console.error('Error getting field info from metadata:', error);
      return null;
    }
  }

  /**
   * Get display status for a time slot based on booking and payment status
   */
  getSlotDisplayStatus(slot) {
    // PRIORITY 1: If maintenance, return maintenance status regardless of booking
    if (slot.status === 'maintenance') {
      return 'maintenance';
    }

    // PRIORITY 2: If no booking, slot is available
    if (!slot.booking_id) {
      return 'available';
    }

    // PRIORITY 3: Check booking status
    if (slot.booking_status === 'cancelled') {
      return 'available';
    }

    if (slot.booking_status === 'confirmed') {
      return 'booked';
    }

    if (slot.booking_status === 'payment_pending') {
      return 'payment_pending';
    }

    // Default for other booking statuses
    if (slot.booking_status) {
      return 'booked';
    }

    return 'available';
  }

  /**
   * Check if payment pending has expired (10 minutes from booking creation)
   */
  isPaymentPendingExpired(bookingDate) {
    if (!bookingDate) {
      return false;
    }

    const bookingTime = new Date(bookingDate);
    const now = new Date();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes

    return (now.getTime() - bookingTime.getTime()) > tenMinutesInMs;
  }
}

// Export both the class and an instance for different use cases
module.exports = new DatabaseOptimizer();
module.exports.DatabaseOptimizer = DatabaseOptimizer;
