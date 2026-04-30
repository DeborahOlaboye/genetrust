// Tests for rate limiting middleware
// Issue Two: Add rate limiting middleware

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimiter, limiters, createRateLimiter } from '../../src/middleware/rateLimiter.js';

describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter({
            windowMs: 1000, // 1 second for testing
            max: 5
        });
    });

    afterEach(() => {
        rateLimiter.clear();
    });

    describe('constructor', () => {
        it('should create rate limiter with default options', () => {
            const limiter = new RateLimiter();
            expect(limiter.windowMs).toBe(15 * 60 * 1000);
            expect(limiter.max).toBe(100);
        });

        it('should create rate limiter with custom options', () => {
            const limiter = new RateLimiter({
                windowMs: 5000,
                max: 10,
                message: 'Custom message'
            });
            expect(limiter.windowMs).toBe(5000);
            expect(limiter.max).toBe(10);
            expect(limiter.message).toBe('Custom message');
        });
    });

    describe('key generation', () => {
        it('should generate key from IP address', () => {
            const req = { ip: '192.168.1.1' };
            const key = rateLimiter.defaultKeyGenerator(req);
            expect(key).toBe('192.168.1.1');
        });

        it('should handle missing IP address', () => {
            const req = {};
            const key = rateLimiter.defaultKeyGenerator(req);
            expect(key).toBe('unknown');
        });
    });

    describe('request counting', () => {
        it('should track requests within window', () => {
            const key = 'test-key';
            
            // Add requests
            for (let i = 0; i < 3; i++) {
                const entry = rateLimiter.getRequestCount(key);
                rateLimiter.updateRequestCount(key, entry);
            }

            const stats = rateLimiter.getStats(key);
            expect(stats.count).toBe(3);
        });

        it('should reset after window expires', async () => {
            const key = 'test-key';
            const limiter = new RateLimiter({ windowMs: 50, max: 5 });
            
            // Add requests
            for (let i = 0; i < 3; i++) {
                const entry = limiter.getRequestCount(key);
                limiter.updateRequestCount(key, entry);
            }

            expect(limiter.getStats(key).count).toBe(3);

            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(limiter.getStats(key)).toBeNull();
        });
    });

    describe('middleware', () => {
        let mockReq, mockRes, mockNext;

        beforeEach(() => {
            mockReq = { ip: '192.168.1.1' };
            mockRes = {
                set: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
                on: vi.fn()
            };
            mockNext = vi.fn();
        });

        it('should allow requests within limit', () => {
            const middleware = rateLimiter.middleware();
            
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalledWith(429);
        });

        it('should block requests exceeding limit', () => {
            const middleware = rateLimiter.middleware();
            
            // Make requests up to limit
            for (let i = 0; i < 5; i++) {
                middleware(mockReq, mockRes, mockNext);
            }

            // Next request should be blocked
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Rate limit exceeded'
                })
            );
        });

        it('should set rate limit headers', () => {
            const middleware = rateLimiter.middleware();
            
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'X-RateLimit-Limit': 5,
                    'X-RateLimit-Remaining': expect.any(Number),
                    'X-RateLimit-Reset': expect.any(String)
                })
            );
        });
    });

    describe('utility methods', () => {
        it('should reset specific key', () => {
            const key = 'test-key';
            const entry = rateLimiter.getRequestCount(key);
            rateLimiter.updateRequestCount(key, entry);
            
            expect(rateLimiter.getStats(key)).toBeTruthy();
            
            rateLimiter.reset(key);
            expect(rateLimiter.getStats(key)).toBeNull();
        });

        it('should clear all entries', () => {
            rateLimiter.getRequestCount('key1');
            rateLimiter.getRequestCount('key2');
            
            rateLimiter.clear();
            
            expect(rateLimiter.getStats('key1')).toBeNull();
            expect(rateLimiter.getStats('key2')).toBeNull();
        });
    });
});

describe('Pre-configured limiters', () => {
    it('should create strict limiter', () => {
        expect(limiters.strict.max).toBe(10);
        expect(limiters.strict.windowMs).toBe(15 * 60 * 1000);
    });

    it('should create standard limiter', () => {
        expect(limiters.standard.max).toBe(100);
        expect(limiters.standard.windowMs).toBe(15 * 60 * 1000);
    });

    it('should create lenient limiter', () => {
        expect(limiters.lenient.max).toBe(1000);
        expect(limiters.lenient.windowMs).toBe(15 * 60 * 1000);
    });

    it('should create auth limiter', () => {
        expect(limiters.auth.max).toBe(5);
        expect(limiters.auth.message).toContain('authentication');
    });
});

describe('createRateLimiter', () => {
    it('should create new rate limiter instance', () => {
        const limiter = createRateLimiter({ max: 50 });
        expect(limiter).toBeInstanceOf(RateLimiter);
        expect(limiter.max).toBe(50);
    });
});
