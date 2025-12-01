import React, { useEffect } from 'react';
import { setSecurityMetaTags } from './securityUtils';

/**
 * SecurityProvider component that applies security-related configurations
 * to the application. This should be placed at the root of the app.
 */
const SecurityProvider = ({ children }) => {
  useEffect(() => {
    // Apply security meta tags when component mounts
    setSecurityMetaTags();
    
    // Disable context menu to prevent right-click inspection
    // Note: This is a basic protection and can be bypassed
    const handleContextMenu = (e) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
      }
    };
    
    // Add event listeners for security
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
  
  // Add security-related event handlers
  const handleClick = (e) => {
    // Add any click-based security validations here
    // For example, verify that links are to trusted domains
    if (e.target.tagName === 'A' && e.target.href) {
      if (!isValidUrl(e.target.href)) {
        e.preventDefault();
        console.warn('Blocked navigation to untrusted domain');
      }
    }
  };
  
  return (
    <div 
      onClick={handleClick}
      onAuxClick={handleClick} // Handle middle-click events
    >
      {children}
    </div>
  );
};

export default SecurityProvider;
