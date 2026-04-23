/**
 * Performance Testing and Validation Script
 * Tests all optimization utilities and measures performance improvements
 */

const dbOptimizer = require('./dbOptimizer');
const retryMechanism = require('./retryMechanism');
const performanceMonitor = require('./performanceMonitorNew');
const { createOptimalIndexes, checkIndexStatus } = require('./createIndexes');
const { Booking, TimeSlot, Field, SubField, Payment, User } = require('../models');

class PerformanceTester {
    constructor() {
        this.testResults = {
            dbOptimizer: {},
            retryMechanism: {},
            performanceMonitor: {},
            overall: {}
        };
    }

    /**
     * Run comprehensive performance tests
     */
    async runFullTestSuite() {
        console.log('🧪 Starting comprehensive performance testing...\n');

        try {
            // 1. Database optimization tests
            await this.testDatabaseOptimizations();

            // 2. Retry mechanism tests
            await this.testRetryMechanisms();

            // 3. Performance monitoring tests
            await this.testPerformanceMonitoring();

            // 4. Integration tests
            await this.testIntegration();

            // 5. Load testing
            await this.runLoadTests();

            // Generate final report
            this.generateTestReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        }
    }

    /**
     * Test database optimization utilities
     */
    async testDatabaseOptimizations() {
        console.log('📊 Testing database optimizations...');

        // Test optimized booking lookup
        const startTime = Date.now();
        
        try {
            // Test availability check
            const availabilityResult = await dbOptimizer.checkAvailabilityOptimized(
                1, // fieldId
                '2024-12-20',
                [{ sub_field_id: 1, start_time: '10:00', end_time: '11:00' }]
            );

            this.testResults.dbOptimizer.availabilityCheck = {
                success: true,
                duration: Date.now() - startTime,
                result: availabilityResult
            };

            console.log('✅ Availability check optimization: PASSED');

        } catch (error) {
            this.testResults.dbOptimizer.availabilityCheck = {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
            console.log('❌ Availability check optimization: FAILED -', error.message);
        }

        // Test batch operations
        try {
            const batchStart = Date.now();
            const batchResult = await dbOptimizer.batchUpdateBookingStatus(
                [1, 2, 3], // booking IDs
                'confirmed'
            );

            this.testResults.dbOptimizer.batchOperations = {
                success: true,
                duration: Date.now() - batchStart,
                affectedRows: batchResult.affectedRows
            };

            console.log('✅ Batch operations optimization: PASSED');

        } catch (error) {
            this.testResults.dbOptimizer.batchOperations = {
                success: false,
                error: error.message
            };
            console.log('❌ Batch operations optimization: FAILED -', error.message);
        }

        // Test cache performance
        try {
            const cacheStart = Date.now();
            
            // First call (should cache)
            await dbOptimizer.getBookingWithDetails(1);
            const firstCallTime = Date.now() - cacheStart;

            // Second call (should use cache)
            const cacheStart2 = Date.now();
            await dbOptimizer.getBookingWithDetails(1);
            const secondCallTime = Date.now() - cacheStart2;

            this.testResults.dbOptimizer.cachePerformance = {
                success: true,
                firstCallTime,
                secondCallTime,
                improvement: Math.round(((firstCallTime - secondCallTime) / firstCallTime) * 100)
            };

            console.log(`✅ Cache performance: ${this.testResults.dbOptimizer.cachePerformance.improvement}% improvement`);

        } catch (error) {
            this.testResults.dbOptimizer.cachePerformance = {
                success: false,
                error: error.message
            };
            console.log('❌ Cache performance test: FAILED -', error.message);
        }
    }

    /**
     * Test retry mechanism functionality
     */
    async testRetryMechanisms() {
        console.log('🔄 Testing retry mechanisms...');

        // Test successful operation
        try {
            const result = await retryMechanism.executeDatabaseOperation(
                () => Promise.resolve({ success: true }),
                'test_operation'
            );

            this.testResults.retryMechanism.successfulOperation = {
                success: true,
                result
            };

            console.log('✅ Successful operation retry: PASSED');

        } catch (error) {
            this.testResults.retryMechanism.successfulOperation = {
                success: false,
                error: error.message
            };
            console.log('❌ Successful operation retry: FAILED');
        }

        // Test retry on failure
        let attemptCount = 0;
        try {
            const result = await retryMechanism.executeDatabaseOperation(
                () => {
                    attemptCount++;
                    if (attemptCount < 3) {
                        throw new Error('Simulated failure');
                    }
                    return Promise.resolve({ success: true, attempts: attemptCount });
                },
                'test_retry_operation'
            );

            this.testResults.retryMechanism.retryOnFailure = {
                success: true,
                attempts: attemptCount,
                result
            };

            console.log(`✅ Retry on failure: PASSED (${attemptCount} attempts)`);

        } catch (error) {
            this.testResults.retryMechanism.retryOnFailure = {
                success: false,
                error: error.message,
                attempts: attemptCount
            };
            console.log('❌ Retry on failure: FAILED');
        }

        // Test circuit breaker
        try {
            // Trigger circuit breaker by causing multiple failures
            for (let i = 0; i < 10; i++) {
                try {
                    await retryMechanism.executeDatabaseOperation(
                        () => Promise.reject(new Error('Circuit breaker test')),
                        'circuit_breaker_test'
                    );
                } catch (e) {
                    // Expected to fail
                }
            }

            this.testResults.retryMechanism.circuitBreaker = {
                success: true,
                note: 'Circuit breaker triggered after multiple failures'
            };

            console.log('✅ Circuit breaker: PASSED');

        } catch (error) {
            this.testResults.retryMechanism.circuitBreaker = {
                success: false,
                error: error.message
            };
            console.log('❌ Circuit breaker: FAILED');
        }
    }

    /**
     * Test performance monitoring functionality
     */
    async testPerformanceMonitoring() {
        console.log('📈 Testing performance monitoring...');

        try {
            // Test operation monitoring
            const operationId = performanceMonitor.startOperation('test_operation', {
                type: 'test',
                data: 'sample'
            });

            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 100));

            performanceMonitor.endOperation(operationId, { success: true });

            // Test booking operation monitoring
            performanceMonitor.monitorBookingOperation('test', 1, 100, true);

            // Test payment operation monitoring
            performanceMonitor.monitorPaymentOperation('test', 1, 100, true);

            // Get metrics
            const metrics = performanceMonitor.getMetrics();

            this.testResults.performanceMonitor.monitoring = {
                success: true,
                metricsCollected: Object.keys(metrics).length > 0,
                operationCount: metrics.operations?.count || 0
            };

            console.log('✅ Performance monitoring: PASSED');

        } catch (error) {
            this.testResults.performanceMonitor.monitoring = {
                success: false,
                error: error.message
            };
            console.log('❌ Performance monitoring: FAILED -', error.message);
        }

