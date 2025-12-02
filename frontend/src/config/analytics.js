/**
 * Analytics Configuration
 * 
 * This file contains configuration for all analytics providers.
 * Environment variables should be prefixed with REACT_APP_ANALYTICS_{PROVIDER}_{KEY}
 */

const isProduction = process.env.NODE_ENV === 'production';

const providers = {
  googleAnalytics: {
    enabled: isProduction && !!process.env.REACT_APP_ANALYTICS_GA_MEASUREMENT_ID,
    measurementId: process.env.REACT_APP_ANALYTICS_GA_MEASUREMENT_ID,
    debug: !isProduction,
  },
  mixpanel: {
    enabled: isProduction && !!process.env.REACT_APP_ANALYTICS_MIXPANEL_TOKEN,
    token: process.env.REACT_APP_ANALYTICS_MIXPANEL_TOKEN,
    debug: !isProduction,
  },
  // Add more providers as needed
};

/**
 * List of events that will be tracked
 * Format: EVENT_NAME: { category: string, action: string, label?: string, value?: number }
 */
const events = {
  PAGE_VIEW: { category: 'Navigation', action: 'Page View' },
  USER_SIGNUP: { category: 'User', action: 'Sign Up' },
  USER_LOGIN: { category: 'User', action: 'Login' },
  USER_LOGOUT: { category: 'User', action: 'Logout' },
  DATA_UPLOAD: { category: 'Data', action: 'Upload' },
  DATA_DOWNLOAD: { category: 'Data', action: 'Download' },
  DATA_SHARE: { category: 'Data', action: 'Share' },
  CONSENT_UPDATE: { category: 'Consent', action: 'Update' },
};

/**
 * List of user properties that will be tracked
 */
const userProperties = {
  USER_ID: 'user_id',
  EMAIL: 'email',
  ROLE: 'role',
  PLAN: 'plan',  // e.g., 'free', 'premium', 'enterprise'
  SIGNUP_DATE: 'signup_date',
  LAST_LOGIN: 'last_login',
  DEVICE_TYPE: 'device_type',
  BROWSER: 'browser',
  OS: 'os',
  SCREEN_RESOLUTION: 'screen_resolution',};

export { providers, events, userProperties };
