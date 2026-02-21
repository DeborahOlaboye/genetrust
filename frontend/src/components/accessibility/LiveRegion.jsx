// Live region component for dynamic content announcements
// Announces changes to screen readers using ARIA live regions

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const LiveRegion = ({ 
  message, 
  priority = 'polite',
  clearAfter = 1000,
  className = '',
  ...props 
}) => {
  const regionRef = useRef(null);

  useEffect(() => {
    if (message && regionRef.current) {
      regionRef.current.textContent = message;
      
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearAfter);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      {...props}
    />
  );
};

LiveRegion.propTypes = {
  message: PropTypes.string,
  priority: PropTypes.oneOf(['polite', 'assertive', 'off']),
  clearAfter: PropTypes.number,
  className: PropTypes.string,
};

export default LiveRegion;