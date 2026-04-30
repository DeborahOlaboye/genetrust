// Tests for rate limit configuration
// Issue Two: Add rate limiting middleware

import { describe, it, expect } from 'vitest';
import { getRateLimiter, applyRateLimit, createRateLimitMiddleware, getAllRateLimits } from '../../src/middleware/rateLimitConfig.js';
import { limiters } from '../../src/middleware/rateLimiter.js';

describe('rateLimitConfig', () => {
    describe('getRateLimiter', () => {
        it('should return auth limiter for login endpoint', () => {
            const config = getRateLimiter('auth', 'login');
            expect(config).toBeTruthy();
            expect(config.limiter).toBe(limiters.auth);
            expect(config.description).toBe('Login attempts');
        });

        it('should return strict limiter for genetic data endpoint', () => {
            const config = getRateLimiter('sensitive', 'genetic-data');
            expect(config).toBeTruthy();
            expect(config.limiter).toBe(limiters.strict);
        });

        it('should return standard limiter for marketplace endpoints', () => {
            const config = getRateLimiter('marketplace', 'create-listing');
            expect(config).toBeTruthy();
            expect(config.limiter).toBe(limiters.standard);
        });

        it('should return null for invalid category', () => {
            const config = getRateLimiter('invalid', 'login');
            expect(config).toBeNull();
        });

        it('should return null for invalid endpoint', () => {
            const config = getRateLimiter('auth', 'invalid');
            expect(config).toBeNull();
        });
    });

    describe('createRateLimitMiddleware', () => {
        it('should return middleware for valid configuration', () => {
            const middleware = createRateLimitMiddleware('auth', 'login');
            expect(typeof middleware).toBe('function');
        });

        it('should return no-op middleware for invalid configuration', () => {
            const middleware = createRateLimitMiddleware('invalid', 'endpoint');
            expect(typeof middleware).toBe('function');
            
            // Test that it's a no-op middleware
            const mockReq = {};
            const mockRes = {};
            const mockNext = vi.fn();
            
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('getAllRateLimits', () => {
        it('should return all rate limit configurations', () => {
            const configs = getAllRateLimits();
            expect(configs).toBeInstanceOf(Array);
            expect(configs.length).toBeGreaterThan(0);
            
            // Check structure of returned configs
            configs.forEach(config => {
                expect(config).toHaveProperty('category');
                expect(config).toHaveProperty('endpoint');
                expect(config).toHaveProperty('description');
                expect(config).toHaveProperty('windowMs');
                expect(config).toHaveProperty('max');
            });
        });

        it('should include auth configurations', () => {
            const configs = getAllRateLimits();
            const authConfigs = configs.filter(c => c.category === 'auth');
            expect(authConfigs.length).toBeGreaterThan(0);
            
            const loginConfig = authConfigs.find(c => c.endpoint === 'login');
            expect(loginConfig).toBeTruthy();
            expect(loginConfig.max).toBe(5); // auth limiter max
        });

        it('should include sensitive configurations', () => {
            const configs = getAllRateLimits();
            const sensitiveConfigs = configs.filter(c => c.category === 'sensitive');
            expect(sensitiveConfigs.length).toBeGreaterThan(0);
            
            const geneticConfig = sensitiveConfigs.find(c => c.endpoint === 'genetic-data');
            expect(geneticConfig).toBeTruthy();
            expect(geneticConfig.max).toBe(10); // strict limiter max
        });
    });

    describe('category configurations', () => {
        it('should have auth category with proper endpoints', () => {
            const endpoints = ['login', 'register', 'password-reset', 'verify-email'];
            
            endpoints.forEach(endpoint => {
                const config = getRateLimiter('auth', endpoint);
                expect(config).toBeTruthy();
                expect(config.limiter).toBe(limiters.auth);
            });
        });

        it('should have sensitive category with strict limiter', () => {
            const endpoints = ['genetic-data', 'dataset-upload', 'dataset-download', 'access-request'];
            
            endpoints.forEach(endpoint => {
                const config = getRateLimiter('sensitive', endpoint);
                expect(config).toBeTruthy();
                expect(config.limiter).toBe(limiters.strict);
            });
        });

        it('should have marketplace category with standard limiter', () => {
            const endpoints = ['create-listing', 'purchase-listing', 'update-price', 'cancel-listing'];
            
            endpoints.forEach(endpoint => {
                const config = getRateLimiter('marketplace', endpoint);
                expect(config).toBeTruthy();
                expect(config.limiter).toBe(limiters.standard);
            });
        });

        it('should have search category with lenient limiter', () => {
            const endpoints = ['search-datasets', 'browse-listings', 'get-metadata'];
            
            endpoints.forEach(endpoint => {
                const config = getRateLimiter('search', endpoint);
                expect(config).toBeTruthy();
                expect(config.limiter).toBe(limiters.lenient);
            });
        });

        it('should have utility category with mixed limiters', () => {
            const healthConfig = getRateLimiter('utility', 'health-check');
            expect(healthConfig.limiter).toBe(limiters.lenient);
            
            const statsConfig = getRateLimiter('utility', 'get-stats');
            expect(statsConfig.limiter).toBe(limiters.standard);
        });

        it('should have storage category with appropriate limiters', () => {
            const uploadConfig = getRateLimiter('storage', 'ipfs-upload');
            expect(uploadConfig.limiter).toBe(limiters.strict);
            
            const downloadConfig = getRateLimiter('storage', 'ipfs-download');
            expect(downloadConfig.limiter).toBe(limiters.standard);
        });

        it('should have blockchain category with appropriate limiters', () => {
            const interactConfig = getRateLimiter('blockchain', 'contract-interact');
            expect(interactConfig.limiter).toBe(limiters.standard);
            
            const balanceConfig = getRateLimiter('blockchain', 'get-balance');
            expect(balanceConfig.limiter).toBe(limiters.lenient);
        });
    });
});
