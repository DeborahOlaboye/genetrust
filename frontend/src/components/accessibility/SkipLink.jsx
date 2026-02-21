// Skip link component for keyboard navigation
// Provides quick navigation to main content areas

import React from 'react';
import PropTypes from 'prop-types';

const SkipLink = ({ 
  href, 
  children = 'Skip to main content',
  className = '',
  ...props 
}) => {
  return (
    <a
      href={href}
      className={`
        skip-link
        absolute -top-10 left-2 z-50
        bg-gray-900 text-white
        px-4 py-2 rounded
        text-sm font-medium
        focus:top-2
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      {children}
    </a>
  );
};

SkipLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default SkipLink;