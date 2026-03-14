/**
 * useDatasetList — fetches and refreshes the user's registered datasets.
 * Decouples data-loading from page components, making it reusable
 * across UserDashboard and UploadPage.
 */

import { useCallback, useEffect, useReducer } from 'react';

const INITIAL = { datasets: [], loading: false, error: null, lastRefresh: null };

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':  return { ...state, loading: true, error: null };
    case 'SUCCESS':  return { ...state, loading: false, datasets: action.datasets, lastRefresh: Date.now() };
    case 'ERROR':    return { ...state, loading: false, error: action.message };
    default:         return state;
  }
}

/**
 * @param {object} contractService - initialized ContractService instance
 * @param {boolean} [autoLoad=true] - whether to fetch on mount
 */
export function useDatasetList(contractService, autoLoad = true) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const refresh = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const datasets = await contractService.listMyDatasets();
      dispatch({ type: 'SUCCESS', datasets: datasets ?? [] });
    } catch (e) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Failed to load datasets' });
    }
  }, [contractService]);

  useEffect(() => {
    if (autoLoad) refresh();
  }, [autoLoad, refresh]);

  return { ...state, refresh };
}
