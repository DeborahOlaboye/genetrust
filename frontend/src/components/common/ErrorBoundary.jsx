import React, { Component } from 'react';
import PropTypes from 'prop-types';
import analyticsService from '../../services/analytics/analyticsService';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our analytics service
    analyticsService.trackError(error, {
      componentStack: errorInfo?.componentStack,
      errorBoundary: true
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback: Fallback, children } = this.props;

    if (hasError) {
      // Render fallback UI if provided
      if (Fallback) {
        return <Fallback error={error} errorInfo={errorInfo} />;
      }

      // Default error UI
      return (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <details className="whitespace-pre-wrap">
            {error && error.toString()}
            <br />
            {errorInfo?.componentStack}
          </details>
          <button
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
};

export default ErrorBoundary;
