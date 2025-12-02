# Analytics Integration

This directory contains the analytics implementation for the application, including tracking, error monitoring, and user behavior analysis.

## Features

- **Multi-provider Support**: Supports multiple analytics providers (Google Analytics, Mixpanel) with a unified API
- **Consent Management**: Built-in support for GDPR/CCPA compliance with granular consent controls
- **Automatic Tracking**: Automatic page view tracking and error monitoring
- **Performance Monitoring**: Track application performance metrics
- **User Identification**: Associate events with specific users
- **Custom Events**: Track custom events with flexible properties

## Getting Started

### Prerequisites

- Node.js 14+
- React 16.8+

### Installation

1. Install the required dependencies:

```bash
# If using Google Analytics
npm install react-ga

# If using Mixpanel
npm install mixpanel-browser
```

2. Set up your environment variables in `.env`:

```env
# Google Analytics
REACT_APP_ANALYTICS_GA_MEASUREMENT_ID=YOUR_GA_MEASUREMENT_ID

# Mixpanel
REACT_APP_ANALYTICS_MIXPANEL_TOKEN=YOUR_MIXPANEL_TOKEN
```

## Usage

### Basic Setup

Wrap your application with the `AnalyticsProvider` in your root component:

```jsx
import React from 'react';
import { AnalyticsProvider } from './services/analytics';
import App from './App';

function Root() {
  return (
    <AnalyticsProvider>
      <App />
    </AnalyticsProvider>
  );
}

export default Root;
```

### Using the useAnalytics Hook

```jsx
import React, { useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

function MyComponent() {
  const { 
    trackEvent, 
    trackPageView, 
    identifyUser, 
    isAnalyticsEnabled,
    updateConsent 
  } = useAnalytics();

  // Track page views
  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  const handleButtonClick = () => {
    // Track a custom event
    trackEvent('button_clicked', {
      button_id: 'primary_button',
      section: 'hero'
    });
  };

  const handleUserLogin = (user) => {
    // Identify the user
    identifyUser(user.id, {
      email: user.email,
      name: user.name,
      role: user.role
    });
  };

  const handleConsentChange = (consent) => {
    // Update consent preferences
    updateConsent({
      analytics: consent,
      marketing: consent
    });
  };

  return (
    <div>
      <button onClick={handleButtonClick}>Click Me</button>
      <div>
        Analytics {isAnalyticsEnabled() ? 'Enabled' : 'Disabled'}
        <button onClick={() => handleConsentChange(!isAnalyticsEnabled())}>
          {isAnalyticsEnabled() ? 'Disable Analytics' : 'Enable Analytics'}
        </button>
      </div>
    </div>
  );
}

export default MyComponent;
```

## API Reference

### useAnalytics()

A React hook that provides access to analytics functionality.

#### Returns

| Method | Parameters | Description |
|--------|------------|-------------|
| `trackEvent` | `(eventName: string, properties?: object)` | Track a custom event |
| `trackPageView` | `(path?: string, title?: string, properties?: object)` | Track a page view |
| `trackError` | `(error: Error, context?: object)` | Track an error |
| `trackMetric` | `(name: string, value: number, properties?: object, category?: string)` | Track a performance metric |
| `identifyUser` | `(userId: string, traits?: object)` | Identify a user |
| `isAnalyticsEnabled` | `() => boolean` | Check if analytics is enabled |
| `updateConsent` | `(updates: object) => void` | Update consent preferences |
| `getConsent` | `() => object` | Get current consent preferences |

## Consent Management

The analytics implementation includes built-in support for GDPR/CCPA compliance. By default, analytics tracking is disabled until the user provides consent.

### Consent Categories

- `NECESSARY`: Essential cookies required for the website to function
- `PREFERENCES`: Cookies that remember your preferences
- `ANALYTICS`: Cookies that help us understand how visitors interact with the website
- `MARKETING`: Cookies used to track visitors across websites

### Managing Consent

```jsx
import { useAnalytics, ConsentCategories } from './hooks/useAnalytics';

function ConsentBanner() {
  const { updateConsent, getConsent } = useAnalytics();
  
  const handleAcceptAll = () => {
    updateConsent({
      [ConsentCategories.NECESSARY]: true,
      [ConsentCategories.PREFERENCES]: true,
      [ConsentCategories.ANALYTICS]: true,
      [ConsentCategories.MARKETING]: true
    });
  };
  
  const handleRejectAll = () => {
    updateConsent({
      [ConsentCategories.NECESSARY]: true, // Necessary cookies cannot be rejected
      [ConsentCategories.PREFERENCES]: false,
      [ConsentCategories.ANALYTICS]: false,
      [ConsentCategories.MARKETING]: false
    });
  };
  
  const handleCustomize = (preferences) => {
    updateConsent(preferences);
  };
  
  return (
    <div className="consent-banner">
      <p>We use cookies to improve your experience on our site.</p>
      <div className="consent-actions">
        <button onClick={handleAcceptAll}>Accept All</button>
        <button onClick={handleRejectAll}>Reject All</button>
        <button onClick={() => setShowCustomize(true)}>Customize</button>
      </div>
      
      {showCustomize && (
        <div className="consent-customize">
          <label>
            <input 
              type="checkbox" 
              checked={getConsent()[ConsentCategories.ANALYTICS]}
              onChange={(e) => handleCustomize({ [ConsentCategories.ANALYTICS]: e.target.checked })}
            />
            Analytics
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={getConsent()[ConsentCategories.MARKETING]}
              onChange={(e) => handleCustomize({ [ConsentCategories.MARKETING]: e.target.checked })}
            />
            Marketing
          </label>
          <button onClick={() => setShowCustomize(false)}>Save Preferences</button>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### Event Naming

Use consistent naming conventions for events:
- Use snake_case for event names
- Be descriptive but concise
- Use past tense for completed actions (e.g., `user_signed_up`, `file_uploaded`)
- Group related events with a common prefix (e.g., `auth_login_success`, `auth_login_failure`)

### User Identification

Always identify users after they log in:

```jsx
const { identifyUser } = useAnalytics();

// After successful login
identifyUser(user.id, {
  email: user.email,
  name: user.name,
  role: user.role,
  plan: user.plan
});
```

### Error Tracking

Track errors to monitor application health:

```jsx
const { trackError } = useAnalytics();

try {
  // Your code here
} catch (error) {
  trackError(error, {
    context: 'fetching_user_data',
    userId: currentUser?.id
  });
  
  // Show error to user
  setError('Failed to load data. Please try again.');
}
```

## Troubleshooting

### Analytics Not Working

1. Check your browser's developer console for any errors
2. Verify that the analytics provider is properly initialized
3. Ensure that the user has given consent for analytics tracking
4. Check that the correct environment variables are set

### Debugging

Enable debug mode by setting `debug: true` in the analytics configuration:

```jsx
<AnalyticsProvider config={{ debug: true }}>
  <App />
</AnalyticsProvider>
```

This will log detailed information about analytics events to the console.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
