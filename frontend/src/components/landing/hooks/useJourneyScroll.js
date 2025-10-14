// Custom scroll hook for DNA journey - 60fps performance optimized

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for DNA journey scroll management
 * Provides smooth, high-performance scroll tracking for the DNA tunnel experience
 * 
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element (optional)
 * @param {number} options.smoothness - Scroll smoothing factor (0-1)
 * @param {number} options.sensitivity - Scroll sensitivity multiplier
 * @param {boolean} options.enableMomentum - Enable scroll momentum (disabled per user request)
 * @returns {Object} Scroll data for DNA journey
 */
export const useJourneyScroll = (options = {}) => {
  const {
    container = null,
    smoothness = 0,  // No smoothing - direct tie to scroll position
    sensitivity = 1.0,
    enableMomentum = false // Disabled per user requirement
  } = options;

  const [scrollData, setScrollData] = useState({
    scrollY: 0,
    scrollProgress: 0,
    scrollVelocity: 0,
    scrollDirection: 'down',
    isScrolling: false,
    maxScroll: 0
  });

  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const scrollTimeout = useRef(null);
  const rafRef = useRef(null);
  const targetScrollY = useRef(0);
  const currentScrollY = useRef(0);

  // Calculate scroll metrics
  const calculateScrollData = useCallback((scrollY, maxScroll, timestamp) => {
    const timeDelta = timestamp - lastScrollTime.current;
    const scrollDelta = scrollY - lastScrollY.current;
    
    // Calculate velocity (pixels per millisecond)
    const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;
    
    // Calculate progress (0 to 1)
    const progress = maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;
    
    // Determine direction
    const direction = scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : scrollData.scrollDirection;
    
    lastScrollY.current = scrollY;
    lastScrollTime.current = timestamp;
    
    return {
      scrollY,
      scrollProgress: progress,
      scrollVelocity: velocity * sensitivity,
      scrollDirection: direction,
      isScrolling: Math.abs(velocity) > 0.01,
      maxScroll
    };
  }, [sensitivity, scrollData.scrollDirection]);

  // Smooth animation frame
  const animate = useCallback(() => {
    if (smoothness > 0 && enableMomentum) {
      // Smooth interpolation (if enabled)
      const diff = targetScrollY.current - currentScrollY.current;
      if (Math.abs(diff) > 0.1) {
        currentScrollY.current += diff * smoothness;
        
        const maxScroll = (container?.scrollHeight || document.documentElement.scrollHeight) - window.innerHeight;
        const newData = calculateScrollData(currentScrollY.current, maxScroll, Date.now());
        setScrollData(newData);
        
        rafRef.current = requestAnimationFrame(animate);
      }
    }
  }, [smoothness, enableMomentum, container, calculateScrollData]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const scrollElement = container || window;
    const scrollY = container ? container.scrollTop : window.scrollY;
    const scrollHeight = container ? container.scrollHeight : document.documentElement.scrollHeight;
    const clientHeight = container ? container.clientHeight : window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (smoothness > 0 && enableMomentum) {
      // Use smooth interpolation
      targetScrollY.current = scrollY;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Direct tie to scroll position (user requirement: no lag)
      currentScrollY.current = scrollY;
      const newData = calculateScrollData(scrollY, maxScroll, Date.now());
      setScrollData(newData);
    }

    // Clear scrolling timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Set scrolling to false after delay
    scrollTimeout.current = setTimeout(() => {
      setScrollData(prev => ({ ...prev, isScrolling: false }));
    }, 150);

  }, [container, smoothness, enableMomentum, calculateScrollData, animate]);

  // Throttled scroll handler for performance
  const throttledScrollHandler = useCallback(() => {
    handleScroll();
  }, [handleScroll]);

  // Setup scroll listeners
  useEffect(() => {
    const scrollElement = container || window;
    
    // Use passive listeners for better performance
    const options = { passive: true };
    
    scrollElement.addEventListener('scroll', throttledScrollHandler, options);
    
    // Initial calculation
    handleScroll();
    
    return () => {
      scrollElement.removeEventListener('scroll', throttledScrollHandler);
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [container, throttledScrollHandler, handleScroll]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Recalculate on resize
      setTimeout(handleScroll, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleScroll]);

  return scrollData;
};

/**
 * Hook specifically for DNA journey scroll behaviors
 * Provides calculated values for DNA rotation and camera movement
 * 
 * @param {Object} options - DNA journey specific options
 * @param {number} options.rotationsPerScreen - Number of DNA rotations per screen height
 * @param {number} options.maxVelocityInfluence - Maximum velocity influence on animations
 * @returns {Object} DNA journey scroll data
 */
export const useDNAJourneyScroll = (options = {}) => {
  const {
    rotationsPerScreen = 2.5,
    maxVelocityInfluence = 2.0
  } = options;

  const scrollData = useJourneyScroll({
    smoothness: 0, // Direct tie per user requirement
    sensitivity: 1.0,
    enableMomentum: false
  });

  // Calculate DNA-specific values
  const dnaRotation = scrollData.scrollProgress * rotationsPerScreen * Math.PI * 2;
  const velocityMultiplier = 1 + Math.min(Math.abs(scrollData.scrollVelocity) * 10, maxVelocityInfluence);
  
  return {
    ...scrollData,
    dnaRotation,
    velocityMultiplier,
    // Camera position along DNA tunnel
    cameraY: -scrollData.scrollProgress * 1200, // Total DNA tunnel height
    // Section-based effects
    sectionProgress: (scrollData.scrollProgress % 0.25) * 4, // Progress within current section
    sectionIndex: Math.floor(scrollData.scrollProgress * 4), // Which section (0-3)
  };
};
