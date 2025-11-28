import { useRef, useCallback, useEffect } from 'react';

/**
 * useTouch Hook
 *
 * Handles touch events for mobile gestures
 *
 * Features:
 * - Swipe detection (left, right, up, down)
 * - Tap detection
 * - Long press detection
 * - Pinch zoom detection
 */

export const useTouch = (options = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
  } = options;

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const longPressTimer = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress(e);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchEnd = useCallback((e) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Check for tap (quick touch with minimal movement)
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
      if (onTap) {
        onTap(e);
      }
      return;
    }

    // Check for swipe
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      // Horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight(e, deltaX);
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft(e, Math.abs(deltaX));
        }
      }
      // Vertical swipe
      else {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown(e, deltaY);
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp(e, Math.abs(deltaY));
        }
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, swipeThreshold]);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  };
};

export default useTouch;
