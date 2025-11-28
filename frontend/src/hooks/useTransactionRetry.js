import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * useTransactionRetry Hook
 *
 * Provides retry logic specifically for blockchain transactions
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Transaction-specific error handling
 * - User notifications for retry attempts
 * - Max retry limit
 */
export const useTransactionRetry = (options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 2000,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef(null);

  // Clear pending retry timeout
  const clearRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Calculate delay with exponential backoff
  const getRetryDelay = useCallback((attempt) => {
    return initialDelay * Math.pow(2, attempt);
  }, [initialDelay]);

  // Execute transaction with retry logic
  const executeWithRetry = useCallback(async (transactionFn, attemptNumber = 0) => {
    try {
      const result = await transactionFn();
      setIsRetrying(false);
      setRetryCount(0);
      clearRetry();

      toast.success('Transaction successful!');
      return result;
    } catch (error) {
      console.error(`Transaction attempt ${attemptNumber + 1} failed:`, error);

      if (attemptNumber < maxRetries) {
        setIsRetrying(true);
        setRetryCount(attemptNumber + 1);

        const delay = getRetryDelay(attemptNumber);

        toast.error(
          `Transaction failed. Retrying in ${delay / 1000}s... (${attemptNumber + 1}/${maxRetries})`,
          { duration: delay - 500 }
        );

        if (onRetry) {
          onRetry(error, attemptNumber + 1);
        }

        return new Promise((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(async () => {
            try {
              const result = await executeWithRetry(transactionFn, attemptNumber + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
        });
      } else {
        setIsRetrying(false);
        setRetryCount(0);

        toast.error('Transaction failed after multiple attempts. Please try again later.');

        if (onMaxRetriesReached) {
          onMaxRetriesReached(error);
        }

        throw error;
      }
    }
  }, [maxRetries, getRetryDelay, clearRetry, onRetry, onMaxRetriesReached]);

  // Manual retry function
  const retryTransaction = useCallback(async (transactionFn) => {
    setRetryCount(0);
    setIsRetrying(false);
    clearRetry();
    return executeWithRetry(transactionFn);
  }, [executeWithRetry, clearRetry]);

  // Cancel ongoing retry
  const cancelRetry = useCallback(() => {
    clearRetry();
    setIsRetrying(false);
    setRetryCount(0);
    toast.error('Retry cancelled');
  }, [clearRetry]);

  return {
    isRetrying,
    retryCount,
    executeWithRetry,
    retryTransaction,
    cancelRetry,
  };
};

export default useTransactionRetry;
