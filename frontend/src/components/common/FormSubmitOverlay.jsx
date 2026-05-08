import React from 'react';
import PropTypes from 'prop-types';

/**
 * Semi-transparent overlay that prevents interaction with a form section
 * while a submission is in progress. Renders inside a `position: relative`
 * container and covers it with an accessible loading indicator.
 */
const FormSubmitOverlay = ({ isLoading, message = 'Processing…', children }) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div
        role="status"
        aria-live="polite"
        aria-label={message}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[#0B0B1D]/70 backdrop-blur-sm z-10"
      >
        <div
          className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mb-3"
          aria-hidden="true"
        />
        <span className="text-sm text-[#9AA0B2]">{message}</span>
      </div>
    )}
  </div>
);

FormSubmitOverlay.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  message: PropTypes.string,
  children: PropTypes.node.isRequired,
};

FormSubmitOverlay.displayName = 'FormSubmitOverlay';

export default FormSubmitOverlay;
