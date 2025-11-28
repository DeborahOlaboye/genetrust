import React, { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * AppStateContext
 *
 * Global state management for GeneTrust application
 *
 * Features:
 * - Wallet connection state
 * - User data and preferences
 * - Loading states
 * - Notification state
 */

const AppStateContext = createContext(null);

// Initial state
const initialState = {
  wallet: {
    connected: false,
    address: null,
    balance: null,
    network: null,
  },
  user: {
    datasets: [],
    listings: [],
    profile: null,
  },
  ui: {
    loading: false,
    sidebarOpen: false,
    theme: 'dark',
  },
  cache: {
    lastSync: null,
    datasets: {},
    listings: {},
  },
};

// Action types
const ACTIONS = {
  SET_WALLET: 'SET_WALLET',
  DISCONNECT_WALLET: 'DISCONNECT_WALLET',
  SET_USER_DATASETS: 'SET_USER_DATASETS',
  SET_USER_LISTINGS: 'SET_USER_LISTINGS',
  ADD_DATASET: 'ADD_DATASET',
  UPDATE_DATASET: 'UPDATE_DATASET',
  REMOVE_DATASET: 'REMOVE_DATASET',
  ADD_LISTING: 'ADD_LISTING',
  UPDATE_LISTING: 'UPDATE_LISTING',
  REMOVE_LISTING: 'REMOVE_LISTING',
  SET_LOADING: 'SET_LOADING',
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  UPDATE_CACHE: 'UPDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
};

// Reducer function
function appStateReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_WALLET:
      return {
        ...state,
        wallet: {
          ...state.wallet,
          ...action.payload,
          connected: true,
        },
      };

    case ACTIONS.DISCONNECT_WALLET:
      return {
        ...state,
        wallet: initialState.wallet,
      };

    case ACTIONS.SET_USER_DATASETS:
      return {
        ...state,
        user: {
          ...state.user,
          datasets: action.payload,
        },
      };

    case ACTIONS.SET_USER_LISTINGS:
      return {
        ...state,
        user: {
          ...state.user,
          listings: action.payload,
        },
      };

    case ACTIONS.ADD_DATASET:
      return {
        ...state,
        user: {
          ...state.user,
          datasets: [...state.user.datasets, action.payload],
        },
      };

    case ACTIONS.UPDATE_DATASET:
      return {
        ...state,
        user: {
          ...state.user,
          datasets: state.user.datasets.map((dataset) =>
            dataset.id === action.payload.id ? { ...dataset, ...action.payload } : dataset
          ),
        },
      };

    case ACTIONS.REMOVE_DATASET:
      return {
        ...state,
        user: {
          ...state.user,
          datasets: state.user.datasets.filter((dataset) => dataset.id !== action.payload),
        },
      };

    case ACTIONS.ADD_LISTING:
      return {
        ...state,
        user: {
          ...state.user,
          listings: [...state.user.listings, action.payload],
        },
      };

    case ACTIONS.UPDATE_LISTING:
      return {
        ...state,
        user: {
          ...state.user,
          listings: state.user.listings.map((listing) =>
            listing.id === action.payload.id ? { ...listing, ...action.payload } : listing
          ),
        },
      };

    case ACTIONS.REMOVE_LISTING:
      return {
        ...state,
        user: {
          ...state.user,
          listings: state.user.listings.filter((listing) => listing.id !== action.payload),
        },
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };

    case ACTIONS.SET_THEME:
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };

    case ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen,
        },
      };

    case ACTIONS.UPDATE_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          ...action.payload,
          lastSync: Date.now(),
        },
      };

    case ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        cache: initialState.cache,
      };

    default:
      return state;
  }
}

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Wallet actions
  const setWallet = useCallback((walletData) => {
    dispatch({ type: ACTIONS.SET_WALLET, payload: walletData });
  }, []);

  const disconnectWallet = useCallback(() => {
    dispatch({ type: ACTIONS.DISCONNECT_WALLET });
  }, []);

  // User data actions
  const setUserDatasets = useCallback((datasets) => {
    dispatch({ type: ACTIONS.SET_USER_DATASETS, payload: datasets });
  }, []);

  const setUserListings = useCallback((listings) => {
    dispatch({ type: ACTIONS.SET_USER_LISTINGS, payload: listings });
  }, []);

  const addDataset = useCallback((dataset) => {
    dispatch({ type: ACTIONS.ADD_DATASET, payload: dataset });
  }, []);

  const updateDataset = useCallback((dataset) => {
    dispatch({ type: ACTIONS.UPDATE_DATASET, payload: dataset });
  }, []);

  const removeDataset = useCallback((datasetId) => {
    dispatch({ type: ACTIONS.REMOVE_DATASET, payload: datasetId });
  }, []);

  const addListing = useCallback((listing) => {
    dispatch({ type: ACTIONS.ADD_LISTING, payload: listing });
  }, []);

  const updateListing = useCallback((listing) => {
    dispatch({ type: ACTIONS.UPDATE_LISTING, payload: listing });
  }, []);

  const removeListing = useCallback((listingId) => {
    dispatch({ type: ACTIONS.REMOVE_LISTING, payload: listingId });
  }, []);

  // UI actions
  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setTheme = useCallback((theme) => {
    dispatch({ type: ACTIONS.SET_THEME, payload: theme });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_SIDEBAR });
  }, []);

  // Cache actions
  const updateCache = useCallback((cacheData) => {
    dispatch({ type: ACTIONS.UPDATE_CACHE, payload: cacheData });
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_CACHE });
  }, []);

  const value = {
    state,
    actions: {
      setWallet,
      disconnectWallet,
      setUserDatasets,
      setUserListings,
      addDataset,
      updateDataset,
      removeDataset,
      addListing,
      updateListing,
      removeListing,
      setLoading,
      setTheme,
      toggleSidebar,
      updateCache,
      clearCache,
    },
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// Hook to use app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

export default AppStateContext;
