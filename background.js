// Default regex patterns
const DEFAULT_REGEX_PATTERNS = {
    "Email Address": {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.source,
      enabled: true,
      isDefault: true
    },
    "Credit Card Number": {
      pattern: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:(?:5[0678]\d\d|6304|6390|67\d\d)\d{8,15}))([-\s]?[0-9]{4})?/g.source,
      enabled: true,
      isDefault: true
    },
    "Phone Number": {
      pattern: /(?:\+\d{1,3}[\s-]?)?\(?(?:\d{1,4})\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g.source,
      enabled: true,
      isDefault: true
    },
    "Social Security Number": {
      pattern: /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d|7[012]))([-\s]?)(?!00)\d\d\3(?!0000)\d{4}\b/g.source,
      enabled: true,
      isDefault: true
    },
    "Passport Number": {
      pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g.source,
      enabled: true,
      isDefault: true
    },
    "Aadhaar Number": {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g.source,
      enabled: true,
      isDefault: true
    },
    "PAN Card": {
      pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g.source,
      enabled: true,
      isDefault: true
    }
  };

  function initializeRegexPatterns() {
    browser.storage.local.get(['regexPatterns'], function(result) {
      // If no regex patterns exist in storage, initialize with defaults
      if (!result.regexPatterns) {
        browser.storage.local.set({
          mode: 'interactive',
          regexPatterns: DEFAULT_REGEX_PATTERNS
        });
        console.log('Default regex patterns initialized in storage');
      }
    });
  }

  initializeRegexPatterns();

  // Export the function for use in other scripts
if (typeof window !== 'undefined') {
    // For browser environments
    window.OptimusPII = window.OptimusPII || {};
    window.OptimusPII.initializeRegexPatterns = initializeRegexPatterns;
    window.OptimusPII.DEFAULT_REGEX_PATTERNS = DEFAULT_REGEX_PATTERNS;
  }