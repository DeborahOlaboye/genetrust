// Accessibility testing utilities
// Automated checks for WCAG 2.1 AA compliance

import { checkContrastCompliance, getFocusableElements, validateFormAccessibility } from './accessibility';

/**
 * Comprehensive accessibility audit for a page or component
 * @param {Element} container - Container element to audit
 * @returns {Object} Audit results with issues and recommendations
 */
export function auditAccessibility(container = document.body) {
  const issues = [];
  const warnings = [];
  const passed = [];

  // Check for missing alt text on images
  const images = container.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.alt && !img.hasAttribute('aria-label') && !img.hasAttribute('aria-labelledby')) {
      if (img.hasAttribute('role') && img.getAttribute('role') === 'presentation') {
        passed.push({
          type: 'image-alt',
          element: img,
          message: 'Decorative image properly marked with role="presentation"'
        });
      } else {
        issues.push({
          type: 'missing-alt-text',
          element: img,
          message: `Image ${index + 1} missing alt text`,
          severity: 'error',
          wcag: '1.1.1'
        });
      }
    } else {
      passed.push({
        type: 'image-alt',
        element: img,
        message: 'Image has appropriate alt text'
      });
    }
  });

  // Check heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    if (index === 0 && level !== 1) {
      warnings.push({
        type: 'heading-hierarchy',
        element: heading,
        message: 'Page should start with h1',
        severity: 'warning',
        wcag: '1.3.1'
      });
    }
    
    if (level > previousLevel + 1) {
      issues.push({
        type: 'heading-hierarchy',
        element: heading,
        message: `Heading level ${level} skips levels (previous was ${previousLevel})`,
        severity: 'error',
        wcag: '1.3.1'
      });
    }
    
    previousLevel = level;
  });

  // Check for proper form labels
  const forms = container.querySelectorAll('form');
  forms.forEach(form => {
    const formValidation = validateFormAccessibility(form);
    issues.push(...formValidation.issues.map(issue => ({
      ...issue,
      severity: 'error',
      wcag: '1.3.1'
    })));
  });

  // Check for keyboard accessibility
  const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [tabindex]');
  interactiveElements.forEach(element => {
    const tabIndex = element.getAttribute('tabindex');
    
    if (tabIndex && parseInt(tabIndex) > 0) {
      warnings.push({
        type: 'positive-tabindex',
        element,
        message: 'Avoid positive tabindex values',
        severity: 'warning',
        wcag: '2.4.3'
      });
    }
    
    // Check for click handlers on non-interactive elements
    if (element.onclick && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      if (!element.hasAttribute('role') || !['button', 'link'].includes(element.getAttribute('role'))) {
        issues.push({
          type: 'interactive-element',
          element,
          message: 'Interactive element should have appropriate role and keyboard support',
          severity: 'error',
          wcag: '2.1.1'
        });
      }
    }
  });

  // Check color contrast (basic check for common patterns)
  const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
  textElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      try {
        const contrast = checkContrastCompliance(color, backgroundColor, 'AA', 'normal');
        if (!contrast.passes) {
          issues.push({
            type: 'color-contrast',
            element,
            message: `Insufficient color contrast: ${contrast.ratio}:1 (minimum: ${contrast.required}:1)`,
            severity: 'error',
            wcag: '1.4.3'
          });
        }
      } catch (e) {
        // Skip if color parsing fails
      }
    }
  });

  // Check for ARIA attributes
  const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
  elementsWithAria.forEach(element => {
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (!labelElement) {
        issues.push({
          type: 'broken-aria-reference',
          element,
          message: `aria-labelledby references non-existent element: ${ariaLabelledBy}`,
          severity: 'error',
          wcag: '1.3.1'
        });
      }
    }
    
    if (ariaDescribedBy) {
      const descriptionElement = document.getElementById(ariaDescribedBy);
      if (!descriptionElement) {
        issues.push({
          type: 'broken-aria-reference',
          element,
          message: `aria-describedby references non-existent element: ${ariaDescribedBy}`,
          severity: 'error',
          wcag: '1.3.1'
        });
      }
    }
  });

  // Check for focus indicators
  const focusableElements = getFocusableElements(container);
  focusableElements.forEach(element => {
    const styles = window.getComputedStyle(element, ':focus');
    const outline = styles.outline;
    const boxShadow = styles.boxShadow;
    
    if (outline === 'none' && boxShadow === 'none') {
      warnings.push({
        type: 'focus-indicator',
        element,
        message: 'Element may lack visible focus indicator',
        severity: 'warning',
        wcag: '2.4.7'
      });
    }
  });

  return {
    summary: {
      total: issues.length + warnings.length + passed.length,
      errors: issues.length,
      warnings: warnings.length,
      passed: passed.length,
      score: Math.round((passed.length / (issues.length + warnings.length + passed.length)) * 100)
    },
    issues,
    warnings,
    passed,
    recommendations: generateRecommendations(issues, warnings)
  };
}