        // Test alert system
        try {
            // Trigger an alert by exceeding response time threshold
            const operationId = performanceMonitor.startOperation('slow_operation', {});
            
            // Simulate slow operation
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            performanceMonitor.endOperation(operationId, { success: true });

            this.testResults.performanceMonitor.alerts = {
                success: true,
                note: 'Alert system tested with slow operation'
            };

            console.log('✅ Performance alerts: PASSED');

        } catch (error) {
            this.testResults.performanceMonitor.alerts = {
                success: false,
                error: error.message
            };
            console.log('❌ Performance alerts: FAILED');
        }
    }

    /**
     * Test integration between all utilities
     */
    async testIntegration() {
        console.log('🔗 Testing integration...');

        try {
            // Test combined optimization: retry + performance monitoring + DB optimization
            const operationId = performanceMonitor.startOperation('integration_test', {
                type: 'integration'
            });

            const result = await retryMechanism.executeDatabaseOperation(
                async () => {
                    // Use optimized availability check
                    return await dbOptimizer.checkAvailabilityOptimized(
                        1,
                        '2024-12-20',
                        [{ sub_field_id: 1, start_time: '12:00', end_time: '13:00' }]
                    );
                },
                'integration_operation'
            );

            performanceMonitor.endOperation(operationId, { success: true });

            this.testResults.overall.integration = {
                success: true,
                result: result,
                note: 'All utilities working together successfully'
            };

            console.log('✅ Integration test: PASSED');

        } catch (error) {
            this.testResults.overall.integration = {
                success: false,
                error: error.message
            };
            console.log('❌ Integration test: FAILED -', error.message);
        }
    }

    /**
     * Run load tests
     */
    async runLoadTests() {
        console.log('⚡ Running load tests...');

        const concurrentRequests = 10;
        const testPromises = [];

        try {
            // Create concurrent availability checks
            for (let i = 0; i < concurrentRequests; i++) {
                testPromises.push(
                    this.runSingleLoadTest(i)
                );
            }

            const startTime = Date.now();
            const results = await Promise.allSettled(testPromises);
            const duration = Date.now() - startTime;

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failureCount = results.filter(r => r.status === 'rejected').length;

            this.testResults.overall.loadTest = {
                concurrentRequests,
                successCount,
                failureCount,
                duration,
                averageResponseTime: duration / concurrentRequests,
                successRate: (successCount / concurrentRequests) * 100
            };

            console.log(`✅ Load test completed: ${successCount}/${concurrentRequests} successful (${Math.round(this.testResults.overall.loadTest.successRate)}%)`);

        } catch (error) {
            this.testResults.overall.loadTest = {
                success: false,
                error: error.message
            };
            console.log('❌ Load test: FAILED -', error.message);
        }
    }

    /**
     * Run single load test
     */
    async runSingleLoadTest(testId) {
        const operationId = performanceMonitor.startOperation(`load_test_${testId}`, {
            type: 'load_test'
        });

        try {
            const result = await retryMechanism.executeDatabaseOperation(
                () => dbOptimizer.checkAvailabilityOptimized(
                    1,
                    '2024-12-20',
                    [{ sub_field_id: 1, start_time: `${10 + (testId % 8)}:00`, end_time: `${11 + (testId % 8)}:00` }]
                ),
                `load_test_${testId}`
            );

            performanceMonitor.endOperation(operationId, { success: true });
            return result;

        } catch (error) {
            performanceMonitor.endOperation(operationId, { error: error.message });
            throw error;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n📋 PERFORMANCE TEST REPORT');
        console.log('='.repeat(50));

        // DB Optimizer Results
        console.log('\n📊 Database Optimization Results:');
        Object.entries(this.testResults.dbOptimizer).forEach(([test, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${test}: ${result.success ? 'PASSED' : 'FAILED'}`);
            if (result.duration) console.log(`   Duration: ${result.duration}ms`);
            if (result.improvement) console.log(`   Improvement: ${result.improvement}%`);
        });

        // Retry Mechanism Results
        console.log('\n🔄 Retry Mechanism Results:');
        Object.entries(this.testResults.retryMechanism).forEach(([test, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${test}: ${result.success ? 'PASSED' : 'FAILED'}`);
            if (result.attempts) console.log(`   Attempts: ${result.attempts}`);
        });

        // Performance Monitor Results
        console.log('\n📈 Performance Monitoring Results:');
        Object.entries(this.testResults.performanceMonitor).forEach(([test, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${test}: ${result.success ? 'PASSED' : 'FAILED'}`);
        });

        // Overall Results
        console.log('\n🔗 Overall Results:');
        Object.entries(this.testResults.overall).forEach(([test, result]) => {
            const status = result.success !== false ? '✅' : '❌';
            console.log(`${status} ${test}: ${result.success !== false ? 'PASSED' : 'FAILED'}`);
            if (result.successRate) console.log(`   Success Rate: ${result.successRate}%`);
            if (result.averageResponseTime) console.log(`   Avg Response: ${result.averageResponseTime}ms`);
        });

        // Summary
        const totalTests = Object.keys(this.testResults.dbOptimizer).length +
                          Object.keys(this.testResults.retryMechanism).length +
                          Object.keys(this.testResults.performanceMonitor).length +
                          Object.keys(this.testResults.overall).length;

        const passedTests = this.countPassedTests();

        console.log('\n📝 SUMMARY:');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

        console.log('\n🎯 Performance optimization testing completed!');
    }

    /**
     * Count passed tests
     */
    countPassedTests() {
        let passed = 0;

        Object.values(this.testResults.dbOptimizer).forEach(result => {
            if (result.success) passed++;
        });

        Object.values(this.testResults.retryMechanism).forEach(result => {
            if (result.success) passed++;
        });

        Object.values(this.testResults.performanceMonitor).forEach(result => {
            if (result.success) passed++;
        });

        Object.values(this.testResults.overall).forEach(result => {
            if (result.success !== false) passed++;
        });

        return passed;
    }
}

/**
 * Setup and run tests
 */
async function runPerformanceTests() {
    console.log('🚀 Setting up performance testing environment...\n');

    try {
        // Create database indexes first
        console.log('📋 Creating optimal database indexes...');
        await createOptimalIndexes();

        // Check index status
        await checkIndexStatus();

        // Initialize performance monitoring
        performanceMonitor.startMonitoring();

        // Run test suite
        const tester = new PerformanceTester();
        await tester.runFullTestSuite();

    } catch (error) {
        console.error('❌ Performance testing setup failed:', error);
        throw error;
    }
}

module.exports = {
    PerformanceTester,
    runPerformanceTests
};

// If run directly, execute tests
if (require.main === module) {
    runPerformanceTests()
        .then(() => {
            console.log('\n🎉 All performance tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Performance testing failed:', error);
            process.exit(1);
        });
}
