import { lazy } from 'react';

/**
 * Wrapper around React.lazy with retry functionality
 * @param {Function} importFn - The dynamic import function for the component
 * @param {number} retries - Number of retry attempts
 * @param {number} interval - Time between retries in ms
 */
export const lazyWithRetry = (importFn, retries = 3, interval = 1000) => {
  return lazy(async () => {
    const retry = async (attempt = 1) => {
      try {
        return await importFn();
      } catch (error) {
        if (attempt > retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval * attempt));
        return retry(attempt + 1);
      }
    };
    return retry();
  });
};

export default lazyWithRetry;
