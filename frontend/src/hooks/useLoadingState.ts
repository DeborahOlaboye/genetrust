import { useState, useCallback } from 'react';

interface UseLoadingStateReturn {
  isLoading: boolean;
  error: Error | null;
  startLoading: () => void;
  stopLoading: (error?: Error | null) => void;
  withLoading: <T>(asyncFunction: () => Promise<T>) => Promise<T>;
}

const useLoadingState = (initialState: boolean = false): UseLoadingStateReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(initialState);
  const [error, setError] = useState<Error | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback((error: Error | null = null) => {
    setIsLoading(false);
    if (error) {
      setError(error);
      console.error('Loading error:', error);
    }
  }, []);

  const withLoading = useCallback(
    async <T,>(asyncFunction: () => Promise<T>): Promise<T> => {
      try {
        startLoading();
        const result = await asyncFunction();
        stopLoading();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        stopLoading(error);
        throw error;
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    withLoading,
  };
};

export default useLoadingState;