/**
 * Generate accessibility recommendations based on issues
 * @param {Array} issues - Array of accessibility issues
 * @param {Array} warnings - Array of accessibility warnings
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(issues, warnings) {
  const recommendations = [];
  const issueTypes = [...new Set([...issues, ...warnings].map(item => item.type))];

  issueTypes.forEach(type => {
    switch (type) {
      case 'missing-alt-text':
        recommendations.push({
          type,
          priority: 'high',
          title: 'Add Alt Text to Images',
          description: 'All images should have descriptive alt text or be marked as decorative',
          solution: 'Add alt="" for decorative images or descriptive alt text for informative images'
        });
        break;
      
      case 'heading-hierarchy':
        recommendations.push({
          type,
          priority: 'medium',
          title: 'Fix Heading Hierarchy',
          description: 'Headings should follow a logical hierarchy without skipping levels',
          solution: 'Ensure headings progress logically (h1 → h2 → h3) and start with h1'
        });
        break;
      
      case 'color-contrast':
        recommendations.push({
          type,
          priority: 'high',
          title: 'Improve Color Contrast',
          description: 'Text must have sufficient contrast against its background',
          solution: 'Use darker text colors or lighter backgrounds to meet WCAG AA standards (4.5:1 ratio)'
        });
        break;
      
      case 'interactive-element':
        recommendations.push({
          type,
          priority: 'high',
          title: 'Fix Interactive Elements',
          description: 'All interactive elements must be keyboard accessible',
          solution: 'Add proper roles, tabindex, and keyboard event handlers to interactive elements'
        });
        break;
      
      case 'focus-indicator':
        recommendations.push({
          type,
          priority: 'medium',
          title: 'Add Focus Indicators',
          description: 'All focusable elements should have visible focus indicators',
          solution: 'Add CSS focus styles with sufficient contrast and visibility'
        });
        break;
    }
  });

  return recommendations;
}

/**
 * Test keyboard navigation for a container
 * @param {Element} container - Container to test
 * @returns {Object} Keyboard navigation test results
 */
export function testKeyboardNavigation(container = document.body) {
  const focusableElements = getFocusableElements(container);
  const results = {
    totalFocusable: focusableElements.length,
    issues: [],
    tabOrder: []
  };

  focusableElements.forEach((element, index) => {
    const tabIndex = element.tabIndex;
    results.tabOrder.push({
      element,
      tabIndex,
      order: index + 1
    });

    // Check for keyboard event handlers
    const hasKeyHandler = element.onkeydown || element.onkeyup || element.onkeypress;
    const isButton = element.tagName === 'BUTTON' || element.getAttribute('role') === 'button';
    
    if (isButton && !hasKeyHandler) {
      results.issues.push({
        type: 'missing-keyboard-handler',
        element,
        message: 'Button-like element may need keyboard event handlers'
      });
    }
  });

  return results;
}

/**
 * Test screen reader compatibility
 * @param {Element} container - Container to test
 * @returns {Object} Screen reader test results
 */
export function testScreenReaderCompatibility(container = document.body) {
  const results = {
    issues: [],
    warnings: [],
    passed: []
  };

  // Check for proper landmarks
  const landmarks = container.querySelectorAll('main, nav, aside, header, footer, section, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]');
  
  if (landmarks.length === 0) {
    results.issues.push({
      type: 'missing-landmarks',
      message: 'Page should include semantic landmarks (main, nav, header, footer)',
      wcag: '1.3.1'
    });
  }

  // Check for skip links
  const skipLinks = container.querySelectorAll('a[href^="#"]');
  const hasSkipToMain = Array.from(skipLinks).some(link => 
    link.textContent.toLowerCase().includes('skip') && 
    link.textContent.toLowerCase().includes('main')
  );

  if (!hasSkipToMain) {
    results.warnings.push({
      type: 'missing-skip-link',
      message: 'Consider adding a "skip to main content" link for keyboard users',
      wcag: '2.4.1'
    });
  }

  // Check for live regions
  const liveRegions = container.querySelectorAll('[aria-live]');
  results.passed.push({
    type: 'live-regions',
    count: liveRegions.length,
    message: `Found ${liveRegions.length} live regions for dynamic content`
  });

  return results;
}