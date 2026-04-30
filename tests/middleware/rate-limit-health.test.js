// Tests for rate limiting health check system
// Issue Two: Add rate limiting middleware

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimitHealth, HealthStatus, createHealthCheckMiddleware, defaultHealthChecker } from '../../src/middleware/rateLimitHealth.js';
import { RateLimitMonitor } from '../../src/middleware/rateLimitMonitor.js';

describe('RateLimitHealth', () => {
    let healthChecker;
    let monitor;

    beforeEach(() => {
        monitor = new RateLimitMonitor();
        healthChecker = new RateLimitHealth(monitor);
    });

    afterEach(() => {
        monitor.resetAllMetrics();
    });

    describe('constructor', () => {
        it('should initialize with default thresholds', () => {
            expect(healthChecker.thresholds.maxBlockRate).toBe(10);
            expect(healthChecker.thresholds.maxMemoryUsage).toBe(80);
            expect(healthChecker.thresholds.minCacheHitRate).toBe(50);
            expect(healthChecker.thresholds.maxResponseTime).toBe(100);
        });

        it('should use provided monitor', () => {
            expect(healthChecker.monitor).toBe(monitor);
        });

        it('should create default monitor if none provided', () => {
            const defaultChecker = new RateLimitHealth();
            expect(defaultChecker.monitor).toBeInstanceOf(RateLimitMonitor);
        });
    });

    describe('checkHealth', () => {
        it('should return healthy status for new system', () => {
            const health = healthChecker.checkHealth();
            
            expect(health).toHaveProperty('status', HealthStatus.HEALTHY);
            expect(health).toHaveProperty('checks');
            expect(health).toHaveProperty('summary');
            expect(health).toHaveProperty('timestamp');
            expect(health).toHaveProperty('uptime');
        });

        it('should include all required checks', () => {
            const health = healthChecker.checkHealth();
            const checks = health.checks;
            
            expect(checks).toHaveProperty('blockRate');
            expect(checks).toHaveProperty('memoryUsage');
            expect(checks).toHaveProperty('cachePerformance');
            expect(checks).toHaveProperty('responseTime');
            expect(checks).toHaveProperty('errorRate');
        });

        it('should detect high block rate', () => {
            // Simulate high block rate
            for (let i = 0; i < 20; i++) {
                monitor.recordRequest('auth', 'login', i < 15); // 75% block rate
            }
            
            const health = healthChecker.checkHealth();
            expect(health.checks.blockRate.status).toBe(HealthStatus.WARNING);
            expect(health.status).toBe(HealthStatus.WARNING);
        });

        it('should detect critical memory usage', () => {
            // Simulate high memory usage
            for (let i = 0; i < 5000; i++) {
                monitor.recordRequest('test', 'endpoint' + i, false);
            }
            
            const health = healthChecker.checkHealth();
            expect(health.checks.memoryUsage.status).toBe(HealthStatus.CRITICAL);
            expect(health.status).toBe(HealthStatus.CRITICAL);
        });
    });

    describe('block rate check', () => {
        it('should be healthy with low block rate', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('auth', 'login', true); // 33% block rate
            
            const check = healthChecker.checkBlockRate();
            expect(check.status).toBe(HealthStatus.HEALTHY);
            expect(check.value).toBe(33.33);
        });

        it('should be warning with high block rate', () => {
            for (let i = 0; i < 10; i++) {
                monitor.recordRequest('auth', 'login', i < 8); // 80% block rate
            }
            
            const check = healthChecker.checkBlockRate();
            expect(check.status).toBe(HealthStatus.WARNING);
            expect(check.message).toContain('High block rate');
        });
    });

    describe('memory usage check', () => {
        it('should be healthy with normal memory usage', () => {
            const check = healthChecker.checkMemoryUsage();
            expect(check.status).toBe(HealthStatus.HEALTHY);
        });

        it('should be critical with high memory usage', () => {
            // Simulate high memory usage
            for (let i = 0; i < 9000; i++) {
                monitor.recordRequest('test', 'endpoint' + i, false);
            }
            
            const check = healthChecker.checkMemoryUsage();
            expect(check.status).toBe(HealthStatus.CRITICAL);
        });
    });

    describe('cache performance check', () => {
        it('should be healthy with good hit rate', () => {
            const check = healthChecker.checkCachePerformance();
            expect(check.status).toBe(HealthStatus.HEALTHY);
            expect(check.value).toBe(75); // Simulated
        });
    });

    describe('response time check', () => {
        it('should be healthy with fast response', () => {
            const check = healthChecker.checkResponseTime();
            expect(check.status).toBe(HealthStatus.HEALTHY);
            expect(check.value).toBe(45); // Simulated
        });
    });

    describe('error rate check', () => {
        it('should be healthy with no errors', () => {
            monitor.recordRequest('auth', 'login', false);
            
            const check = healthChecker.checkErrorRate();
            expect(check.status).toBe(HealthStatus.HEALTHY);
            expect(check.value).toBe(0);
        });
    });

    describe('overall status determination', () => {
        it('should be critical if any check is critical', () => {
            const checks = {
                blockRate: { status: HealthStatus.HEALTHY },
                memoryUsage: { status: HealthStatus.CRITICAL },
                cachePerformance: { status: HealthStatus.HEALTHY },
                responseTime: { status: HealthStatus.HEALTHY },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const status = healthChecker.determineOverallStatus(checks);
            expect(status).toBe(HealthStatus.CRITICAL);
        });

        it('should be warning if any check is warning (but no critical)', () => {
            const checks = {
                blockRate: { status: HealthStatus.WARNING },
                memoryUsage: { status: HealthStatus.HEALTHY },
                cachePerformance: { status: HealthStatus.HEALTHY },
                responseTime: { status: HealthStatus.HEALTHY },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const status = healthChecker.determineOverallStatus(checks);
            expect(status).toBe(HealthStatus.WARNING);
        });

        it('should be healthy if all checks are healthy', () => {
            const checks = {
                blockRate: { status: HealthStatus.HEALTHY },
                memoryUsage: { status: HealthStatus.HEALTHY },
                cachePerformance: { status: HealthStatus.HEALTHY },
                responseTime: { status: HealthStatus.HEALTHY },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const status = healthChecker.determineOverallStatus(checks);
            expect(status).toBe(HealthStatus.HEALTHY);
        });
    });

    describe('summary generation', () => {
        it('should generate correct summary', () => {
            const checks = {
                blockRate: { status: HealthStatus.HEALTHY },
                memoryUsage: { status: HealthStatus.WARNING },
                cachePerformance: { status: HealthStatus.HEALTHY },
                responseTime: { status: HealthStatus.CRITICAL },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const summary = healthChecker.generateSummary(checks, HealthStatus.CRITICAL);
            
            expect(summary.overallStatus).toBe(HealthStatus.CRITICAL);
            expect(summary.healthyChecks).toBe(3);
            expect(summary.warningChecks).toBe(1);
            expect(summary.criticalChecks).toBe(1);
            expect(summary.totalChecks).toBe(5);
            expect(summary.recommendations).toBeInstanceOf(Array);
        });
    });

    describe('recommendations', () => {
        it('should provide recommendations for warnings', () => {
            const checks = {
                blockRate: { status: HealthStatus.WARNING },
                memoryUsage: { status: HealthStatus.HEALTHY },
                cachePerformance: { status: HealthStatus.WARNING },
                responseTime: { status: HealthStatus.HEALTHY },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const recommendations = healthChecker.generateRecommendations(checks, HealthStatus.WARNING);
            
            expect(recommendations).toContain('Consider adjusting rate limits or investigating potential abuse');
            expect(recommendations).toContain('Review cache configuration and access patterns');
        });

        it('should provide healthy recommendation', () => {
            const checks = {
                blockRate: { status: HealthStatus.HEALTHY },
                memoryUsage: { status: HealthStatus.HEALTHY },
                cachePerformance: { status: HealthStatus.HEALTHY },
                responseTime: { status: HealthStatus.HEALTHY },
                errorRate: { status: HealthStatus.HEALTHY }
            };
            
            const recommendations = healthChecker.generateRecommendations(checks, HealthStatus.HEALTHY);
            expect(recommendations).toContain('Rate limiting system is operating normally');
        });
    });

    describe('diagnostics', () => {
        it('should return diagnostic information', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', true);
            
            const diagnostics = healthChecker.getDiagnostics();
            
            expect(diagnostics).toHaveProperty('systemInfo');
            expect(diagnostics).toHaveProperty('topEndpoints');
            expect(diagnostics).toHaveProperty('problemEndpoints');
            expect(diagnostics).toHaveProperty('thresholds');
            expect(diagnostics).toHaveProperty('timestamp');
            
            expect(diagnostics.systemInfo).toHaveProperty('uptime');
            expect(diagnostics.systemInfo).toHaveProperty('totalEndpoints');
            expect(diagnostics.systemInfo).toHaveProperty('totalRequests');
        });
    });

    describe('threshold updates', () => {
        it('should update thresholds', () => {
            const newThresholds = { maxBlockRate: 20, maxMemoryUsage: 90 };
            
            healthChecker.updateThresholds(newThresholds);
            
            expect(healthChecker.thresholds.maxBlockRate).toBe(20);
            expect(healthChecker.thresholds.maxMemoryUsage).toBe(90);
            expect(healthChecker.thresholds.minCacheHitRate).toBe(50); // Unchanged
        });
    });
});

describe('Health Status Constants', () => {
    it('should have correct status values', () => {
        expect(HealthStatus.HEALTHY).toBe('healthy');
        expect(HealthStatus.WARNING).toBe('warning');
        expect(HealthStatus.CRITICAL).toBe('critical');
        expect(HealthStatus.UNKNOWN).toBe('unknown');
    });
});

describe('Health Check Middleware', () => {
    let healthChecker;

    beforeEach(() => {
        healthChecker = new RateLimitHealth();
    });

    it('should create middleware function', () => {
        const middleware = createHealthCheckMiddleware(healthChecker);
        expect(typeof middleware).toBe('function');
    });

    it('should handle health check endpoint', () => {
        const middleware = createHealthCheckMiddleware(healthChecker);
        const mockReq = { path: '/health/rate-limiter' };
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const mockNext = vi.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle diagnostics endpoint', () => {
        const middleware = createHealthCheckMiddleware(healthChecker);
        const mockReq = { path: '/health/rate-limiter/diagnostics' };
        const mockRes = { json: vi.fn() };
        const mockNext = vi.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalled();
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass through other endpoints', () => {
        const middleware = createHealthCheckMiddleware(healthChecker);
        const mockReq = { path: '/other/endpoint' };
        const mockRes = {};
        const mockNext = vi.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 503 for critical status', () => {
        // Mock critical health
        healthChecker.checkHealth = vi.fn().mockReturnValue({
            status: HealthStatus.CRITICAL,
            checks: {},
            summary: {},
            timestamp: new Date().toISOString(),
            uptime: 0
        });

        const middleware = createHealthCheckMiddleware(healthChecker);
        const mockReq = { path: '/health/rate-limiter' };
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const mockNext = vi.fn();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(503);
    });
});

describe('Default Health Checker', () => {
    it('should provide default instance', () => {
        expect(defaultHealthChecker).toBeInstanceOf(RateLimitHealth);
    });
});
