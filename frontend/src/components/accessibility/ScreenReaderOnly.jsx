// Screen reader only component
// Hides content visually but keeps it accessible to assistive technologies

import React from 'react';
import PropTypes from 'prop-types';

const ScreenReaderOnly = ({ 
  children, 
  as: Component = 'span',
  className = '',
  ...props 
}) => {
  return (
    <Component
      className={`
        sr-only
        absolute w-px h-px p-0 -m-px
        overflow-hidden whitespace-nowrap
        border-0
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
};

ScreenReaderOnly.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
  className: PropTypes.string,
};

export default ScreenReaderOnly;