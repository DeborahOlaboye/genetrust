import React from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';

// Define a custom error type that extends the standard Error
interface AppError extends Error {
  code?: string;
  response?: {
    status?: number;
  };
}

// Define error codes locally
const ERROR_CODES = {
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_NOT_FOUND: 'API_NOT_FOUND',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_TRANSACTION_REJECTED: 'WALLET_TRANSACTION_REJECTED'
};

interface WithLoadingStateProps {
  isLoading?: boolean;
  error?: AppError | null;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  onRetry?: () => void;
  onClose?: () => void;
  errorTitle?: string;
}

const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    LoadingComponent?: React.ComponentType<{ text?: string; className?: string }>;
    ErrorComponent?: React.ComponentType<{ 
      error: AppError; 
      onRetry?: () => void; 
      onClose?: () => void;
      title?: string;
      showDetails?: boolean;
      showRetry?: boolean;
      showClose?: boolean;
      severity?: string;
      fullWidth?: boolean;
    }>;
  } = {}
) => {
  const { 
    LoadingComponent = ({ text, className }) => (
      <div className={`flex items-center justify-center p-4 ${className || ''}`}>
        <LoadingSpinner size="lg" />
        {text && <span className="ml-2 text-gray-600 dark:text-gray-400">{text}</span>}
      </div>
    ),
    ErrorComponent = ({ 
      error, 
      onRetry, 
      onClose, 
      title,
      showDetails = true,
      showRetry = true,
      showClose = true,
      severity,
      fullWidth = false
    }) => {
      // Determine the title based on error code if not provided
      const getErrorTitle = () => {
        if (title) return title;
        if (error?.code) {
          const errorTitles = {
            [ERROR_CODES.NETWORK_OFFLINE]: 'Connection Error',
            [ERROR_CODES.API_UNAUTHORIZED]: 'Authentication Required',
            [ERROR_CODES.API_FORBIDDEN]: 'Access Denied',
            [ERROR_CODES.API_NOT_FOUND]: 'Not Found',
            [ERROR_CODES.API_SERVER_ERROR]: 'Server Error',
            [ERROR_CODES.WALLET_NOT_CONNECTED]: 'Wallet Not Connected',
            [ERROR_CODES.WALLET_TRANSACTION_REJECTED]: 'Transaction Rejected',
          };
          return errorTitles[error.code] || 'Something went wrong';
        }
        return 'Something went wrong';
      };

      return (
        <div className={fullWidth ? 'w-full' : 'w-auto'}>
          <ErrorDisplay 
            error={error}
            onRetry={onRetry}
            onClose={onClose}
            title={getErrorTitle()}
            showDetails={showDetails}
            showRetry={showRetry && !!onRetry}
            showClose={showClose && !!onClose}
            severity={severity}
            fullWidth={fullWidth}
          />
        </div>
      );
    }
  } = options;

  return (props: P & WithLoadingStateProps) => {
    const { 
      isLoading = false, 
      error = null, 
      loadingText, 
      children,
      className = '',
      onRetry,
      onClose,
      errorTitle,
      ...restProps 
    } = props;

    if (error) {
      return (
        <ErrorComponent 
          error={error} 
          onRetry={onRetry}
          onClose={onClose}
          title={errorTitle}
          showRetry={!!onRetry}
          showClose={!!onClose}
        />
      );
    }

    if (isLoading) {
      return <LoadingComponent text={loadingText} className={className} />;
    }

    return <Component {...(restProps as P)}>{children}</Component>;
  };
};

export default withLoadingState;
