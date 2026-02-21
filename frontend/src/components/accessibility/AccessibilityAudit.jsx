// Accessibility audit component for development
// Provides real-time accessibility feedback and testing

import React, { useState, useEffect } from 'react';
import { auditAccessibility, testKeyboardNavigation, testScreenReaderCompatibility } from '../../utils/a11yTesting';

const AccessibilityAudit = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const [auditResults, setAuditResults] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!enabled) return;

    const runAudit = () => {
      const results = auditAccessibility();
      const keyboardResults = testKeyboardNavigation();
      const screenReaderResults = testScreenReaderCompatibility();
      
      setAuditResults({
        ...results,
        keyboard: keyboardResults,
        screenReader: screenReaderResults
      });
    };

    // Run initial audit
    runAudit();

    // Re-run audit when DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(runAudit, 500); // Debounce
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled || !auditResults) return null;

  const { summary, issues, warnings, recommendations, keyboard, screenReader } = auditResults;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          mb-2 px-4 py-2 rounded-lg font-medium text-white
          ${summary.score >= 90 ? 'bg-green-600' : summary.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'}
          hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
        `}
        aria-label={`Accessibility audit score: ${summary.score}%. Click to ${isVisible ? 'hide' : 'show'} details.`}
      >
        A11y: {summary.score}%
      </button>

      {/* Audit Panel */}
      {isVisible && (
        <div className="w-96 max-h-96 bg-white rounded-lg shadow-xl border overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Accessibility Audit</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close accessibility audit panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Score */}
            <div className="mt-2">
              <div className={`text-2xl font-bold ${getScoreColor(summary.score)}`}>
                {summary.score}%
              </div>
              <div className="text-sm text-gray-600">
                {summary.errors} errors, {summary.warnings} warnings, {summary.passed} passed
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {['overview', 'issues', 'keyboard', 'screen-reader'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium capitalize
                  ${activeTab === tab 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold text-red-500">{summary.errors}</div>
                    <div className="text-xs text-gray-600">Errors</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-yellow-500">{summary.warnings}</div>
                    <div className="text-xs text-gray-600">Warnings</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-500">{summary.passed}</div>
                    <div className="text-xs text-gray-600">Passed</div>
                  </div>
                </div>
                
                {recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Top Recommendations</h4>
                    <div className="space-y-2">
                      {recommendations.slice(0, 3).map((rec, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium text-gray-800">{rec.title}</div>
                          <div className="text-gray-600">{rec.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="space-y-2">
                {[...issues, ...warnings].map((issue, index) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-3">
                    <div className={`font-medium ${getSeverityColor(issue.severity)}`}>
                      {issue.type.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">{issue.message}</div>
                    {issue.wcag && (
                      <div className="text-xs text-gray-500">WCAG {issue.wcag}</div>
                    )}
                  </div>
                ))}
                {issues.length === 0 && warnings.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No issues found! 🎉
                  </div>
                )}
              </div>
            )}

            {activeTab === 'keyboard' && (
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">Focusable Elements</div>
                  <div className="text-sm text-gray-600">{keyboard.totalFocusable} elements</div>
                </div>
                
                {keyboard.issues.length > 0 && (
                  <div>
                    <div className="font-medium text-gray-900 mb-2">Issues</div>
                    <div className="space-y-1">
                      {keyboard.issues.map((issue, index) => (
                        <div key={index} className="text-sm text-red-600">
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Press Tab to test keyboard navigation
                </div>
              </div>
            )}

            {activeTab === 'screen-reader' && (
              <div className="space-y-3">
                {screenReader.issues.length > 0 && (
                  <div>
                    <div className="font-medium text-red-600 mb-2">Issues</div>
                    <div className="space-y-1">
                      {screenReader.issues.map((issue, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{issue.type}</div>
                          <div className="text-gray-600">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {screenReader.warnings.length > 0 && (
                  <div>
                    <div className="font-medium text-yellow-600 mb-2">Warnings</div>
                    <div className="space-y-1">
                      {screenReader.warnings.map((warning, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{warning.type}</div>
                          <div className="text-gray-600">{warning.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {screenReader.passed.length > 0 && (
                  <div>
                    <div className="font-medium text-green-600 mb-2">Passed</div>
                    <div className="space-y-1">
                      {screenReader.passed.map((pass, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          {pass.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityAudit;