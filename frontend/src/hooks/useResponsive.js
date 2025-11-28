import { useState, useEffect } from 'react';

/**
 * useResponsive Hook
 *
 * Provides responsive breakpoint detection and utilities
 *
 * Features:
 * - Breakpoint detection (mobile, tablet, desktop)
 * - Window size tracking
 * - Orientation detection
 * - Viewport utilities
 */

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
};

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [orientation, setOrientation] = useState(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
      ? 'landscape'
      : 'portrait'
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < BREAKPOINTS.mobile;
  const isTablet = windowSize.width >= BREAKPOINTS.mobile && windowSize.width < BREAKPOINTS.laptop;
  const isLaptop = windowSize.width >= BREAKPOINTS.laptop && windowSize.width < BREAKPOINTS.desktop;
  const isDesktop = windowSize.width >= BREAKPOINTS.desktop;

  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );

  return {
    windowSize,
    orientation,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isTouchDevice,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isLaptop ? 'laptop' : 'desktop',
  };
};

export default useResponsive;
