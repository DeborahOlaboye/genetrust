import { useEffect, useRef } from 'react';

/**
 * Hook to manage focus for better keyboard navigation
 * @param {boolean} isOpen - Whether the component is open
 * @param {Object} options - Configuration options
 * @param {string} options.focusFirst - Selector for the first focusable element
 * @param {string} options.focusAfterClose - Selector for the element to focus after closing
 * @param {boolean} options.autoFocus - Whether to auto-focus the first element
 */
export function useFocusTrap(isOpen, { focusFirst, focusAfterClose, autoFocus = true } = {}) {
  const ref = useRef(null);
  const previousFocus = useRef(document.activeElement);

  useEffect(() => {
    if (!isOpen) {
      if (focusAfterClose) {
        const element = document.querySelector(focusAfterClose);
        element?.focus();
      } else if (previousFocus.current) {
        previousFocus.current.focus();
      }
      return;
    }

    // Store the currently focused element
    previousFocus.current = document.activeElement;

    const container = ref.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusFirst 
      ? container.querySelector(focusFirst) 
      : focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Auto-focus first element
    if (autoFocus && firstElement) {
      firstElement.focus();
    }

    // Handle keyboard trap
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusFirst, focusAfterClose, autoFocus]);

  return ref;
}

/**
 * Hook to handle keyboard interactions
 * @param {Object} keyHandlers - Object mapping keys to handler functions
 * @param {Array} deps - Dependencies for the effect
 */
export function useKeyboardNavigation(keyHandlers, deps = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const handler = keyHandlers[e.key];
      if (handler) {
        handler(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyHandlers, ...deps]);
}

/**
 * Component to visually hide content but keep it accessible to screen readers
 */
export function VisuallyHidden({ children, ...props }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Higher-order component to add ARIA attributes to a component
 * @param {React.ComponentType} Component - Component to enhance
 * @param {Object} defaultProps - Default ARIA props
 */
export function withA11y(Component, defaultProps = {}) {
  return function WithA11y({
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...props
  }) {
    // Only include ARIA attributes if they have values
    const a11yProps = {};
    if (ariaLabel) a11yProps['aria-label'] = ariaLabel;
    if (ariaLabelledBy) a11yProps['aria-labelledby'] = ariaLabelledBy;
    if (ariaDescribedBy) a11yProps['aria-describedby'] = ariaDescribedBy;

    return <Component {...props} {...a11yProps} />;
  };
}

/**
 * Hook to handle focus management for modals and dialogs
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Object} options - Options for focus management
 */
export function useModalFocus(isOpen, { onClose } = {}) {
  const modalRef = useRef(null);
  const openButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  useFocusTrap(isOpen, {
    focusFirst: '[data-autofocus]',
    focusAfterClose: `[data-modal-opener="${modalRef.current?.id}"]`,
  });

  // Handle escape key to close modal
  useKeyboardNavigation(
    {
      Escape: onClose || (() => {}),
    },
    [onClose]
  );

  return {
    modalRef,
    openButtonRef,
    closeButtonRef,
    modalProps: {
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': modalRef.current ? `${modalRef.current.id}-title` : undefined,
      tabIndex: -1,
    },
    titleProps: {
      id: modalRef.current ? `${modalRef.current.id}-title` : undefined,
    },
  };
}
