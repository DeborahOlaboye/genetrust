// Accessible modal component with WCAG 2.1 AA compliance
// Includes focus management, keyboard navigation, and screen reader support

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import FocusTrap from './FocusTrap';
import ScreenReaderOnly from './ScreenReaderOnly';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `modal-description-${Math.random().toString(36).substr(2, 9)}`;

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black bg-opacity-50
        ${overlayClassName}
      `}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <FocusTrap active={isOpen}>
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={descriptionId}
          className={`
            bg-white rounded-lg shadow-xl
            w-full ${sizeClasses[size]}
            max-h-[90vh] overflow-y-auto
            m-4 p-6
            focus:outline-none
            ${className}
          `}
          {...props}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute top-4 right-4
              p-2 rounded-md
              text-gray-400 hover:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors
            "
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Modal header */}
          {title && (
            <div className="mb-4 pr-8">
              <h2
                id={titleId}
                className="text-xl font-semibold text-gray-900"
              >
                {title}
              </h2>
            </div>
          )}

          {/* Modal content */}
          <div id={descriptionId}>
            {children}
          </div>

          {/* Screen reader instructions */}
          <ScreenReaderOnly>
            Press Escape to close this modal. Use Tab to navigate between interactive elements.
          </ScreenReaderOnly>
        </div>
      </FocusTrap>
    </div>
  );

  return createPortal(modalContent, document.body);
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  closeOnOverlayClick: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
};

export default Modal;