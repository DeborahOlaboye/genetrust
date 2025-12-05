import React from 'react';
import PropTypes from 'prop-types';
import AppError from '../../utils/error/AppError';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error: AppError.fromError(error, {
        code: 'COMPONENT_ERROR',
        statusCode: 500,
        isOperational: true,
      })
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // You can also log the error to your error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
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
        <div className="error-boundary">
          <div className="error-message">
            <h2>{errorMessage}</h2>
            {error?.message && <p>{error.message}</p>}
            {showReset && (
              <button onClick={this.handleReset}>
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

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  onReset: PropTypes.func,
  errorMessage: PropTypes.string,
  showReset: PropTypes.bool,
};

export default ErrorBoundary;
