/**
 * @file API Service with enhanced error handling and retry mechanism
 * @module services/apiService
 * @description Provides a wrapper around fetch with standardized error handling,
 * retry logic, and request/response interception.
 */

/**
 * Standardized error format for API responses
 * @typedef {Object} ApiError
 * @property {string} message - Human-readable error message
 * @property {number} [status] - HTTP status code
 * @property {string} [code] - Application-specific error code
 * @property {any} [details] - Additional error details
 */

/**
 * Standardized response format for API calls
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {T} [data] - Response data (if successful)
 * @property {ApiError} [error] - Error details (if failed)
 * @property {number} [retryCount] - Number of retry attempts made
 */

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryOn: [408, 429, 500, 502, 503, 504], // Status codes to retry on
};

// Track active requests to prevent duplicate calls
const activeRequests = new Map();

/**
 * Creates a standardized error object
 * @param {string} message - Error message
 * @param {Object} [options] - Additional error options
 * @param {number} [options.status] - HTTP status code
 * @param {string} [options.code] - Application error code
 * @param {any} [options.details] - Additional error details
 * @returns {ApiError} Standardized error object
 */
function createError(message, { status, code, details } = {}) {
  return {
    message,
    status,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Delays execution for the specified duration
 * @param {number} ms - Delay duration in milliseconds
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determines if a request should be retried based on the response or error
 * @param {Response} response - Fetch response object
 * @param {Error} error - Error object if the request failed
 * @param {number} retryCount - Current retry attempt count
 * @param {Object} retryConfig - Retry configuration
 * @returns {boolean} Whether to retry the request
 */
function shouldRetry(response, error, retryCount, retryConfig) {
  // Don't retry if we've reached max retries
  if (retryCount >= retryConfig.maxRetries) return false;
  
  // Retry on network errors
  if (error) return true;
  
  // Retry on specific status codes
  if (response && retryConfig.retryOn.includes(response.status)) {
    return true;
  }
  
  return false;
}

/**
 * Parses the response body as JSON if possible, falls back to text
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed response body
 */
async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.warn('Failed to parse JSON response', error);
      return null;
    }
  }
  return response.text();
}

/**
 * Enhanced fetch wrapper with retry logic and standardized error handling
 * @template T
 * @param {string} url - The URL to fetch
 * @param {RequestInit} [options] - Fetch options
 * @param {Object} [config] - Additional configuration
 * @param {number} [config.retry] - Number of retry attempts (overrides default)
 * @param {number} [config.retryDelay] - Delay between retries in ms (overrides default)
 * @param {number[]} [config.retryOn] - Status codes to retry on (overrides default)
 * @param {boolean} [config.allowDuplicate] - Allow duplicate requests (default: false)
 * @returns {Promise<ApiResponse<T>>} Standardized API response
 */
export async function fetchWithRetry(
  url,
  options = {},
  { retry, retryDelay, retryOn, allowDuplicate = false } = {}
) {
  const retryConfig = {
    maxRetries: retry ?? DEFAULT_RETRY_CONFIG.maxRetries,
    retryDelay: retryDelay ?? DEFAULT_RETRY_CONFIG.retryDelay,
    retryOn: retryOn ?? [...DEFAULT_RETRY_CONFIG.retryOn],
  };

  // Create a unique key for this request to prevent duplicates
  const requestKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
  
  // If this is a duplicate request and duplicates aren't allowed, return the existing promise
  if (!allowDuplicate && activeRequests.has(requestKey)) {
    return activeRequests.get(requestKey);
  }

  let retryCount = 0;
  let lastError = null;
  let lastResponse = null;

  // Create a promise that will handle the request with retries
  const requestPromise = (async () => {
    while (retryCount <= retryConfig.maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        const responseData = await parseResponseBody(response);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorMessage =
            responseData?.message ||
            response.statusText ||
            `Request failed with status ${response.status}`;
          
          const error = createError(errorMessage, {
            status: response.status,
            code: responseData?.code,
            details: responseData?.details,
          });

          // Check if we should retry
          if (shouldRetry(response, null, retryCount, retryConfig)) {
            retryCount++;
            await delay(retryConfig.retryDelay * Math.pow(2, retryCount - 1));
            continue;
          }

          // If we shouldn't retry, return the error
          return {
            success: false,
            error,
            retryCount,
          };
        }

        // Request was successful
        return {
          success: true,
          data: responseData,
          retryCount,
        };
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (shouldRetry(null, error, retryCount, retryConfig)) {
          retryCount++;
          await delay(retryConfig.retryDelay * Math.pow(2, retryCount - 1));
          continue;
        }

        // If we shouldn't retry, return the error
        return {
          success: false,
          error: createError(
            error.message || 'Network request failed',
            { code: 'NETWORK_ERROR' }
          ),
          retryCount,
        };
      }
    }

    // If we've exhausted all retries
    return {
      success: false,
      error: createError(
        lastError?.message || 'Request failed after maximum retries',
        { 
          code: 'MAX_RETRIES_EXCEEDED',
          details: lastError,
        }
      ),
      retryCount,
    };
  })();

  // Store the promise to prevent duplicate requests
  if (!allowDuplicate) {
    activeRequests.set(requestKey, requestPromise);
    
    // Clean up the request from active requests when it's done
    requestPromise
      .then(() => activeRequests.delete(requestKey))
      .catch(() => activeRequests.delete(requestKey));
  }

  return requestPromise;
}

