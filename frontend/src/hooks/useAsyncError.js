import { useCallback, useState } from 'react';

/**
 * Returns a throw function that surfaces an async error to the nearest React
 * ErrorBoundary. React only catches errors thrown during render; calling
 * throwToErrorBoundary schedules a state update that rethrows the error in the
 * next render cycle so ErrorBoundary.componentDidCatch can handle it.
 *
 * Usage:
 *   const throwToErrorBoundary = useAsyncError();
 *   try { await riskyOp(); } catch (e) { throwToErrorBoundary(e); }
 */
function useAsyncError() {
  const [, setError] = useState(null);

  const throwToErrorBoundary = useCallback((error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return throwToErrorBoundary;
}

export default useAsyncError;
