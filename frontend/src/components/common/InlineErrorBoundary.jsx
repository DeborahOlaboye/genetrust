import React, { Component } from 'react';
import PropTypes from 'prop-types';

class InlineErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallbackText = 'Failed to load', showRetry = true } = this.props;

    return (
      <span
        role="alert"
        className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-900/10 border border-red-500/20 rounded px-2 py-1"
      >
        <svg
          aria-hidden="true"
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01"
          />
        </svg>
        <span>{fallbackText}</span>
        {showRetry && (
          <button
            onClick={this.handleReset}
            aria-label="Retry"
            className="underline hover:no-underline ml-0.5"
          >
            retry
          </button>
        )}
      </span>
    );
  }
}

InlineErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallbackText: PropTypes.string,
  showRetry: PropTypes.bool,
  onError: PropTypes.func,
  onReset: PropTypes.func,
};

InlineErrorBoundary.displayName = 'InlineErrorBoundary';

export default InlineErrorBoundary;
