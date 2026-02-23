/**
 * @file SessionBanner — session expiry warning and refresh prompt
 * @module components/SessionBanner
 *
 * Renders a dismissible banner when the wallet session is approaching
 * expiry.  The user can refresh (extend) the session or dismiss the
 * warning.  Once the session has expired the banner turns into an error
 * state prompting reconnection.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWalletContext } from '../contexts/WalletContext';

/** Format milliseconds into a human-readable countdown string. */
const formatCountdown = (ms) => {
  if (ms === null || ms < 0) return 'expired';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * SessionBanner
 *
 * @param {Object}  props
 * @param {boolean} [props.showWhenExpired=true] - Show an error banner after expiry
 * @param {string}  [props.className]
 */
const SessionBanner = ({ showWhenExpired = true, className = '' }) => {
  const {
    isConnected,
    isSessionValid,
    isExpiringSoon,
    msRemaining,
    refreshSession,
    connect,
  } = useWalletContext();

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when session refreshes or reconnects
  useEffect(() => {
    setDismissed(false);
  }, [isSessionValid]);

  if (!isConnected) return null;
  if (!isExpiringSoon && isSessionValid) return null;
  if (dismissed) return null;

  const expired = !isSessionValid;

  const bannerStyle = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            '12px',
    padding:        '10px 18px',
    borderRadius:   '10px',
    fontSize:       '14px',
    fontWeight:     500,
    background:     expired ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
    border:         `1px solid ${expired ? '#dc2626' : '#ca8a04'}`,
    color:          expired ? '#fca5a5' : '#fde047',
  };

  return (
    <div className={className} style={bannerStyle} role="alert" aria-live="polite">
      <span>
        {expired
          ? 'Your wallet session has expired. Please reconnect to continue.'
          : `Session expires in ${formatCountdown(msRemaining)}. Keep working?`}
      </span>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {expired ? (
          showWhenExpired && (
            <button
              type="button"
              onClick={() => connect()}
              style={btnStyle('#dc2626')}
            >
              Reconnect
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => { refreshSession(); setDismissed(true); }}
            style={btnStyle('#ca8a04')}
          >
            Extend Session
          </button>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss session warning"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

const btnStyle = (borderColor) => ({
  padding:      '5px 14px',
  borderRadius: '6px',
  border:       `1px solid ${borderColor}`,
  background:   'transparent',
  color:        'inherit',
  cursor:       'pointer',
  fontSize:     '13px',
  fontWeight:   600,
});

SessionBanner.propTypes = {
  showWhenExpired: PropTypes.bool,
  className:       PropTypes.string,
};

export default SessionBanner;
