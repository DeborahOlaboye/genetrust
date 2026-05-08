import React from 'react';
import PropTypes from 'prop-types';

/**
 * Standalone retry button used inside error fallback UIs.
 * Accepts an onClick handler and an optional aria-label override.
 */
const ErrorRetryButton = ({ onClick, label = 'Retry', ariaLabel, size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className={`${sizeClasses[size]} rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 transition-colors font-medium ${className}`}
    >
      {label}
    </button>
  );
};

ErrorRetryButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

ErrorRetryButton.displayName = 'ErrorRetryButton';

export default ErrorRetryButton;
