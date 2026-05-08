import React from 'react';
import PropTypes from 'prop-types';
import LoadingSpinner from './LoadingSpinner';

/**
 * Renders a full-page loading overlay while `isLoading` is true, then
 * reveals children once loading completes. Use at the page level when
 * the entire page content depends on an async initialisation step.
 */
const PageLoadingGate = ({ isLoading, message = 'Loading…', children }) => {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={message}
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D]"
      >
        <LoadingSpinner size="lg" label={message} />
        <p className="mt-4 text-sm text-[#9AA0B2]">{message}</p>
      </div>
    );
  }

  return children;
};

PageLoadingGate.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  message: PropTypes.string,
  children: PropTypes.node.isRequired,
};

PageLoadingGate.displayName = 'PageLoadingGate';

export default PageLoadingGate;
