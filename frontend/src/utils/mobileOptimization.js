/**
 * Mobile Optimization Utilities
 *
 * Performance optimization utilities for mobile devices
 *
 * Features:
 * - Lazy image loading
 * - Viewport-based rendering
 * - Touch event optimization
 * - Reduced animations on low-end devices
 */

/**
 * Detect if device is low-end based on hardware concurrency
 */
export const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false;

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;

  // Check device memory (if available)
  const memory = navigator.deviceMemory || 4;

  // Consider low-end if <= 2 cores or <= 2GB RAM
  return cores <= 2 || memory <= 2;
};

/**
 * Detect network connection quality
 */
export const getConnectionQuality = () => {
  if (typeof window === 'undefined' || !navigator.connection) {
    return 'unknown';
  }

  const connection = navigator.connection;
  const effectiveType = connection.effectiveType;

  // Map to quality levels
  if (effectiveType === '4g') return 'good';
  if (effectiveType === '3g') return 'medium';
  return 'poor';
};

/**
 * Debounce function for touch events
 */
export const debounce = (func, wait = 100) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for scroll events
 */
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if element is in viewport
 */
export const isInViewport = (element) => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Lazy load images
 */
export const lazyLoadImage = (img) => {
  const src = img.getAttribute('data-src');
  if (!src) return;

  // Use Intersection Observer if available
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
    img.removeAttribute('data-src');
  }
};

/**
 * Disable hover effects on touch devices
 */
export const disableHoverOnTouch = () => {
  if (typeof window === 'undefined') return;

  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  if (isTouchDevice) {
    document.body.classList.add('touch-device');
  }
};

/**
 * Optimize animations for low-end devices
 */
export const getAnimationConfig = () => {
  const lowEnd = isLowEndDevice();

  return {
    duration: lowEnd ? 0.15 : 0.3,
    ease: lowEnd ? 'linear' : 'easeInOut',
    reduce: lowEnd,
  };
};

/**
 * Prevent default touch behaviors (like pull-to-refresh)
 */
export const preventDefaultTouch = (element) => {
  if (!element) return;

  element.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
};

/**
 * Enable momentum scrolling on iOS
 */
export const enableMomentumScrolling = (element) => {
  if (!element) return;
  element.style.webkitOverflowScrolling = 'touch';
};

/**
 * Get safe area insets for notched devices
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
  };
};

/**
 * Detect if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Mobile-optimized virtual scroll helper
 */
export class VirtualScroller {
  constructor(container, itemHeight, bufferSize = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.bufferSize = bufferSize;
    this.scrollTop = 0;
  }

  getVisibleRange(totalItems) {
    const containerHeight = this.container?.clientHeight || 0;
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(
      totalItems,
      Math.ceil((this.scrollTop + containerHeight) / this.itemHeight) + this.bufferSize
    );

    return { startIndex, endIndex };
  }

  updateScrollTop(scrollTop) {
    this.scrollTop = scrollTop;
  }
}

export default {
  isLowEndDevice,
  getConnectionQuality,
  debounce,
  throttle,
  isInViewport,
  lazyLoadImage,
  disableHoverOnTouch,
  getAnimationConfig,
  preventDefaultTouch,
  enableMomentumScrolling,
  getSafeAreaInsets,
  prefersReducedMotion,
  VirtualScroller,
};
