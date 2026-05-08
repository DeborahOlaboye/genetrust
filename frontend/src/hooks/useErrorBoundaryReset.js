import { useCallback, useState } from 'react';

/**
 * Provides a stable reset key for forcing an ErrorBoundary subtree to remount.
 * Pass `resetKey` to the `key` prop of the ErrorBoundary; call `reset()` to
 * clear the error state by unmounting and remounting the whole subtree.
 *
 * Usage:
 *   const { resetKey, reset } = useErrorBoundaryReset();
 *   <SectionErrorBoundary key={resetKey} onReset={reset}>...</SectionErrorBoundary>
 */
function useErrorBoundaryReset() {
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setResetKey(k => k + 1);
  }, []);

  return { resetKey, reset };
}

export default useErrorBoundaryReset;
