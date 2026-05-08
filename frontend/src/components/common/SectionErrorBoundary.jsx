import React, { Component } from 'react';
import PropTypes from 'prop-types';

class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
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
    const { children, sectionName = 'This section', hideDetails = false } = this.props;

    if (!hasError) return children;

    return (
      <div
        role="alert"
        aria-live="polite"
        className="rounded-xl border border-red-500/30 bg-red-900/10 p-5 text-sm"
      >
        <div className="flex items-start gap-3">
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
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

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-300 mb-1">
              {sectionName} failed to load
            </p>
            <p className="text-red-400/80 text-xs leading-relaxed">
              An error occurred in this section. Other parts of the page are unaffected.
            </p>

            {!hideDetails && process.env.NODE_ENV === 'development' && error && (
              <details className="mt-3">
                <summary className="text-xs text-red-400/60 cursor-pointer hover:text-red-300 transition-colors">
                  Dev details
                </summary>
                <pre className="text-xs text-red-300/70 mt-2 overflow-auto max-h-32 font-mono whitespace-pre-wrap bg-black/20 rounded p-2">
                  {error?.toString()}
                </pre>
              </details>
            )}
          </div>

          <button
            onClick={this.handleReset}
            aria-label={`Retry loading ${sectionName}`}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

SectionErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  sectionName: PropTypes.string,
  onError: PropTypes.func,
  onReset: PropTypes.func,
  hideDetails: PropTypes.bool,
};

SectionErrorBoundary.displayName = 'SectionErrorBoundary';

export default SectionErrorBoundary;
