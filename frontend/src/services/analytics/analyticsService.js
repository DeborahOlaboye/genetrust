import { createLogger } from '../../utils/logger';
import { providers, events, userProperties, ConsentCategories } from '../../config/analytics';
import { consentManager } from './consentManager';

const logger = createLogger({ module: 'AnalyticsService' });

/**
 * AnalyticsService - A service for handling analytics tracking
 * Supports multiple analytics providers and respects user consent
 */
class AnalyticsService {
  constructor() {
    this._isInitialized = false;
    this._providers = {};
    this._analyticsQueue = [];
    this._isDevelopment = process.env.NODE_ENV === 'development';
    this._currentUser = null;
    this._pageViewTracked = false;
    
    // Bind methods
    this._handleConsentChange = this._handleConsentChange.bind(this);
    
    // Listen for consent changes
    consentManager.onConsentChange(this._handleConsentChange);
  }

  /**
   * Initialize the analytics service with the given configuration
   * @param {Object} config - Configuration object
   */
  async init(config = {}) {
    if (this._isInitialized) {
      logger.warn('Analytics service already initialized');
      return;
    }

    try {
      // Initialize providers based on configuration and consent
      const consent = consentManager.getConsent();
      
      if (consent[ConsentCategories.ANALYTICS]) {
        if (providers.googleAnalytics.enabled) {
          await this._initGoogleAnalytics();
        }
        
        if (providers.mixpanel.enabled) {
          await this._initMixpanel();
        }
      }

      // Process any queued events
      this._processQueue();
      
      this._isInitialized = true;
      logger.info('Analytics service initialized', {
        providers: Object.keys(this._providers),
        isDevelopment: this._isDevelopment
      });
      
      // Track initial page view if we're in a browser environment
      if (typeof window !== 'undefined') {
        this.trackPageView();
      }
      
    } catch (error) {
      logger.error('Failed to initialize analytics service', { error });
      throw error;
    }
  }

  /**
   * Track a page view
   * @param {string} [path] - The path of the page (defaults to current path)
   * @param {string} [title] - The title of the page (defaults to document.title)
   * @param {Object} [properties] - Additional properties to track with the page view
   */
  trackPageView(path, title, properties = {}) {
    if (!this._isInitialized) {
      this._queueEvent('pageView', { path, title, ...properties });
      return;
    }

    try {
      const pagePath = path || (typeof window !== 'undefined' ? window.location.pathname : '');
      const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');
      
      const eventData = {
        ...events.PAGE_VIEW,
        label: pagePath,
        value: 1,
        ...properties,
        page_path: pagePath,
        page_title: pageTitle,
        timestamp: new Date().toISOString()
      };
      
      // Send to all enabled providers
      this._sendToProviders('track', eventData);
      
      logger.info(`Page view tracked: ${pagePath}`, { title: pageTitle });
      this._pageViewTracked = true;
      
    } catch (error) {
      logger.error('Failed to track page view', { error, path, title });
    }
  }
  
  /**
   * Track an error
   * @param {Error} error - The error to track
   * @param {Object} [context] - Additional context about the error
   * @param {string} [level=error] - Severity level (error, warning, info, debug)
   */
  trackError(error, context = {}, level = 'error') {
    const errorData = this._formatError(error, context);
    
    if (!this._isInitialized) {
      this._queueEvent('error', { ...errorData, level });
      return;
    }

    try {
      // Log the error with the appropriate level
      if (level === 'warning') {
        logger.warn('Error tracked', errorData);
      } else if (level === 'info') {
        logger.info('Error tracked', errorData);
      } else if (level === 'debug') {
        logger.debug('Error tracked', errorData);
      } else {
        logger.error('Error tracked', errorData);
      }
      
      // Send to error tracking providers
      this._sendToProviders('trackError', { ...errorData, level });
      
    } catch (err) {
      logger.error('Failed to track error', { error: err, originalError: error });
    }
  }

  /**
   * Track a performance metric
   * @param {string} name - Name of the metric (e.g., 'page_load', 'api_call')
   * @param {number} value - Value of the metric (e.g., duration in milliseconds)
   * @param {Object} [properties] - Additional properties for the metric
   * @param {string} [category=performance] - Category of the metric
   */
  trackMetric(name, value, properties = {}, category = 'performance') {
    if (!this._isInitialized) {
      this._queueEvent('metric', { name, value, ...properties, category });
      return;
    }

    try {
      const metricData = {
        name,
        value,
        category,
        timestamp: new Date().toISOString(),
        ...properties
      };
      
      // Send to all enabled providers
      this._sendToProviders('trackMetric', metricData);
      
      logger.info(`Performance metric: ${name} = ${value}`, { category, ...properties });
      
    } catch (error) {
      logger.error('Failed to track metric', { error, metric: name });
    }
  }

