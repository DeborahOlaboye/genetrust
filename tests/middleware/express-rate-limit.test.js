// Tests for Express rate limiting integration
// Issue Two: Add rate limiting middleware

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpressRateLimit, rateLimit, rateLimitedRoute } from '../../src/middleware/expressRateLimit.js';
import { createRateLimitMiddleware } from '../../src/middleware/rateLimitConfig.js';

describe('ExpressRateLimit', () => {
    describe('getCategoryFromPath', () => {
        it('should identify auth category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/auth/login')).toBe('auth');
            expect(ExpressRateLimit.getCategoryFromPath('/api/auth/register')).toBe('auth');
            expect(ExpressRateLimit.getCategoryFromPath('/password/reset')).toBe('auth');
        });

        it('should identify sensitive category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/genetic-data')).toBe('sensitive');
            expect(ExpressRateLimit.getCategoryFromPath('/dataset/upload')).toBe('sensitive');
            expect(ExpressRateLimit.getCategoryFromPath('/api/data/access')).toBe('sensitive');
        });

        it('should identify marketplace category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/marketplace/listing')).toBe('marketplace');
            expect(ExpressRateLimit.getCategoryFromPath('/trade/purchase')).toBe('marketplace');
            expect(ExpressRateLimit.getCategoryFromPath('/listing/create')).toBe('marketplace');
        });

        it('should identify search category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/search/datasets')).toBe('search');
            expect(ExpressRateLimit.getCategoryFromPath('/browse/marketplace')).toBe('search');
            expect(ExpressRateLimit.getCategoryFromPath('/explore/data')).toBe('search');
        });

        it('should identify storage category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/ipfs/upload')).toBe('storage');
            expect(ExpressRateLimit.getCategoryFromPath('/storage/download')).toBe('storage');
            expect(ExpressRateLimit.getCategoryFromPath('/upload/file')).toBe('storage');
        });

        it('should identify blockchain category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/blockchain/contract')).toBe('blockchain');
            expect(ExpressRateLimit.getCategoryFromPath('/transaction/details')).toBe('blockchain');
            expect(ExpressRateLimit.getCategoryFromPath('/balance/check')).toBe('blockchain');
        });

        it('should identify utility category', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/health')).toBe('utility');
            expect(ExpressRateLimit.getCategoryFromPath('/status')).toBe('utility');
            expect(ExpressRateLimit.getCategoryFromPath('/version')).toBe('utility');
            expect(ExpressRateLimit.getCategoryFromPath('/stats')).toBe('utility');
        });

        it('should return null for unknown paths', () => {
            expect(ExpressRateLimit.getCategoryFromPath('/unknown/path')).toBeNull();
            expect(ExpressRateLimit.getCategoryFromPath('/random')).toBeNull();
        });
    });

    describe('getEndpointFromPath', () => {
        it('should map auth endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/auth/login')).toBe('login');
            expect(ExpressRateLimit.getEndpointFromPath('/register')).toBe('register');
            expect(ExpressRateLimit.getEndpointFromPath('/password/reset')).toBe('password-reset');
            expect(ExpressRateLimit.getEndpointFromPath('/verify/email')).toBe('verify-email');
        });

        it('should map sensitive endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/dataset/upload')).toBe('dataset-upload');
            expect(ExpressRateLimit.getEndpointFromPath('/download/data')).toBe('dataset-download');
            expect(ExpressRateLimit.getEndpointFromPath('/access/request')).toBe('access-request');
        });

        it('should map marketplace endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/listing/create')).toBe('create-listing');
            expect(ExpressRateLimit.getEndpointFromPath('/purchase/item')).toBe('purchase-listing');
            expect(ExpressRateLimit.getEndpointFromPath('/update/price')).toBe('update-price');
            expect(ExpressRateLimit.getEndpointFromPath('/cancel/listing')).toBe('cancel-listing');
        });

        it('should map search endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/search/datasets')).toBe('search-datasets');
            expect(ExpressRateLimit.getEndpointFromPath('/browse/listings')).toBe('browse-listings');
            expect(ExpressRateLimit.getEndpointFromPath('/get/metadata')).toBe('get-metadata');
        });

        it('should map utility endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/health')).toBe('health-check');
            expect(ExpressRateLimit.getEndpointFromPath('/stats')).toBe('get-stats');
            expect(ExpressRateLimit.getEndpointFromPath('/version')).toBe('get-version');
        });

        it('should handle unknown endpoints', () => {
            expect(ExpressRateLimit.getEndpointFromPath('/unknown/endpoint')).toBeNull();
        });
    });

    describe('middleware', () => {
        it('should create valid middleware', () => {
            const middleware = ExpressRateLimit.middleware('auth', 'login');
            expect(typeof middleware).toBe('function');
        });

        it('should call middleware with request', () => {
            const middleware = ExpressRateLimit.middleware('auth', 'login');
            const mockReq = {};
            const mockRes = {};
            const mockNext = vi.fn();

            // Should not throw error
            expect(() => {
                middleware(mockReq, mockRes, mockNext);
            }).not.toThrow();
        });
    });

    describe('applyToMethod', () => {
        let mockRouter;

        beforeEach(() => {
            mockRouter = {
                get: vi.fn(),
                post: vi.fn(),
                put: vi.fn(),
                delete: vi.fn()
            };
        });

        it('should apply rate limiting to GET method', () => {
            const handler = vi.fn();
            ExpressRateLimit.applyToMethod(mockRouter, '/test', 'get', handler);
            
            expect(mockRouter.get).toHaveBeenCalledWith(
                '/test',
                expect.any(Function),
                handler
            );
        });

        it('should apply rate limiting to POST method', () => {
            const handler = vi.fn();
            ExpressRateLimit.applyToMethod(mockRouter, '/test', 'post', handler);
            
            expect(mockRouter.post).toHaveBeenCalledWith(
                '/test',
                expect.any(Function),
                handler
            );
        });

        it('should work without rate limiting for unknown paths', () => {
            const handler = vi.fn();
            ExpressRateLimit.applyToMethod(mockRouter, '/unknown', 'get', handler);
            
            expect(mockRouter.get).toHaveBeenCalledWith('/unknown', handler);
        });
    });
});

describe('rateLimit decorator', () => {
    it('should decorate class methods', () => {
        class TestController {
            @rateLimit('auth', 'login')
            async login(req, res, next) {
                return 'success';
            }
        }

        const controller = new TestController();
        expect(typeof controller.login).toBe('function');
    });

    it('should wrap original method', () => {
        const originalMethod = vi.fn().mockReturnValue('original');
        const mockReq = {};
        const mockRes = {};
        const mockNext = vi.fn();

        class TestController {
            @rateLimit('auth', 'login')
            testMethod(req, res, next) {
                return originalMethod(req, res, next);
            }
        }

        const controller = new TestController();
        const result = controller.testMethod(mockReq, mockRes, mockNext);

        expect(originalMethod).toHaveBeenCalled();
    });
});

describe('rateLimitedRoute', () => {
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            use: vi.fn()
        };
    });

    it('should apply rate limiting to route', () => {
        const handler = vi.fn();
        rateLimitedRoute(mockRouter, '/test', 'auth', 'login', handler);
        
        expect(mockRouter.use).toHaveBeenCalledWith(
            '/test',
            expect.any(Function),
            handler
        );
    });

    it('should work with valid parameters', () => {
        const handler = vi.fn();
        
        expect(() => {
            rateLimitedRoute(mockRouter, '/api/test', 'sensitive', 'genetic-data', handler);
        }).not.toThrow();
        
        expect(mockRouter.use).toHaveBeenCalled();
    });
});
