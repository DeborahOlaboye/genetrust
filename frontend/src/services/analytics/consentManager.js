import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'ConsentManager' });
const CONSENT_KEY = 'analytics_consent';

export const ConsentCategories = {
  NECESSARY: 'necessary',
  PERFORMANCE: 'performance',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  PREFERENCES: 'preferences'
};

export const DefaultConsentState = {
  [ConsentCategories.NECESSARY]: true, // Cannot be disabled
  [ConsentCategories.PERFORMANCE]: false,
  [ConsentCategories.ANALYTICS]: false,
  [ConsentCategories.MARKETING]: false,
  [ConsentCategories.PREFERENCES]: false
};

class ConsentManager {
  constructor() {
    this._callbacks = new Set();
    this._consentState = this._loadConsent();
  }

  /**
   * Get the current consent state
   * @returns {Object} Current consent state
   */
  getConsent() {
    return { ...this._consentState };
  }

  /**
   * Update consent for specific categories
   * @param {Object} updates - Object with category: boolean pairs
   */
  updateConsent(updates) {
    const previousState = { ...this._consentState };
    
    // Apply updates
    Object.entries(updates).forEach(([category, value]) => {
      if (category in this._consentState) {
        // Don't allow disabling necessary cookies
        if (category === ConsentCategories.NECESSARY && value === false) {
          logger.warn('Cannot disable necessary cookies');
          return;
        }
        this._consentState[category] = value;
      }
    });

    // Save to storage if consent changed
    if (JSON.stringify(previousState) !== JSON.stringify(this._consentState)) {
      this._saveConsent();
      this._notifyConsentChange();
    }
  }

  /**
   * Check if consent is given for a specific category
   * @param {string} category - Consent category
   * @returns {boolean} Whether consent is given
   */
  hasConsent(category) {
    return this._consentState[category] === true;
  }

  /**
   * Register a callback for consent changes
   * @param {Function} callback - Function to call when consent changes
   * @returns {Function} Unsubscribe function
   */
  onConsentChange(callback) {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  // Private methods
  _loadConsent() {
    try {
      const savedConsent = localStorage.getItem(CONSENT_KEY);
      if (savedConsent) {
        return { ...DefaultConsentState, ...JSON.parse(savedConsent) };
      }
    } catch (error) {
      logger.error('Failed to load consent', { error });
    }
    return { ...DefaultConsentState };
  }

  _saveConsent() {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(this._consentState));
    } catch (error) {
      logger.error('Failed to save consent', { error });
    }
  }

  _notifyConsentChange() {
    const consentState = this.getConsent();
    this._callbacks.forEach(callback => {
      try {
        callback(consentState);
      } catch (error) {
        logger.error('Error in consent change callback', { error });
      }
    });
  }
}

// Export a singleton instance
export const consentManager = new ConsentManager();

export default consentManager;