  /**
   * Track a custom event
   * @param {string} eventName - Name of the event (should be one of the predefined events)
   * @param {Object} [properties] - Additional properties for the event
   * @param {string} [category] - Override the default category for the event
   * @param {string} [action] - Override the default action for the event
   */
  trackEvent(eventName, properties = {}, category, action) {
    if (!this._isInitialized) {
      this._queueEvent('event', { eventName, properties, category, action });
      return;
    }

    try {
      // Get the event definition or use defaults
      const eventDef = events[eventName] || { category: 'Custom', action: eventName };
      
      const eventData = {
        event: eventName,
        category: category || eventDef.category,
        action: action || eventDef.action,
        label: properties.label || eventDef.label,
        value: properties.value || eventDef.value,
        timestamp: new Date().toISOString(),
        ...properties
      };
      
      // Send to all enabled providers
      this._sendToProviders('track', eventData);
      
      logger.info(`Event tracked: ${eventName}`, eventData);
      
    } catch (error) {
      logger.error('Failed to track event', { error, event: eventName });
    }
  }

  /**
   * Identify a user
   * @param {string} userId - Unique identifier for the user
   * @param {Object} [traits] - User properties (email, name, etc.)
   */
  identifyUser(userId, traits = {}) {
    if (!userId) {
      logger.warn('Cannot identify user: userId is required');
      return;
    }
    
    this._currentUser = { userId, ...traits };
    
    if (!this._isInitialized) {
      this._queueEvent('identify', { userId, traits });
      return;
    }

    try {
      // Prepare user data
      const userData = {
        userId,
        traits: {
          ...traits,
          // Add some default properties if not provided
          [userProperties.LAST_LOGIN]: new Date().toISOString(),
          ...(traits[userProperties.EMAIL] && { email: traits[userProperties.EMAIL] }),
        }
      };
      
      // Add browser/environment info if available
      if (typeof window !== 'undefined') {
        userData.traits = {
          ...userData.traits,
          [userProperties.DEVICE_TYPE]: this._getDeviceType(),
          [userProperties.BROWSER]: this._getBrowserInfo(),
          [userProperties.OS]: this._getOSInfo(),
          [userProperties.SCREEN_RESOLUTION]: `${window.screen.width}x${window.screen.height}`,
        };
      }
      
      // Send to all enabled providers
      this._sendToProviders('identify', userData);
      
      logger.info(`User identified: ${userId}`, { traits: userData.traits });
      
      // Track the identify event
      this.trackEvent('USER_IDENTIFIED', {
        userId,
        ...traits
      });
      
    } catch (error) {
      logger.error('Failed to identify user', { error, userId });
    }
  }

  // Private methods

