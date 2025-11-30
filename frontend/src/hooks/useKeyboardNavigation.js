import { useEffect, useCallback } from 'react';

/**
 * Custom hook to handle keyboard navigation for interactive components
 * @param {Object} config - Configuration object
 * @param {Function} config.onSelect - Callback when an item is selected (Enter/Space)
 * @param {Function} config.onClose - Callback when the component should close (Escape)
 * @param {Function} config.onMove - Callback when moving between items (ArrowUp/ArrowDown)
 * @param {Function} config.onHome - Callback when Home key is pressed
 * @param {Function} config.onEnd - Callback when End key is pressed
 * @param {Array} deps - Dependencies for the effect
 */
export function useKeyboardNavigation(
  { onSelect, onClose, onMove, onHome, onEnd } = {},
  deps = []
) {
  const handleKeyDown = useCallback(
    (event) => {
      // Skip if no keyboard handlers are provided
      if (!onSelect && !onClose && !onMove && !onHome && !onEnd) {
        return;
      }

      // Don't handle keyboard events when typing in an input or textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'Enter':
        case ' ':
          if (onSelect) {
            event.preventDefault();
            onSelect(event);
          }
          break;

        case 'Escape':
          if (onClose) {
            event.preventDefault();
            onClose(event);
          }
          break;

        case 'ArrowUp':
          if (onMove) {
            event.preventDefault();
            onMove(-1, event);
          }
          break;

        case 'ArrowDown':
          if (onMove) {
            event.preventDefault();
            onMove(1, event);
          }
          break;

        case 'Home':
          if (onHome) {
            event.preventDefault();
            onHome(event);
          }
          break;

        case 'End':
          if (onEnd) {
            event.preventDefault();
            onEnd(event);
          }
          break;

        default:
          break;
      }
    },
    [onSelect, onClose, onMove, onHome, onEnd]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, ...deps]);

  return { handleKeyDown };
}

/**
 * Hook to manage roving tabIndex for a list of focusable elements
 * @param {Array} items - Array of items to navigate between
 * @param {Object} options - Configuration options
 * @param {Function} options.onSelect - Callback when an item is selected
 * @param {Function} options.onFocus - Callback when an item receives focus
 * @param {number} options.initialIndex - Initial focused index
 */
export function useRovingTabIndex(items = [], { onSelect, onFocus, initialIndex = 0 } = {}) {
  const [focusedIndex, setFocusedIndex] = React.useState(initialIndex);

  const handleKeyDown = useCallback(
    (event) => {
      let newIndex = focusedIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          newIndex = (focusedIndex + 1) % items.length;
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          newIndex = (focusedIndex - 1 + items.length) % items.length;
          break;

        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          event.preventDefault();
          newIndex = items.length - 1;
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onSelect) {
            onSelect(items[focusedIndex], focusedIndex, event);
          }
          return; // Don't update focus for selection

        default:
          return; // Do nothing for other keys
      }

      setFocusedIndex(newIndex);
      
      // Focus the new element
      const selector = `[data-roving-tabindex="${newIndex}"]`;
      const element = document.querySelector(selector);
      if (element) {
        element.focus();
      }
      
      if (onFocus) {
        onFocus(items[newIndex], newIndex, event);
      }
    },
    [focusedIndex, items, onSelect, onFocus]
  );

  // Update tabIndex for all items
  const getTabIndex = (index) => (index === focusedIndex ? 0 : -1);

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex,
    handleKeyDown,
    tabIndexProps: (index) => ({
      tabIndex: getTabIndex(index),
      'data-roving-tabindex': index,
      onKeyDown: handleKeyDown,
      onFocus: () => setFocusedIndex(index),
    }),
  };
}
