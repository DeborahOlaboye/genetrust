import {
  fetchWithRetry,
  createApiClient,
  createError,
  ApiError
} from './apiService';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('createError', () => {
    it('creates a basic error object', () => {
      const error = createError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.timestamp).toBeDefined();
    });

    it('creates an error with additional properties', () => {
      const error = createError('Test error', {
        status: 404,
        code: 'NOT_FOUND',
        details: { id: 123 }
      });

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ id: 123 });
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('fetchWithRetry', () => {
    it('returns successful response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await fetchWithRetry('/api/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
      expect(result.retryCount).toBe(0);
    });

    it('handles JSON parse errors gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map([['content-type', 'application/json']]),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await fetchWithRetry('/api/test');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns error for non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ message: 'Resource not found' }),
        headers: new Map([['content-type', 'application/json']]),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await fetchWithRetry('/api/test');

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Resource not found');
      expect(result.error.status).toBe(404);
    });

    it('retries on network errors', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' }),
          headers: new Map([['content-type', 'application/json']]),
        });

      const result = await fetchWithRetry('/api/test');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('retries on retryable status codes', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: jest.fn().mockResolvedValue({ message: 'Server error' }),
          headers: new Map([['content-type', 'application/json']]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'success' }),
          headers: new Map([['content-type', 'application/json']]),
        });

      const result = await fetchWithRetry('/api/test');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    it('stops retrying after max retries', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchWithRetry('/api/test', {}, { retry: 2 });

      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('MAX_RETRIES_EXCEEDED');
      expect(result.retryCount).toBe(2);
    });

    it('prevents duplicate requests by default', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      };

      fetch.mockResolvedValue(mockResponse);

      // Start two identical requests
      const promise1 = fetchWithRetry('/api/test');
      const promise2 = fetchWithRetry('/api/test');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(fetch).toHaveBeenCalledTimes(1); // Only one actual fetch call
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('allows duplicate requests when configured', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      };

      fetch.mockResolvedValue(mockResponse);

      // Start two identical requests with allowDuplicate
      const promise1 = fetchWithRetry('/api/test', {}, { allowDuplicate: true });
      const promise2 = fetchWithRetry('/api/test', {}, { allowDuplicate: true });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(fetch).toHaveBeenCalledTimes(2); // Two actual fetch calls
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('createApiClient', () => {
    it('creates an API client with default configuration', () => {
      const client = createApiClient();

      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.put).toBeDefined();
      expect(client.delete).toBeDefined();
      expect(client.request).toBeDefined();
    });

    it('creates a client with custom base URL', () => {
      const client = createApiClient({ baseURL: 'https://api.example.com' });

      // Mock fetch for testing
      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      });

      client.get('/users');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('handles GET requests with query parameters', () => {
      const client = createApiClient();

      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
        headers: new Map([['content-type', 'application/json']]),
      });

      client.get('/users', { page: 1, limit: 10 });

      expect(fetch).toHaveBeenCalledWith(
        '/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('handles POST requests with data', () => {
      const client = createApiClient();

      fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'created' }),
        headers: new Map([['content-type', 'application/json']]),
      });

      const testData = { name: 'John', email: 'john@example.com' };
      client.post('/users', testData);

      expect(fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        })
      );
    });
  });

  describe('ApiError', () => {
    it('creates API errors with proper structure', () => {
      const error = ApiError.create('Test error', {
        status: 400,
        code: 'VALIDATION_ERROR',
        details: { field: 'email' }
      });

      expect(error.message).toBe('Test error');
      expect(error.isApiError).toBe(true);
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.timestamp).toBeDefined();
    });

    it('identifies API errors correctly', () => {
      const apiError = ApiError.create('API error');
      const regularError = new Error('Regular error');

      expect(ApiError.isApiError(apiError)).toBe(true);
      expect(ApiError.isApiError(regularError)).toBe(false);
      expect(ApiError.isApiError(null)).toBe(false);
      expect(ApiError.isApiError({})).toBe(false);
    });
  });
});