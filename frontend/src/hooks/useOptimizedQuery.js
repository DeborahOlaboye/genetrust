import { useState, useCallback, useRef, useEffect } from 'react';
import { useBlockchainCache } from './useBlockchainCache';
import { requestDeduplicator, queryBatcher } from '../utils/performanceOptimization';

/**
 * useOptimizedQuery Hook
 *
 * Optimized blockchain query execution with caching, deduplication, and batching
 *
 * Features:
 * - Automatic caching with TTL
 * - Request deduplication
 * - Query batching
 * - Loading and error states
 * - Automatic retry on failure
 */

export const useOptimizedQuery = (options = {}) => {
  const {
    enableCache = true,
    cacheTTL = 60000, // 1 minute
    enableBatching = false,
    enableDeduplication = true,
    retryAttempts = 2,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const { cachedQuery } = useBlockchainCache({ ttl: cacheTTL });

  /**
   * Execute query with all optimizations
   */
  const executeQuery = useCallback(async (queryKey, queryFn, queryOptions = {}) => {
    const {
      skipCache = false,
      skipDeduplication = false,
      skipBatching = false,
      onSuccess,
      onError,
    } = queryOptions;

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      let result;

      // Wrap query function with retry logic
      const queryWithRetry = async (attempt = 0) => {
        try {
          return await queryFn(abortControllerRef.current.signal);
        } catch (err) {
          if (attempt < retryAttempts && !abortControllerRef.current.signal.aborted) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
            return queryWithRetry(attempt + 1);
          }
          throw err;
        }
      };

      // Apply optimizations based on configuration
      if (enableCache && !skipCache) {
        // Use cache
        result = await cachedQuery(queryKey, queryWithRetry, [], { forceRefresh: false });
      } else if (enableDeduplication && !skipDeduplication) {
        // Use deduplication
        result = await requestDeduplicator.execute(queryKey, queryWithRetry);
      } else if (enableBatching && !skipBatching) {
        // Use batching
        result = await queryBatcher.add(queryWithRetry);
      } else {
        // Execute directly
        result = await queryWithRetry();
      }

      setData(result);
      setLoading(false);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err);
        setLoading(false);

        if (onError) {
          onError(err);
        }
      }
      throw err;
    }
  }, [enableCache, cacheTTL, enableDeduplication, enableBatching, retryAttempts, retryDelay, cachedQuery]);

  /**
   * Refetch query
   */
  const refetch = useCallback(async (queryKey, queryFn, queryOptions = {}) => {
    return executeQuery(queryKey, queryFn, { ...queryOptions, skipCache: true });
  }, [executeQuery]);

  /**
   * Cancel ongoing query
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    executeQuery,
    refetch,
    cancel,
    reset,
  };
};

export default useOptimizedQuery;
