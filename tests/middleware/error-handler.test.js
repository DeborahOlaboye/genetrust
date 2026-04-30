/**
 * Tests for error handling middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { request } from 'express';
import {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ConflictError,
    DatabaseError,
    NetworkError,
    PaymentError,
    ErrorSeverity,
    createErrorHandler,
    errorHandler,
    devErrorHandler,
    asyncHandler,
    notFoundHandler,
    aggregateErrors
} from '../../src/middleware/errorHandler.js';

describe('AppError', () => {
    it('should create a basic AppError with default values', () => {
        const error = new AppError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.errorType).toBe('INTERNAL_ERROR');
        expect(error.isOperational).toBe(true);
        expect(error.details).toEqual({});
    });

    it('should create AppError with custom values', () => {
        const error = new AppError('Custom error', 404, 'NOT_FOUND', { userId: '123' });
        expect(error.message).toBe('Custom error');
        expect(error.statusCode).toBe(404);
        expect(error.errorType).toBe('NOT_FOUND');
        expect(error.details).toEqual({ userId: '123' });
    });

    it('should include timestamp in error', () => {
        const before = Date.now();
        const error = new AppError('Test error');
        const after = Date.now();
        expect(error.timestamp).toBeGreaterThanOrEqual(before);
        expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should convert to JSON format', () => {
        const error = new AppError('Test error', 400, 'VALIDATION_ERROR', { field: 'email' });
        const json = error.toJSON();
        expect(json).toEqual({
            message: 'Test error',
            statusCode: 400,
            errorType: 'VALIDATION_ERROR',
            details: { field: 'email' },
            timestamp: error.timestamp,
            stack: undefined
        });
    });

    it('should include stack trace in JSON in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const error = new AppError('Test error');
        const json = error.toJSON();
        expect(json.stack).toBeDefined();
        expect(json.stack).toBe(error.stack);
        
        process.env.NODE_ENV = originalEnv;
    });
});

describe('ValidationError', () => {
    it('should create validation error with default message', () => {
        const error = new ValidationError('Invalid input');
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.errorType).toBe('VALIDATION_ERROR');
    });

    it('should include validation errors in details', () => {
        const validationErrors = {
            email: 'Invalid email format',
            age: 'Must be a positive number'
        };
        const error = new ValidationError('Invalid input', validationErrors);
        expect(error.details.validationErrors).toEqual(validationErrors);
    });
});

describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
        const error = new AuthenticationError();
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.errorType).toBe('AUTHENTICATION_ERROR');
    });

    it('should create authentication error with custom message', () => {
        const error = new AuthenticationError('Invalid token');
        expect(error.message).toBe('Invalid token');
    });
});

describe('AuthorizationError', () => {
    it('should create authorization error with default message', () => {
        const error = new AuthorizationError();
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.errorType).toBe('AUTHORIZATION_ERROR');
    });

    it('should include required permissions in details', () => {
        const requiredPermissions = {
            required: ['read', 'write'],
            user: ['read']
        };
        const error = new AuthorizationError('Insufficient permissions', requiredPermissions);
        expect(error.details.requiredPermissions).toEqual(requiredPermissions);
    });
});

describe('NotFoundError', () => {
    it('should create not found error with default message', () => {
        const error = new NotFoundError();
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.errorType).toBe('NOT_FOUND');
    });

    it('should include resource information in details', () => {
        const error = new NotFoundError('User not found', 'User', '123');
        expect(error.details.resource).toBe('User');
        expect(error.details.resourceId).toBe('123');
    });
});

describe('RateLimitError', () => {
    it('should create rate limit error with default message', () => {
        const error = new RateLimitError();
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.statusCode).toBe(429);
        expect(error.errorType).toBe('RATE_LIMIT_ERROR');
    });

    it('should include rate limit info in details', () => {
        const rateLimitInfo = {
            limit: 100,
            remaining: 0,
            resetAt: Date.now() + 60000
        };
        const error = new RateLimitError('Too many requests', rateLimitInfo);
        expect(error.details.rateLimitInfo).toEqual(rateLimitInfo);
    });
});

describe('ConflictError', () => {
    it('should create conflict error with default message', () => {
        const error = new ConflictError();
        expect(error.message).toBe('Resource conflict');
        expect(error.statusCode).toBe(409);
        expect(error.errorType).toBe('CONFLICT_ERROR');
    });

    it('should include conflict details in error', () => {
        const conflictDetails = {
            resource: 'User',
            field: 'email',
            value: 'test@example.com'
        };
        const error = new ConflictError('Resource already exists', conflictDetails);
        expect(error.details.conflictDetails).toEqual(conflictDetails);
    });
});

describe('createErrorHandler', () => {
    it('should create error handler with default options', () => {
        const handler = createErrorHandler();
        expect(typeof handler).toBe('function');
    });

    it('should create error handler with custom options', () => {
        const customLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
        };
        const handler = createErrorHandler({
            logErrors: true,
            includeStackTrace: true,
            logger: customLogger
        });
        expect(typeof handler).toBe('function');
    });

    it('should handle AppError correctly', () => {
        const mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
        };
        const handler = createErrorHandler({ logger: mockLogger });
        
        const error = new AppError('Test error', 400, 'TEST_ERROR');
        const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();
        
        handler(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Test error',
                    type: 'TEST_ERROR',
                    statusCode: 400
                })
            })
        );
    });

    it('should handle generic Error correctly', () => {
        const mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
        };
        const handler = createErrorHandler({ logger: mockLogger });
        
        const error = new Error('Generic error');
        const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();
        
        handler(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use custom error mappings', () => {
        const mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
        };
        const handler = createErrorHandler({
            logger: mockLogger,
            errorMappings: {
                'AppError': 418
            }
        });
        
        const error = new AppError('Test error', 400, 'TEST_ERROR');
        const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();
        
        handler(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(418);
    });
});

describe('errorHandler', () => {
    it('should be a pre-configured error handler', () => {
        expect(typeof errorHandler).toBe('function');
    });
});

describe('devErrorHandler', () => {
    it('should be a pre-configured development error handler', () => {
        expect(typeof devErrorHandler).toBe('function');
    });
});

describe('asyncHandler', () => {
    it('should wrap async function and catch errors', async () => {
        const asyncFn = async (req, res, next) => {
            throw new Error('Async error');
        };
        
        const wrapped = asyncHandler(asyncFn);
        const req = {};
        const res = {};
        const next = vi.fn();
        
        await wrapped(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through when no error occurs', async () => {
        const asyncFn = async (req, res) => {
            res.json({ success: true });
        };
        
        const wrapped = asyncHandler(asyncFn);
        const req = {};
        const res = { json: vi.fn() };
        const next = vi.fn();
        
        await wrapped(req, res, next);
        
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(next).not.toHaveBeenCalled();
    });
});

describe('notFoundHandler', () => {
    it('should return 404 response', () => {
        const req = { path: '/not-found', method: 'GET' };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        
        notFoundHandler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    message: 'Route GET /not-found not found',
                    type: 'NOT_FOUND',
                    statusCode: 404
                })
            })
        );
    });
});

describe('DatabaseError', () => {
    it('should create database error with default message', () => {
        const error = new DatabaseError();
        expect(error.message).toBe('Database operation failed');
        expect(error.statusCode).toBe(500);
        expect(error.errorType).toBe('DATABASE_ERROR');
        expect(error.severity).toBe('high');
    });

    it('should include database details in error', () => {
        const databaseDetails = {
            query: 'SELECT * FROM users',
            error: 'Connection timeout'
        };
        const error = new DatabaseError('Query failed', databaseDetails);
        expect(error.details.databaseDetails).toEqual(databaseDetails);
    });
});

describe('NetworkError', () => {
    it('should create network error with default message', () => {
        const error = new NetworkError();
        expect(error.message).toBe('Network request failed');
        expect(error.statusCode).toBe(503);
        expect(error.errorType).toBe('NETWORK_ERROR');
        expect(error.severity).toBe('medium');
    });

    it('should include network details in error', () => {
        const networkDetails = {
            url: 'https://api.example.com',
            status: 503
        };
        const error = new NetworkError('Request failed', networkDetails);
        expect(error.details.networkDetails).toEqual(networkDetails);
    });
});

describe('PaymentError', () => {
    it('should create payment error with default message', () => {
        const error = new PaymentError();
        expect(error.message).toBe('Payment operation failed');
        expect(error.statusCode).toBe(402);
        expect(error.errorType).toBe('PAYMENT_ERROR');
        expect(error.severity).toBe('high');
    });

    it('should include payment details in error', () => {
        const paymentDetails = {
            transactionId: 'tx_123',
            reason: 'Insufficient funds'
        };
        const error = new PaymentError('Payment failed', paymentDetails);
        expect(error.details.paymentDetails).toEqual(paymentDetails);
    });
});

describe('ErrorSeverity', () => {
    it('should have all severity levels', () => {
        expect(ErrorSeverity.LOW).toBe('low');
        expect(ErrorSeverity.MEDIUM).toBe('medium');
        expect(ErrorSeverity.HIGH).toBe('high');
        expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
});

describe('aggregateErrors', () => {
    it('should aggregate multiple errors into single error', () => {
        const errors = [
            new ValidationError('Email invalid'),
            new ValidationError('Age required')
        ];
        
        const aggregated = aggregateErrors(errors, 'Validation failed');
        
        expect(aggregated).toBeInstanceOf(AppError);
        expect(aggregated.message).toBe('Validation failed');
        expect(aggregated.errorType).toBe('AGGREGATE_ERROR');
        expect(aggregated.details.errors).toHaveLength(2);
    });

    it('should use default message when not provided', () => {
        const errors = [new Error('Error 1')];
        
        const aggregated = aggregateErrors(errors);
        
        expect(aggregated.message).toBe('Multiple errors occurred');
    });

    it('should determine highest severity from errors', () => {
        const errors = [
            new ValidationError('Low severity error'),
            new DatabaseError('High severity error')
        ];
        
        const aggregated = aggregateErrors(errors);
        
        expect(aggregated.severity).toBe('high');
    });

    it('should handle empty array', () => {
        const aggregated = aggregateErrors([]);
        
        expect(aggregated.details.errors).toHaveLength(0);
    });
});
