import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';

const WALLET_ERROR_PATTERNS = [
  /user rejected/i,
  /user denied/i,
  /wallet not connected/i,
  /wallet connection/i,
  /stacks wallet/i,
  /leather/i,
  /xverse/i,
];

function isWalletError(error) {
  const msg = error?.message || error?.toString() || '';
  return WALLET_ERROR_PATTERNS.some(p => p.test(msg));
}

class WalletErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isWalletError: false };
    this.retryBtnRef = createRef();
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, isWalletError: isWalletError(error) };
  }

  componentDidUpdate(_, prevState) {
    if (!prevState.hasError && this.state.hasError && this.retryBtnRef.current) {
      this.retryBtnRef.current.focus();
    }
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, isWalletError: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { hasError, error, isWalletError: walletErr } = this.state;
    const { children } = this.props;

    if (!hasError) return children;

    const title = walletErr ? 'Wallet connection failed' : 'Wallet error';
    const body = walletErr
      ? 'The wallet connection was rejected or timed out. Make sure Leather or Xverse is installed and unlocked, then try again.'
      : 'An unexpected wallet error occurred. Please reconnect your wallet.';

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-5"
      >
        <div className="flex items-start gap-3">
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-300 mb-1">{title}</p>
            <p className="text-amber-400/80 text-xs leading-relaxed">{body}</p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-2">
                <summary className="text-xs text-amber-400/50 cursor-pointer">Dev details</summary>
                <pre className="text-xs text-amber-300/60 mt-1 font-mono whitespace-pre-wrap bg-black/20 rounded p-2 overflow-auto max-h-24">
                  {error?.toString()}
                </pre>
              </details>
            )}
          </div>
          <button
            ref={this.retryBtnRef}
            onClick={this.handleReset}
            aria-label="Retry wallet connection"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 transition-colors"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }
}

WalletErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  onReset: PropTypes.func,
};

WalletErrorBoundary.displayName = 'WalletErrorBoundary';

export default WalletErrorBoundary;
