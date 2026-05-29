import {
  ErrorCodes,
  mapContractError,
  StructuredErrorResponse,
  AppError,
  handleError,
  withErrorHandling,
  createContractError,
  parseContractErrorResponse,
  isRetryableError,
  getErrorRecoveryStrategy,
  withRetry,
  getErrorSeverity,
} from './errorHandler';

describe('Error Handler Utilities', () => {
  it('maps known contract error codes', () => {
    const error = mapContractError(404);

    expect(error.userMessage).toBe('The requested resource was not found');
    expect(error.level).toBe('warn');
    expect(error.httpStatus).toBe(404);
  });

  it('returns unknown error for unmapped codes', () => {
    const error = mapContractError(999);
    expect(error.code).toBe(9000);
    expect(error.userMessage).toBe('Something went wrong. Please try again.');
  });

  it('creates structured error responses', () => {
    const structured = new StructuredErrorResponse(400, 'Invalid input', { field: 'name' });

    expect(structured.errorCode).toBe(400);
    expect(structured.message).toBe('Invalid input');
    expect(structured.userMessage).toBe('The request contained invalid data');
    expect(structured.level).toBe('warn');
    expect(structured.httpStatus).toBe(400);
  });

  it('creates AppError instances with mapped error info', () => {
    const appError = new AppError(401);

    expect(appError.name).toBe('AppError');
    expect(appError.code).toBe(401);
    expect(appError.userMessage).toBe('You are not authorized to perform this action');
    expect(appError.httpStatus).toBe(401);
  });

  it('handles unknown AppError codes gracefully', () => {
    const appError = new AppError('UNKNOWN_ERROR');

    expect(appError.code).toBe(9000);
    expect(appError.userMessage).toBe('Something went wrong. Please try again.');
  });

  it('handleError logs and rejects with AppError', async () => {
    console.error = jest.fn();
    console.log = jest.fn();

    await expect(handleError(new Error('Test failure'), false)).rejects.toBeInstanceOf(AppError);
    expect(console.error).toHaveBeenCalled();
  });

  it('withErrorHandling wraps async functions and preserves AppError', async () => {
    const asyncFn = async () => {
      throw new Error('Wrapped failure');
    };

    await expect(withErrorHandling(asyncFn)).rejects.toBeInstanceOf(AppError);
  });

  it('createContractError returns AppError with contract context', () => {
    const error = createContractError(403, 'Forbidden', { action: 'access' });

    expect(error.code).toBe(403);
    expect(error.context.source).toBe('contract');
    expect(error.userMessage).toBe('You do not have permission to perform this action');
  });

  it('parseContractErrorResponse handles numeric codes', () => {
    const error = parseContractErrorResponse(404);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(404);
  });

  it('parseContractErrorResponse handles structured response objects', () => {
    const error = parseContractErrorResponse({ errorCode: 500, message: 'Contract failed', context: { tx: '0x1' } });
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(500);
    expect(error.context.errorId).toBeNull();
  });

  it('isRetryableError returns true for retryable status codes', () => {
    const error = new AppError('WALLET_NETWORK_ERROR');
    error.httpStatus = 1003;
    expect(isRetryableError(error)).toBe(true);
  });

  it('getErrorRecoveryStrategy returns correct strategy', () => {
    const error = new AppError(503);
    expect(getErrorRecoveryStrategy(error)).toBe('RETRY_WITH_EXPONENTIAL_BACKOFF');

    const notFound = new AppError(404);
    expect(getErrorRecoveryStrategy(notFound)).toBe('RESOURCE_NOT_FOUND');
  });

  it('withRetry retries retryable operations and resolves successfully', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new AppError('WALLET_NETWORK_ERROR'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 2, delayMs: 10, backoffMultiplier: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('getErrorSeverity returns correct severity levels', () => {
    const critical = new AppError(500);
    expect(getErrorSeverity(critical)).toBe('CRITICAL');

    const warning = new AppError(404);
    expect(getErrorSeverity(warning)).toBe('WARNING');

    const info = new AppError('UNKNOWN_ERROR');
    info.httpStatus = 200;
    expect(getErrorSeverity(info)).toBe('INFO');
  });
});