  /**
   * Initialize Google Analytics
   * @private
   */
  async _initGoogleAnalytics() {
    if (this._providers.ga) return;
    
    try {
      // Load Google Analytics script
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${providers.googleAnalytics.measurementId}`;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() { window.dataLayer.push(arguments); };
      
      window.gtag('js', new Date());
      window.gtag('config', providers.googleAnalytics.measurementId, {
        debug_mode: providers.googleAnalytics.debug,
        // Add any additional configuration here
      });
      
      this._providers.ga = {
        track: (eventData) => {
          window.gtag('event', eventData.action || eventData.event, {
            event_category: eventData.category,
            event_label: eventData.label,
            value: eventData.value,
            ...eventData
          });
        },
        trackMetric: (metricData) => {
          window.gtag('event', 'timing_complete', {
            name: metricData.name,
            value: metricData.value,
            event_category: metricData.category,
            event_label: metricData.label,
            ...metricData
          });
        },
        identify: (userData) => {
          window.gtag('set', 'user_properties', userData.traits);
        },
        trackError: (errorData) => {
          window.gtag('event', 'exception', {
            description: errorData.message,
            fatal: errorData.level === 'error',
            ...errorData.context
          });
        }
      };
      
      logger.info('Google Analytics initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Analytics', { error });
    }
  }
  
  /**
   * Initialize Mixpanel
   * @private
   */
  async _initMixpanel() {
    if (this._providers.mixpanel) return;
    
    try {
      // Load Mixpanel script
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
        script.onload = () => {
          // Initialize Mixpanel
          window.mixpanel.init(providers.mixpanel.token, {
            debug: providers.mixpanel.debug,
            // Add any additional configuration here
          });
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      this._providers.mixpanel = {
        track: (eventData) => {
          window.mixpanel.track(eventData.event || eventData.action, {
            ...eventData,
            category: eventData.category,
            label: eventData.label,
            value: eventData.value
          });
        },
        trackMetric: (metricData) => {
          window.mixpanel.track(metricData.name, {
            ...metricData,
            value: metricData.value,
            category: metricData.category
          });
        },
        identify: (userData) => {
          if (userData.userId) {
            window.mixpanel.identify(userData.userId);
          }
          if (userData.traits) {
            window.mixpanel.people.set(userData.traits);
          }
        },
        trackError: (errorData) => {
          window.mixpanel.track('error_occurred', {
            message: errorData.message,
            stack: errorData.stack,
            level: errorData.level,
            context: errorData.context
          });
        }
      };
      
      logger.info('Mixpanel initialized');
    } catch (error) {
      logger.error('Failed to initialize Mixpanel', { error });
    }
  }

  /**
   * Format an error for consistent error tracking
   * @private
   */
  _formatError(error, context = {}) {
    // Format error for consistent error tracking
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context: {
          ...context
        }
      };
    }
    
    // Handle non-Error objects
    return {
      name: 'NonError',
      message: String(error),
      context: {
        originalError: error,
        ...context
      }
    };
  }
  
  /**
   * Get device type
   * @private
   */
  _getDeviceType() {
    if (typeof window === 'undefined') return 'server';
    
    const userAgent = window.navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  /**
   * Get browser info
   * @private
   */
  _getBrowserInfo() {
    if (typeof window === 'undefined') return 'server';
    
    const userAgent = window.navigator.userAgent;
    let browserName = 'Unknown';
    
    if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
    } else if (userAgent.indexOf('SamsungBrowser') > -1) {
      browserName = 'Samsung Browser';
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
      browserName = 'Opera';
    } else if (userAgent.indexOf('Trident') > -1) {
      browserName = 'Internet Explorer';
    } else if (userAgent.indexOf('Edge') > -1) {
      browserName = 'Edge';
    } else if (userAgent.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
    } else if (userAgent.indexOf('Safari') > -1) {
      browserName = 'Safari';
    }
    
    return browserName;
  }
  
  /**
   * Get OS info
   * @private
   */
  _getOSInfo() {
    if (typeof window === 'undefined') return 'server';
    
    const userAgent = window.navigator.userAgent;
    let os = 'Unknown';
    
    if (userAgent.indexOf('Windows') > -1) {
      os = 'Windows';
    } else if (userAgent.indexOf('Mac') > -1) {
      os = 'MacOS';
    } else if (userAgent.indexOf('X11') > -1) {
      os = 'UNIX';
    } else if (userAgent.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      os = 'Android';
    } else if (/iPhone|iPad|iPod/.test(userAgent)) {
      os = 'iOS';
    }
    
    return os;
  }
  
  /**
   * Queue an event to be processed later
   * @private
   */
  _queueEvent(type, data) {
    this._analyticsQueue.push({ type, data, timestamp: Date.now() });
    
    // Limit queue size to prevent memory issues
    if (this._analyticsQueue.length > 100) {
      this._analyticsQueue.shift();
    }
  }
  
  /**
   * Process queued events
   * @private
   */
  _processQueue() {
    while (this._analyticsQueue.length > 0) {
      const { type, data } = this._analyticsQueue.shift();
      
      try {
        switch (type) {
          case 'error':
            this.trackError(data.error || data, data.context, data.level || 'error');
            break;
          case 'metric':
            this.trackMetric(data.name, data.value, data.properties || data.tags, data.category);
            break;
          case 'event':
            this.trackEvent(data.eventName || data.event, data.properties, data.category, data.action);
            break;
          case 'pageView':
            this.trackPageView(data.path, data.title, data.properties);
            break;
          case 'identify':
            this.identifyUser(data.userId, data.traits || data);
            break;
          default:
            logger.warn(`Unknown event type in queue: ${type}`, data);
        }
      } catch (error) {
        logger.error(`Failed to process queued ${type} event`, { error, eventData: data });
      }
    }
  }
  
  /**
   * Send data to all enabled providers
   * @param {string} method - The method to call on each provider
   * @param {Object} data - The data to send
   * @private
   */
  _sendToProviders(method, data) {
    Object.values(this._providers).forEach(provider => {
      try {
        if (provider && typeof provider[method] === 'function') {
          provider[method](data);
        }
      } catch (error) {
        logger.error(`Error in provider.${method}`, { error, data });
      }
    });
  }
  
  /**
   * Handle consent changes
   * @private
   */
  _handleConsentChange(consent) {
    if (consent[ConsentCategories.ANALYTICS] && !this._isInitialized) {
      this.init();
    } else if (!consent[ConsentCategories.ANALYTICS] && this._isInitialized) {
      this.reset();
    }
  }
  
  /**
   * Reset the analytics service
   * @private
   */
  reset() {
    // Clear any stored data
    this._providers = {};
    this._isInitialized = false;
    this._pageViewTracked = false;
    
    // Note: We keep the current user and queue to avoid losing data
    // if analytics is re-enabled
    
    logger.info('Analytics service reset');
  }
}

// Create and export a singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
