import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * useOptimisticUpdate Hook
 *
 * Handles optimistic UI updates for better UX during async operations
 *
 * Features:
 * - Optimistic state updates
 * - Automatic rollback on error
 * - Loading state management
 * - Success/error notifications
 */

export const useOptimisticUpdate = (options = {}) => {
  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const [isUpdating, setIsUpdating] = useState(false);
  const rollbackRef = useRef(null);

  /**
   * Execute optimistic update
   * @param {Function} updateFn - The async update function to execute
   * @param {Function} optimisticUpdate - Function to apply optimistic state
   * @param {Function} rollback - Function to rollback optimistic state
   * @param {Object} messages - Success/error messages
   */
  const executeOptimisticUpdate = useCallback(async (
    updateFn,
    optimisticUpdate,
    rollback,
    messages = {}
  ) => {
    const {
      success = 'Update successful',
      error: errorMessage = 'Update failed',
      pending = 'Updating...',
    } = messages;

    // Store rollback function
    rollbackRef.current = rollback;

    // Apply optimistic update immediately
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    setIsUpdating(true);

    // Show pending toast
    const toastId = toast.loading(pending);

    try {
      // Execute actual update
      const result = await updateFn();

      // Success
      setIsUpdating(false);
      toast.dismiss(toastId);

      if (showSuccessToast) {
        toast.success(success);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      rollbackRef.current = null;
      return { success: true, data: result };
    } catch (error) {
      // Rollback optimistic update
      if (rollback) {
        rollback();
      }

      setIsUpdating(false);
      toast.dismiss(toastId);

      if (showErrorToast) {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(error);
      }

      rollbackRef.current = null;
      return { success: false, error };
    }
  }, [onSuccess, onError, showSuccessToast, showErrorToast]);

  /**
   * Execute optimistic update with state
   * Simplified version that works with useState
   */
  const optimisticUpdate = useCallback(async (
    updateFn,
    currentState,
    optimisticState,
    setState,
    messages = {}
  ) => {
    return executeOptimisticUpdate(
      updateFn,
      () => setState(optimisticState),
      () => setState(currentState),
      messages
    );
  }, [executeOptimisticUpdate]);

  /**
   * Execute optimistic array update (add, remove, update)
   */
  const optimisticArrayUpdate = useCallback(async (
    updateFn,
    currentArray,
    setArray,
    operation, // 'add', 'remove', 'update'
    item,
    messages = {}
  ) => {
    let optimisticArray;
    const rollbackArray = [...currentArray];

    switch (operation) {
      case 'add':
        optimisticArray = [...currentArray, item];
        break;
      case 'remove':
        optimisticArray = currentArray.filter((i) => i.id !== item.id);
        break;
      case 'update':
        optimisticArray = currentArray.map((i) => (i.id === item.id ? { ...i, ...item } : i));
        break;
      default:
        optimisticArray = currentArray;
    }

    return executeOptimisticUpdate(
      updateFn,
      () => setArray(optimisticArray),
      () => setArray(rollbackArray),
      messages
    );
  }, [executeOptimisticUpdate]);

  return {
    isUpdating,
    executeOptimisticUpdate,
    optimisticUpdate,
    optimisticArrayUpdate,
  };
};

export default useOptimisticUpdate;
