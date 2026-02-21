// Focus trap component for modals and dialogs
// Manages keyboard focus within a container for accessibility

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getFocusableElements } from '../../utils/accessibility';

const FocusTrap = ({ 
  children, 
  active = true,
  restoreFocus = true,
  autoFocus = true,
  className = '',
  ...props 
}) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!active) {
      // Restore focus when trap is deactivated
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      return;
    }

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Get focusable elements
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Auto-focus first element
    if (autoFocus) {
      firstElement.focus();
    }

    // Handle tab key to trap focus
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, autoFocus, restoreFocus]);

  return (
    <div
      ref={containerRef}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

FocusTrap.propTypes = {
  children: PropTypes.node.isRequired,
  active: PropTypes.bool,
  restoreFocus: PropTypes.bool,
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
};

export default FocusTrap;