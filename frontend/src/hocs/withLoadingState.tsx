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
      return (
        <div className={fullWidth ? 'w-full' : 'w-auto'}>
          <ErrorDisplay
            error={error}
            onRetry={onRetry}
            onClose={onClose}
            title={title}
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
