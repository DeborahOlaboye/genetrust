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

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback: Fallback, children } = this.props;

    if (hasError) {
      // Render fallback UI if provided
      if (Fallback) {
        return <Fallback error={error} errorInfo={errorInfo} reset={this.handleReset} />;
      }

      // Enhanced GeneTrust-themed error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] p-4">
          <div className="max-w-md w-full bg-[#14102E]/80 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/20 p-8 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <svg
                className="w-10 h-10 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Something went wrong
            </h2>

            <p className="text-[#9AA0B2] mb-6 leading-relaxed">
              We encountered an unexpected error. Your data is safe. Please try refreshing the page or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 text-left bg-black/30 rounded-lg p-4 border border-red-500/20">
                <summary className="text-sm text-[#9AA0B2] cursor-pointer mb-2 hover:text-white transition-colors">
                  Error details (dev mode)
                </summary>
                <pre className="text-xs text-red-300 overflow-auto max-h-40 mt-2 font-mono">
                  {error && error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-[#8B5CF6]/20"
              >
                Try Again
              </button>

              <button
                onClick={() => {
                  window.location.hash = '';
                  window.location.reload();
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all duration-200 font-semibold"
              >
                Go Home
              </button>
            </div>
          </div>
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
