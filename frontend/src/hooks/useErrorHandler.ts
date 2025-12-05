import { useCallback, useRef } from 'react';
import AppError from '../utils/error/AppError';

/**
 * Options for error handling
 */
interface ErrorHandlerOptions {
  /**
   * Whether to log the error to the console
   * @default true in development, false in production
   */
  logToConsole?: boolean;
  
  /**
   * Whether to show a user-friendly error message
   * @default true
   */
  showUserMessage?: boolean;
  
  /**
   * Custom error message to show to the user
   */
  userMessage?: string;
  
  /**
   * Whether to rethrow the error after handling
   * @default false
   */
  rethrow?: boolean;
  
  /**
   * Additional context to include with the error
   */
  context?: Record<string, unknown>;
}

/**
 * Hook for handling errors in a consistent way
 * @returns An object with error handling functions
 */
export function useErrorHandler() {
  // Track the most recent error
  const errorRef = useRef<AppError | null>(null);
  
  /**
   * Handle an error with the specified options
   */
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): AppError => {
    // Normalize the error to an AppError
    const appError = error instanceof AppError 
      ? error 
      : AppError.fromError(error as Error, {
          code: 'UNHANDLED_ERROR',
          statusCode: 500,
          isOperational: false,
        });
    
    // Add context if provided
    if (options.context) {
      appError.details = {
        ...appError.details,
        ...options.context,
      };
    }
    
    // Log to console in development or if explicitly enabled
    const shouldLog = options.logToConsole ?? (process.env.NODE_ENV === 'development');
    if (shouldLog) {
      console.error('Error handled:', appError);
    }
    
    // Store the error for reference
    errorRef.current = appError;
    
    // Show user message if enabled
    const shouldShowUserMessage = options.showUserMessage ?? true;
    if (shouldShowUserMessage && typeof window !== 'undefined') {
      // Here you could integrate with a toast/notification system
      const message = options.userMessage || appError.message || 'An unexpected error occurred';
      alert(message); // Replace with your preferred notification system
    }
    
    // Rethrow if needed
    if (options.rethrow) {
      throw appError;
    }
    
    return appError;
  }, []);
  
  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options?: ErrorHandlerOptions
  ) => {
    return async (...args: TArgs): Promise<TReturn | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        return undefined;
      }
    };
  }, [handleError]);
  
  /**
   * Get the most recent error
   */
  const getLastError = useCallback((): AppError | null => {
    return errorRef.current;
  }, []);
  
  /**
   * Clear the current error
   */
  const clearError = useCallback((): void => {
    errorRef.current = null;
  }, []);
  
  return {
    handleError,
    withErrorHandling,
    getLastError,
    clearError,
    currentError: errorRef.current,
  };
}

/**
 * Hook to use the error boundary context
 */
export function useErrorBoundary() {
  // In a real implementation, this would use React Context
  // to communicate with the nearest ErrorBoundary
  
  const throwError = useCallback((error: unknown) => {
    // This would normally throw to the nearest error boundary
    // For now, we'll just log it
    console.error('Error boundary caught:', error);
    
    // In a real implementation, this would be:
    // throw error;
  }, []);
  
  return { throwError };
}

/**
 * Creates an error boundary component with custom behavior
 */
export function createErrorBoundary(
  options: {
    FallbackComponent?: React.ComponentType<{ error: AppError | null; reset: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  } = {}
) {
  return function ErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const [error, setError] = React.useState<AppError | null>(null);
    
    const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
      const appError = AppError.fromError(error);
      setError(appError);
      
      if (options.onError) {
        options.onError(error, errorInfo);
      }
      
      // Log to error tracking service
      console.error('Error boundary caught:', { error, errorInfo });
    }, []);
    
    const reset = React.useCallback(() => {
      setError(null);
    }, []);
    
    if (error) {
      if (options.FallbackComponent) {
        return <options.FallbackComponent error={error} reset={reset} />;
      }
      
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
          <button onClick={reset}>Try again</button>
        </div>
      );
    }
    
    return <>{children}</>;
  };
}
