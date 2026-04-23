/**
 * Database Index Creation Script
 * Creates optimal indexes for booking and payment performance
 */

const { sequelize } = require('../config/db.config');

/**
 * Creates all necessary indexes for optimal performance
 */
async function createOptimalIndexes() {
    try {
        console.log('🔧 Creating database indexes for optimal performance...');

        // First, let's check what tables actually exist
        const dialect = sequelize.getDialect();
        let tableQuery;
        
        if (dialect === 'postgres') {
            tableQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
        } else if (dialect === 'mysql') {
            tableQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()";
        } else {
            tableQuery = "SELECT name as table_name FROM sqlite_master WHERE type='table'";
        }

        const [tables] = await sequelize.query(tableQuery);
        const tableNames = tables.map(t => t.table_name || t.name).filter(Boolean);
        
        console.log('Available tables:', tableNames);

        // Create indexes only for existing tables
        if (tableNames.includes('Bookings') || tableNames.includes('bookings')) {
            const bookingTable = tableNames.find(t => t.toLowerCase() === 'bookings') || 'Bookings';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
                ON "${bookingTable}"(user_id, status);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
                ON "${bookingTable}"(payment_status);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
                ON "${bookingTable}"(created_at);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_bookings_booking_date 
                ON "${bookingTable}"(booking_date);
            `);

            console.log('✅ Booking indexes created');
        }

        // TimeSlot table indexes
        if (tableNames.includes('TimeSlots') || tableNames.includes('time_slots')) {
            const timeSlotTable = tableNames.find(t => t.toLowerCase().includes('timeslot') || t.toLowerCase().includes('time_slot')) || 'TimeSlots';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_timeslots_availability 
                ON "${timeSlotTable}"(sub_field_id, date, start_time, status);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_timeslots_booking_lookup 
                ON "${timeSlotTable}"(booking_id, date);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_timeslots_date_time 
                ON "${timeSlotTable}"(date, start_time);
            `);

            console.log('✅ TimeSlot indexes created');
        }

        // Field table indexes
        if (tableNames.includes('Fields') || tableNames.includes('fields')) {
            const fieldTable = tableNames.find(t => t.toLowerCase() === 'fields') || 'Fields';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_fields_active 
                ON "${fieldTable}"(id, is_active);
            `);

            console.log('✅ Field indexes created');
        }

        // SubField table indexes
        if (tableNames.includes('SubFields') || tableNames.includes('sub_fields')) {
            const subFieldTable = tableNames.find(t => t.toLowerCase().includes('subfield') || t.toLowerCase().includes('sub_field')) || 'SubFields';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_subfields_field 
                ON "${subFieldTable}"(field_id, is_active);
            `);

            console.log('✅ SubField indexes created');
        }

        // Payment table indexes
        if (tableNames.includes('Payments') || tableNames.includes('payments')) {
            const paymentTable = tableNames.find(t => t.toLowerCase() === 'payments') || 'Payments';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_payments_booking 
                ON "${paymentTable}"(booking_id, status);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_payments_stripe 
                ON "${paymentTable}"(stripe_payment_intent_id);
            `);

            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_payments_created_status 
                ON "${paymentTable}"(created_at, status);
            `);

            console.log('✅ Payment indexes created');
        }

        // User table indexes
        if (tableNames.includes('Users') || tableNames.includes('users')) {
            const userTable = tableNames.find(t => t.toLowerCase() === 'users') || 'Users';
            
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_users_email_active 
                ON "${userTable}"(email, is_active);
            `);

            console.log('✅ User indexes created');
        }

        console.log('✅ All available database indexes created successfully!');
        
        // Analyze tables for optimal query planning (PostgreSQL only)
        if (dialect === 'postgres') {
            for (const tableName of tableNames) {
                await analyzeTable(tableName);
            }
            console.log('✅ Database analysis completed!');
        }

    } catch (error) {
        console.error('❌ Error creating indexes:', error.message);
        console.log('Note: Some indexes may not be created due to table structure differences');
        // Don't throw error - this is non-critical for functionality
    }
}

/**
 * Analyze table statistics for optimal query planning
 */
async function analyzeTable(tableName) {
    try {
        await sequelize.query(`ANALYZE ${tableName};`);
        console.log(`📊 Analyzed table: ${tableName}`);
    } catch (error) {
        console.log(`Note: ANALYZE command not supported for ${tableName} (MySQL/SQLite)`);
    }
}

/**
 * Check current index status
 */
async function checkIndexStatus() {
    try {
        console.log('📋 Checking current index status...');

        // Get database type
        const dialect = sequelize.getDialect();
        
        let indexQuery;
        if (dialect === 'postgres') {
            indexQuery = `
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename IN ('bookings', 'time_slots', 'payments', 'fields', 'sub_fields', 'users')
                ORDER BY tablename, indexname;
            `;
        } else if (dialect === 'mysql') {
            indexQuery = `
                SELECT 
                    TABLE_SCHEMA,
                    TABLE_NAME,
                    INDEX_NAME,
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_NAME IN ('bookings', 'time_slots', 'payments', 'fields', 'sub_fields', 'users')
                ORDER BY TABLE_NAME, INDEX_NAME;
            `;
        } else {
            console.log('Index status check not available for this database type');
            return;
        }

        const [results] = await sequelize.query(indexQuery);
        
        console.log('Current indexes:');
        console.table(results);

    } catch (error) {
        console.error('Error checking index status:', error);
    }
}

/**
 * Drop all custom indexes (for cleanup)
 */
async function dropCustomIndexes() {
    try {
        console.log('🗑️ Dropping custom indexes...');

        const indexesToDrop = [
            'idx_bookings_user_status',
            'idx_bookings_payment_status',
            'idx_bookings_created_at',
            'idx_bookings_booking_date',
            'idx_bookings_customer_email',
            'idx_timeslots_availability',
            'idx_timeslots_booking_lookup',
            'idx_timeslots_date_time',
            'idx_fields_active',
            'idx_subfields_field',
            'idx_payments_booking',
            'idx_payments_stripe',
            'idx_payments_created_status',
            'idx_users_email_active',
            'idx_bookings_composite_lookup',
            'idx_timeslots_composite_availability',
            'idx_bookings_customer_gin'
        ];

        for (const indexName of indexesToDrop) {
            try {
                await sequelize.query(`DROP INDEX IF EXISTS ${indexName};`);
                console.log(`✅ Dropped index: ${indexName}`);
            } catch (error) {
                console.log(`Note: Could not drop ${indexName} (may not exist)`);
            }
        }

        console.log('✅ Custom indexes cleanup completed!');

    } catch (error) {
        console.error('❌ Error dropping indexes:', error);
        throw error;
    }
}

module.exports = {
    createOptimalIndexes,
    checkIndexStatus,
    dropCustomIndexes,
    analyzeTable
};

// If run directly, create indexes
if (require.main === module) {
    createOptimalIndexes()
        .then(() => {
            console.log('Index creation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Index creation failed:', error);
            process.exit(1);
        });
}
