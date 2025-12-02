import { fetchWithRetry, createApiClient, api, ApiError } from '../apiService';

// Mock the global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('apiService', () => {
  const mockResponse = (status, data, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });

  beforeEach(() => {
    mockFetch.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchWithRetry', () => {
    it('should return successful response on first attempt', async () => {
      const responseData = { message: 'Success' };
      mockFetch.mockResolvedValueOnce(mockResponse(200, responseData));

      const result = await fetchWithRetry('https://api.example.com/data');

      expect(result).toEqual({
        success: true,
        data: responseData,
        retryCount: 0,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry failed requests and eventually succeed', async () => {
      const responseData = { message: 'Success' };
      
      // First two attempts fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse(500, { error: 'Server error' }))
        .mockResolvedValueOnce(mockResponse(200, responseData));

      const promise = fetchWithRetry('https://api.example.com/data', {}, { maxRetries: 3 });
      
      // Advance timers for retries
      await jest.advanceTimersByTimeAsync(1000); // First retry delay (1s)
      await jest.advanceTimersByTimeAsync(2000); // Second retry delay (2s)
      
      const result = await promise;

      expect(result).toEqual({
        success: true,
        data: responseData,
        retryCount: 2,
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retries', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      const promise = fetchWithRetry('https://api.example.com/data', {}, { maxRetries: 2 });
      
      // Advance timers for all retries
      await jest.advanceTimersByTimeAsync(3000); // 1s + 2s
      
      const result = await promise;

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: 'Request failed after maximum retries',
          code: 'MAX_RETRIES_EXCEEDED',
          details: error,
        }),
        retryCount: 2,
      });
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable status codes', async () => {
      const responseData = { error: 'Not found', code: 'NOT_FOUND' };
      mockFetch.mockResolvedValue(mockResponse(404, responseData));

      const result = await fetchWithRetry('https://api.example.com/not-found');

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: 'Request failed with status 404',
          status: 404,
          code: 'NOT_FOUND',
        }),
        retryCount: 0,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('createApiClient', () => {
    const baseURL = 'https://api.example.com';
    const apiClient = createApiClient({
      baseURL,
      defaultHeaders: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    it('should make GET requests with correct URL and headers', async () => {
      const responseData = { items: [1, 2, 3] };
      mockFetch.mockResolvedValue(mockResponse(200, responseData));

      await apiClient.get('/items', { page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items?page=1&limit=10',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make POST requests with JSON body', async () => {
      const requestData = { name: 'Test Item' };
      mockFetch.mockResolvedValue(mockResponse(201, { id: 1, ...requestData }));

      await apiClient.post('/items', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
    });
  });

  describe('ApiError', () => {
    it('should create an API error with additional properties', () => {
      const error = ApiError.create('Not found', {
        status: 404,
        code: 'NOT_FOUND',
        details: { resource: 'user' },
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ resource: 'user' });
      expect(error.isApiError).toBe(true);
      expect(typeof error.timestamp).toBe('string');
    });

    it('should check if an error is an API error', () => {
      const regularError = new Error('Regular error');
      const apiError = ApiError.create('API error');

      expect(ApiError.isApiError(regularError)).toBe(false);
      expect(ApiError.isApiError(apiError)).toBe(true);
    });
  });

  describe('default api instance', () => {
    it('should be properly configured', async () => {
      const responseData = { status: 'ok' };
      mockFetch.mockResolvedValue(mockResponse(200, responseData));

      const result = await api.get('/status');

      expect(result).toEqual({
        success: true,
        data: responseData,
        retryCount: 0,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/status'),
        expect.any(Object)
      );
    });
  });
});
