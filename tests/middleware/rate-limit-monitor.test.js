// Tests for rate limiting monitor
// Issue Two: Add rate limiting middleware

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimitMonitor, globalMonitor, rateLimitMonitor, getMonitoringData } from '../../src/middleware/rateLimitMonitor.js';

describe('RateLimitMonitor', () => {
    let monitor;

    beforeEach(() => {
        monitor = new RateLimitMonitor();
    });

    afterEach(() => {
        monitor.resetAllMetrics();
    });

    describe('constructor', () => {
        it('should initialize with empty metrics', () => {
            const summary = monitor.getSummary();
            expect(summary.totalEndpoints).toBe(0);
            expect(summary.totalRequests).toBe(0);
        });

        it('should set start time', () => {
            const now = Date.now();
            const testMonitor = new RateLimitMonitor();
            const summary = testMonitor.getSummary();
            expect(summary.uptime).toBeGreaterThanOrEqual(0);
            expect(summary.uptime).toBeLessThanOrEqual(Date.now() - now + 100);
        });
    });

    describe('recordRequest', () => {
        it('should record allowed request', () => {
            monitor.recordRequest('auth', 'login', false);
            
            const metrics = monitor.getMetrics('auth', 'login');
            expect(metrics).toBeTruthy();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.allowedRequests).toBe(1);
            expect(metrics.blockedRequests).toBe(0);
        });

        it('should record blocked request', () => {
            monitor.recordRequest('auth', 'login', true);
            
            const metrics = monitor.getMetrics('auth', 'login');
            expect(metrics).toBeTruthy();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.allowedRequests).toBe(0);
            expect(metrics.blockedRequests).toBe(1);
        });

        it('should create metric for new endpoint', () => {
            monitor.recordRequest('new', 'endpoint', false);
            
            const metrics = monitor.getMetrics('new', 'endpoint');
            expect(metrics).toBeTruthy();
            expect(metrics.category).toBe('new');
            expect(metrics.endpoint).toBe('endpoint');
        });

        it('should handle multiple requests', () => {
            for (let i = 0; i < 10; i++) {
                monitor.recordRequest('auth', 'login', i < 2); // Block first 2
            }
            
            const metrics = monitor.getMetrics('auth', 'login');
            expect(metrics.totalRequests).toBe(10);
            expect(metrics.blockedRequests).toBe(2);
            expect(metrics.allowedRequests).toBe(8);
        });
    });

    describe('getMetrics', () => {
        it('should return null for non-existent endpoint', () => {
            const metrics = monitor.getMetrics('nonexistent', 'endpoint');
            expect(metrics).toBeNull();
        });

        it('should return metrics for existing endpoint', () => {
            monitor.recordRequest('auth', 'login', false);
            
            const metrics = monitor.getMetrics('auth', 'login');
            expect(metrics).toBeTruthy();
            expect(metrics).toHaveProperty('totalRequests');
            expect(metrics).toHaveProperty('blockedRequests');
            expect(metrics).toHaveProperty('allowedRequests');
        });
    });

    describe('getAllMetrics', () => {
        it('should return empty array initially', () => {
            const allMetrics = monitor.getAllMetrics();
            expect(allMetrics).toBeInstanceOf(Array);
            expect(allMetrics.length).toBe(0);
        });

        it('should return all recorded metrics', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', true);
            
            const allMetrics = monitor.getAllMetrics();
            expect(allMetrics.length).toBe(2);
            
            const loginMetrics = allMetrics.find(m => m.endpoint === 'login');
            const dataMetrics = allMetrics.find(m => m.endpoint === 'data');
            
            expect(loginMetrics).toBeTruthy();
            expect(dataMetrics).toBeTruthy();
        });

        it('should include calculated fields', () => {
            monitor.recordRequest('auth', 'login', true);
            monitor.recordRequest('auth', 'login', false);
            
            const allMetrics = monitor.getAllMetrics();
            const metrics = allMetrics[0];
            
            expect(metrics).toHaveProperty('blockRate');
            expect(metrics).toHaveProperty('utilizationRate');
            expect(metrics).toHaveProperty('uptime');
        });
    });

    describe('getSummary', () => {
        it('should return initial summary', () => {
            const summary = monitor.getSummary();
            
            expect(summary).toHaveProperty('totalEndpoints', 0);
            expect(summary).toHaveProperty('totalRequests', 0);
            expect(summary).toHaveProperty('totalBlocked', 0);
            expect(summary).toHaveProperty('totalAllowed', 0);
            expect(summary).toHaveProperty('overallBlockRate', '0%');
            expect(summary).toHaveProperty('uptime');
        });

        it('should calculate summary correctly', () => {
            monitor.recordRequest('auth', 'login', true);
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', false);
            
            const summary = monitor.getSummary();
            
            expect(summary.totalEndpoints).toBe(2);
            expect(summary.totalRequests).toBe(3);
            expect(summary.totalBlocked).toBe(1);
            expect(summary.totalAllowed).toBe(2);
            expect(summary.overallBlockRate).toBe('33.33%');
        });

        it('should identify most active endpoint', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', false);
            
            const summary = monitor.getSummary();
            
            expect(summary.mostActiveEndpoint.endpoint).toBe('login');
            expect(summary.mostActiveEndpoint.totalRequests).toBe(2);
        });

        it('should identify most blocked endpoint', () => {
            monitor.recordRequest('auth', 'login', true);
            monitor.recordRequest('auth', 'login', true);
            monitor.recordRequest('sensitive', 'data', true);
            
            const summary = monitor.getSummary();
            
            expect(summary.mostBlockedEndpoint.endpoint).toBe('login');
            expect(summary.mostBlockedEndpoint.blockedRequests).toBe(2);
        });
    });

    describe('resetMetrics', () => {
        it('should reset specific endpoint metrics', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', false);
            
            monitor.resetMetrics('auth', 'login');
            
            const loginMetrics = monitor.getMetrics('auth', 'login');
            const dataMetrics = monitor.getMetrics('sensitive', 'data');
            
            expect(loginMetrics.totalRequests).toBe(0);
            expect(dataMetrics.totalRequests).toBe(1);
        });
    });

    describe('resetAllMetrics', () => {
        it('should reset all metrics', () => {
            monitor.recordRequest('auth', 'login', false);
            monitor.recordRequest('sensitive', 'data', false);
            
            monitor.resetAllMetrics();
            
            const summary = monitor.getSummary();
            expect(summary.totalRequests).toBe(0);
            expect(summary.totalEndpoints).toBe(0);
        });
    });

    describe('exportMetrics', () => {
        it('should export metrics in correct format', () => {
            monitor.recordRequest('auth', 'login', false);
            
            const exported = monitor.exportMetrics();
            
            expect(exported).toHaveProperty('timestamp');
            expect(exported).toHaveProperty('summary');
            expect(exported).toHaveProperty('endpoints');
            expect(exported.endpoints).toBeInstanceOf(Array);
        });
    });

    describe('createTrackingMiddleware', () => {
        it('should create tracking middleware', () => {
            const middleware = monitor.createTrackingMiddleware();
            expect(typeof middleware).toBe('function');
        });

        it('should track requests through middleware', (done) => {
            const middleware = monitor.createTrackingMiddleware();
            
            const mockReq = {
                rateLimitCategory: 'auth',
                rateLimitEndpoint: 'login'
            };
            const mockRes = {
                statusCode: 200,
                on: vi.fn((event, callback) => {
                    if (event === 'finish') {
                        callback();
                        
                        const metrics = monitor.getMetrics('auth', 'login');
                        expect(metrics.totalRequests).toBe(1);
                        expect(metrics.allowedRequests).toBe(1);
                        done();
                    }
                })
            };
            const mockNext = vi.fn();
            
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should track blocked requests', (done) => {
            const middleware = monitor.createTrackingMiddleware();
            
            const mockReq = {
                rateLimitCategory: 'auth',
                rateLimitEndpoint: 'login'
            };
            const mockRes = {
                statusCode: 429,
                on: vi.fn((event, callback) => {
                    if (event === 'finish') {
                        callback();
                        
                        const metrics = monitor.getMetrics('auth', 'login');
                        expect(metrics.totalRequests).toBe(1);
                        expect(metrics.blockedRequests).toBe(1);
                        done();
                    }
                })
            };
            const mockNext = vi.fn();
            
            middleware(mockReq, mockRes, mockNext);
        });
    });
});

describe('Global monitor', () => {
    afterEach(() => {
        globalMonitor.resetAllMetrics();
    });

    it('should be available as singleton', () => {
        expect(globalMonitor).toBeInstanceOf(RateLimitMonitor);
    });

    it('should persist data across operations', () => {
        globalMonitor.recordRequest('auth', 'login', false);
        
        const summary = globalMonitor.getSummary();
        expect(summary.totalRequests).toBe(1);
    });
});

describe('rateLimitMonitor middleware', () => {
    afterEach(() => {
        globalMonitor.resetAllMetrics();
    });

    it('should use global monitor by default', () => {
        const middleware = rateLimitMonitor();
        const mockReq = { rateLimitCategory: 'test', rateLimitEndpoint: 'endpoint' };
        const mockRes = { statusCode: 200, on: vi.fn() };
        const mockNext = vi.fn();
        
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
});

describe('getMonitoringData', () => {
    afterEach(() => {
        globalMonitor.resetAllMetrics();
    });

    it('should return monitoring data structure', () => {
        globalMonitor.recordRequest('auth', 'login', false);
        
        const data = getMonitoringData();
        
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('endpoints');
        expect(data).toHaveProperty('timestamp');
        expect(data.summary.totalRequests).toBe(1);
    });
});