/**
 * Creates an API client with pre-configured defaults
 * @param {Object} config - API client configuration
 * @param {string} [config.baseURL] - Base URL for all requests
 * @param {Object} [config.defaultHeaders] - Default headers for all requests
 * @param {Object} [config.retry] - Default retry configuration
 * @returns {Object} API client methods
 */
export function createApiClient(config = {}) {
  const { baseURL = '', defaultHeaders = {}, retry: retryConfig = {} } = config;

  /**
   * Makes a request to the API
   * @template T
   * @param {string} endpoint - API endpoint (will be appended to baseURL)
   * @param {Object} options - Fetch options
   * @param {Object} [requestConfig] - Request configuration
   * @returns {Promise<ApiResponse<T>>} Standardized API response
   */
  const request = async (endpoint, options = {}, requestConfig = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;
    
    try {
      return await fetchWithRetry(
        url,
        {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        },
        { ...retryConfig, ...requestConfig.retry }
      );
    } catch (error) {
      return {
        success: false,
        error: createError(
          error.message || 'An unexpected error occurred',
          { code: 'UNKNOWN_ERROR' }
        ),
      };
    }
  };

  // Convenience methods
  return {
    get: (endpoint, params, config) => {
      const query = params ? `?${new URLSearchParams(params)}` : '';
      return request(`${endpoint}${query}`, { method: 'GET' }, config);
    },
    
    post: (endpoint, data, config) =>
      request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      }, config),
      
    put: (endpoint, data, config) =>
      request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, config),
      
    delete: (endpoint, config) =>
      request(endpoint, { method: 'DELETE' }, config),
      
    request, // Expose the raw request method for custom requests
  };
}

// Default API client instance
export const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  defaultHeaders: {
    'Accept': 'application/json',
  },
  retry: {
    maxRetries: 2,
    retryDelay: 1000,
  },
});

/**
 * Error boundary component for catching and displaying API errors
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {React.ReactNode} [props.fallback] - Fallback UI to render when an error occurs
 * @param {Function} [props.onError] - Error handler function
 * @returns {React.ReactNode}
 */
export function ApiErrorBoundary({ children, fallback = null, onError }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const errorHandler = (event) => {
      // Handle unhandled promise rejections (API errors)
      if (event.reason?.isApiError) {
        setError(event.reason);
        setHasError(true);
        if (onError) onError(event.reason);
        event.preventDefault(); // Prevent default error logging
      }
    };

    window.addEventListener('unhandledrejection', errorHandler);
    return () => {
      window.removeEventListener('unhandledrejection', errorHandler);
    };
  }, [onError]);

  if (hasError) {
    return fallback || (
      <div className="api-error">
        <h2>Something went wrong</h2>
        <p>{error?.message || 'An unexpected error occurred'}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return children;
}

// Export error utilities
export const ApiError = {
  /**
   * Creates a standardized API error
   * @param {string} message - Error message
   * @param {Object} [options] - Error options
   * @param {number} [options.status] - HTTP status code
   * @param {string} [options.code] - Application error code
   * @param {any} [options.details] - Additional error details
   * @returns {Error} Error object with additional properties
   */
  create: (message, options) => {
    const error = new Error(message);
    Object.assign(error, {
      isApiError: true,
      status: options?.status,
      code: options?.code,
      details: options?.details,
      timestamp: new Date().toISOString(),
    });
    return error;
  },
  
  /**
   * Checks if an error is an API error
   * @param {any} error - Error to check
   * @returns {boolean} Whether the error is an API error
   */
  isApiError: (error) => {
    return error && error.isApiError === true;
  },
};
