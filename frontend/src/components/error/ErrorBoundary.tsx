import React, { ReactNode, Component, ErrorInfo } from 'react';
import AppError from '../../utils/error/AppError';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: AppError | null; onReset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  errorMessage?: string;
  showReset?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static defaultProps: Partial<ErrorBoundaryProps> = {
    errorMessage: 'Something went wrong.',
    showReset: true,
  };

  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: AppError.fromError(error, {
        code: 'COMPONENT_ERROR',
        statusCode: 500,
        isOperational: true,
      }),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): ReactNode {
    const { hasError, error } = this.state;
    const { 
      children, 
      fallback: FallbackComponent, 
      errorMessage = 'Something went wrong.',
      showReset = true
    } = this.props;

    if (hasError) {
      if (FallbackComponent) {
        return <FallbackComponent error={error} onReset={this.handleReset} />;
      }

      return (
        <div className="error-boundary p-4 bg-red-50 text-red-800 rounded-md">
          <div className="error-message">
            <h2 className="text-xl font-bold mb-2">{errorMessage}</h2>
            {error?.message && (
              <pre className="bg-white p-2 rounded overflow-auto text-sm mb-4">
                {error.message}
              </pre>
            )}
            {showReset && (
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
