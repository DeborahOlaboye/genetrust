import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTouch } from '../../hooks/useTouch';

/**
 * MobileMenu Component
 *
 * Mobile-optimized navigation menu with touch gestures
 *
 * Features:
 * - Slide-in drawer animation
 * - Touch gesture support (swipe to close)
 * - Backdrop blur
 * - Accessibility support
 */

export const MobileMenu = ({ children, isOpen, onClose }) => {
  const touchHandlers = useTouch({
    onSwipeLeft: onClose,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Menu Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-[#14102E] border-l border-[#8B5CF6]/20 shadow-2xl z-50 overflow-y-auto"
            {...touchHandlers}
          >
            {/* Close Button */}
            <div className="flex justify-end p-4 border-b border-[#8B5CF6]/20">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * MobileMenuButton Component
 *
 * Hamburger button to trigger mobile menu
 */
export const MobileMenuButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${className}`}
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6 text-white" />
    </button>
  );
};

export default MobileMenu;
