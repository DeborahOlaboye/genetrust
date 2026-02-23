/**
 * @file useSessionManager — React hook for wallet session lifecycle management
 * @module hooks/useSessionManager
 *
 * Tracks session validity, expiry countdown, and auto-disconnects when the
 * session expires.  Designed to be used in a top-level layout component so
 * the session is monitored throughout the app lifetime.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { walletService } from '../services/walletService';

// How often to check session validity (ms)
const CHECK_INTERVAL_MS = 30_000;

/**
 * @typedef {Object} SessionState
 * @property {boolean} isSessionValid   - Whether the session has not expired
 * @property {number|null} expiresAt    - Timestamp (ms) when session expires, or null
 * @property {number|null} msRemaining  - Milliseconds until expiry, or null
 * @property {boolean} isExpiringSoon   - True when < 5 minutes remain
 */

/**
 * Hook for managing wallet session lifecycle.
 *
 * @param {Object}   [options]
 * @param {boolean}  [options.autoDisconnect=true]   - Disconnect when session expires
 * @param {number}   [options.warnBeforeMs=300_000]  - Warn N ms before expiry (default 5 min)
 * @param {Function} [options.onExpiry]              - Called when the session expires
 * @param {Function} [options.onExpiringSoon]        - Called when session is about to expire
 *
 * @returns {SessionState & {
 *   refreshSession: () => void,
 *   expireSession:  () => void,
 * }}
 */
const useSessionManager = ({
  autoDisconnect  = true,
  warnBeforeMs    = 5 * 60 * 1000,
  onExpiry,
  onExpiringSoon,
} = {}) => {
  const [isSessionValid,  setIsSessionValid]  = useState(() => walletService.isSessionValid());
  const [expiresAt,       setExpiresAt]       = useState(() => walletService.getSessionExpiry());
  const [msRemaining,     setMsRemaining]     = useState(null);
  const [isExpiringSoon,  setIsExpiringSoon]  = useState(false);

  const warnFiredRef    = useRef(false);
  const expiryFiredRef  = useRef(false);

  // Recompute derived session state
  const recompute = useCallback(() => {
    const expiry = walletService.getSessionExpiry();
    const valid  = walletService.isSessionValid();

    setExpiresAt(expiry);
    setIsSessionValid(valid);

    if (expiry !== null) {
      const remaining = Math.max(0, expiry - Date.now());
      setMsRemaining(remaining);

      const expiring = remaining > 0 && remaining <= warnBeforeMs;
      setIsExpiringSoon(expiring);

      if (expiring && !warnFiredRef.current) {
        warnFiredRef.current = true;
        onExpiringSoon?.();
      }

      if (!valid && !expiryFiredRef.current) {
        expiryFiredRef.current = true;
        onExpiry?.();
        if (autoDisconnect) {
          walletService.disconnect();
        }
      }
    } else {
      setMsRemaining(null);
      setIsExpiringSoon(false);
    }
  }, [autoDisconnect, warnBeforeMs, onExpiry, onExpiringSoon]);

  // Poll for session validity
  useEffect(() => {
    recompute();
    const interval = setInterval(recompute, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [recompute]);

  // Also recompute whenever walletService emits a change
  useEffect(() => {
    const unsubscribe = walletService.addListener(() => {
      warnFiredRef.current   = false;
      expiryFiredRef.current = false;
      recompute();
    });
    return unsubscribe;
  }, [recompute]);

  const refreshSession = useCallback(() => {
    walletService.refreshSession();
    warnFiredRef.current   = false;
    expiryFiredRef.current = false;
    recompute();
  }, [recompute]);

  const expireSession = useCallback(() => {
    walletService.expireSession();
    recompute();
  }, [recompute]);

  return {
    isSessionValid,
    expiresAt,
    msRemaining,
    isExpiringSoon,
    refreshSession,
    expireSession,
  };
};

export default useSessionManager;
