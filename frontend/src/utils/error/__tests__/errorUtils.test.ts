import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, createErrorResponse, createErrorHandler, throwValidationError } from '../errorUtils';
import AppError from '../AppError';

describe('errorUtils', () => {
  describe('createErrorResponse', () => {
    it('should handle AppError instances', () => {
      const error = new AppError('Test error', {
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
      
      const result = createErrorResponse(error);
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('Test error');
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.status).toBe(400);
    });
    
    it('should handle standard Error objects', () => {
      const error = new Error('Standard error');
      
      const result = createErrorResponse(error);
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('Standard error');
      expect(result.error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.status).toBe(500);
    });
    
    it('should handle string errors', () => {
      const result = createErrorResponse('String error');
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('String error');
      expect(result.status).toBe(500);
    });
    
    it('should handle unknown error types', () => {
      const result = createErrorResponse({ some: 'weird error' });
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('An unknown error occurred');
      expect(result.status).toBe(500);
      expect(result.error.details.originalError).toEqual({ some: 'weird error' });
    });
    
    it('should include context in the error details', () => {
      const error = new Error('Error with context');
      const context = { userId: '123', action: 'test' };
      
      const result = createErrorResponse(error, context);
      
      expect(result.error.details).toMatchObject(context);
    });
  });
  
  describe('createErrorHandler', () => {
    const consoleError = console.error;
    
    beforeEach(() => {
      console.error = vi.fn();
    });
    
    afterEach(() => {
      console.error = consoleError;
      vi.resetAllMocks();
    });
    
    it('should create a handler with default options', () => {
      const handler = createErrorHandler({
        defaultMessage: 'Default error',
        defaultCode: ErrorCode.VALIDATION_ERROR,
        defaultStatus: 400,
      });
      
      const result = handler('Test error');
      
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.message).toBe('Test error');
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.status).toBe(400);
      expect(result.isHandled).toBe(true);
    });
    
    it('should override defaults with error properties', () => {
      const handler = createErrorHandler({
        defaultMessage: 'Default error',
        defaultCode: ErrorCode.UNKNOWN_ERROR,
        defaultStatus: 500,
      });
      
      const error = new AppError('Custom error', {
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
      });
      
      const result = handler(error);
      
      expect(result.error.message).toBe('Custom error');
      expect(result.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.status).toBe(404);
    });
    
    it('should log errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const handler = createErrorHandler({
        logErrors: true,
      });
      
      handler('Test error');
      
      expect(console.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
    
    it('should not log errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const handler = createErrorHandler({
        logErrors: false,
      });
      
      handler('Test error');
      
      expect(console.error).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('throwValidationError', () => {
    it('should throw a validation error with default message', () => {
      expect(() => throwValidationError()).toThrow({
        message: 'Validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
    });
    
    it('should throw with custom message', () => {
      expect(() => throwValidationError('Custom validation error')).toThrow({
        message: 'Custom validation error',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
    });
    
    it('should include details if provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      
      expect(() => throwValidationError('Validation failed', { details }))
        .toThrow({
          message: 'Validation failed',
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: 400,
          details,
        });
    });
  });
  
  describe('assert', () => {
    it('should not throw if condition is truthy', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert('truthy', 'Should not throw')).not.toThrow();
      expect(() => assert(1, 'Should not throw')).not.toThrow();
      expect(() => assert({}, 'Should not throw')).not.toThrow();
    });
    
    it('should throw if condition is falsy', () => {
      expect(() => assert(false, 'Should throw')).toThrow({
        message: 'Should throw',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
      
      expect(() => assert(0, 'Should throw')).toThrow();
      expect(() => assert('', 'Should throw')).toThrow();
      expect(() => assert(null, 'Should throw')).toThrow();
      expect(() => assert(undefined, 'Should throw')).toThrow();
    });
    
    it('should use custom code and status if provided', () => {
      expect(() => 
        assert(false, 'Should throw', { 
          code: ErrorCode.NOT_FOUND, 
          status: 404 
        })
      ).toThrow({
        message: 'Should throw',
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
      });
    });
  });
  
  describe('assertDefined', () => {
    it('should not throw if value is defined', () => {
      expect(() => assertDefined('defined', 'Should not throw')).not.toThrow();
      expect(() => assertDefined(0, 'Should not throw')).not.toThrow();
      expect(() => assertDefined(false, 'Should not throw')).not.toThrow();
    });
    
    it('should throw if value is null or undefined', () => {
      expect(() => assertDefined(null, 'Should throw')).toThrow({
        message: 'Should throw',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
      
      expect(() => assertDefined(undefined, 'Should throw')).toThrow();
    });
    
    it('should use default message if not provided', () => {
      expect(() => assertDefined(null)).toThrow({
        message: 'Value is required',
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
      });
    });
    
    it('should narrow the type after assertion', () => {
      const value: string | undefined = 'test';
      
      // TypeScript should know value is string after this line
      assertDefined(value, 'Value is required');
      
      // This should not cause a TypeScript error
      const length: number = value.length;
      expect(length).toBe(4);
    });
  });
});
