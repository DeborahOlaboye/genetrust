import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
    this.resetBtnRef = createRef();
    this._retryCount = 0;
  }

  static getDerivedStateFromError(error) {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk \d+ failed/.test(error?.message || '') ||
      /Failed to fetch dynamically imported module/.test(error?.message || '');
    return { hasError: true, isChunkError };
  }

  componentDidUpdate(_, prevState) {
    if (!prevState.hasError && this.state.hasError && this.resetBtnRef.current) {
      this.resetBtnRef.current.focus();
    }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // Auto-retry once on chunk-load errors caused by stale deployments
    if (this.state.isChunkError && this._retryCount === 0) {
      this._retryCount += 1;
      window.location.reload();
    }
  }

  handleReset = () => {
    this._retryCount = 0;
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error, errorInfo, isChunkError } = this.state;
    const { children, pageName = 'this page' } = this.props;

    if (!hasError) return children;

    const title = isChunkError ? 'Update required' : 'Something went wrong';
    const body = isChunkError
      ? 'A new version of GeneTrust was deployed. The page will reload automatically, or click Reload below.'
      : `An unexpected error occurred on ${pageName}. Your data is safe — try again or go home.`;

    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] p-6"
      >
        <div
          className="max-w-lg w-full bg-[#14102E]/80 backdrop-blur-xl rounded-2xl border border-[#8B5CF6]/20 p-10 text-center shadow-2xl"
          aria-labelledby="page-error-heading"
          tabIndex={-1}
        >
          <div
            role="img"
            aria-label="Error icon"
            className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20"
          >
            <svg
              aria-hidden="true"
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

          <h1 id="page-error-heading" className="text-2xl font-bold text-white mb-3">
            {title}
          </h1>

          <p className="text-[#9AA0B2] mb-8 leading-relaxed">{body}</p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-6 text-left bg-black/30 rounded-lg p-4 border border-red-500/20">
              <summary className="text-sm text-[#9AA0B2] cursor-pointer mb-2 hover:text-white transition-colors">
                Error details (dev only)
              </summary>
              <pre className="text-xs text-red-300 overflow-auto max-h-48 mt-2 font-mono whitespace-pre-wrap">
                {error?.toString()}
                {error?.stack ? `\n\nStack:\n${error.stack}` : ''}
                {errorInfo?.componentStack ? `\n\nComponent Stack:${errorInfo.componentStack}` : ''}
              </pre>
            </details>
          )}

          <div role="group" aria-label="Error recovery actions" className="flex gap-3 justify-center">
            <button
              ref={this.resetBtnRef}
              onClick={isChunkError ? () => window.location.reload() : this.handleReset}
              aria-label={isChunkError ? 'Reload the page to get the latest version' : 'Try again'}
              className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-[#8B5CF6]/20"
            >
              {isChunkError ? 'Reload' : 'Try Again'}
            </button>

            <button
              onClick={() => { window.location.href = '/'; }}
              aria-label="Go to homepage"
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all duration-200 font-semibold"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

PageErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  pageName: PropTypes.string,
  onError: PropTypes.func,
  onReset: PropTypes.func,
};

PageErrorBoundary.displayName = 'PageErrorBoundary';

export default PageErrorBoundary;
