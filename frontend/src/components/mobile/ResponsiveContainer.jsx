import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * ResponsiveContainer Component
 *
 * Adaptive container that adjusts layout based on screen size
 *
 * Features:
 * - Automatic padding adjustments
 * - Breakpoint-specific rendering
 * - Safe area support for notched devices
 */

export const ResponsiveContainer = ({ children, className = '', maxWidth = 'desktop' }) => {
  const { isMobile, isTablet } = useResponsive();

  const maxWidthClasses = {
    mobile: 'max-w-md',
    tablet: 'max-w-3xl',
    laptop: 'max-w-5xl',
    desktop: 'max-w-7xl',
  };

  const padding = isMobile ? 'px-4 py-4' : isTablet ? 'px-6 py-6' : 'px-8 py-8';

  return (
    <div className={`w-full mx-auto ${maxWidthClasses[maxWidth]} ${padding} ${className}`}>
      {children}
    </div>
  );
};

/**
 * MobileOnly Component
 *
 * Renders children only on mobile devices
 */
export const MobileOnly = ({ children }) => {
  const { isMobile } = useResponsive();
  return isMobile ? <>{children}</> : null;
};

/**
 * DesktopOnly Component
 *
 * Renders children only on desktop devices
 */
export const DesktopOnly = ({ children }) => {
  const { isMobile, isTablet } = useResponsive();
  return !isMobile && !isTablet ? <>{children}</> : null;
};

/**
 * Responsive Component
 *
 * Renders different content based on breakpoint
 */
export const Responsive = ({ mobile, tablet, desktop }) => {
  const { isMobile, isTablet } = useResponsive();

  if (isMobile && mobile) return <>{mobile}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  if (desktop) return <>{desktop}</>;

  return null;
};

export default ResponsiveContainer;
