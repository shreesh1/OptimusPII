// Default regex patterns
const DEFAULT_REGEX_PATTERNS = {
    "Email Address": {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "example@redacted.com"
    },
    "Credit Card Number": {
      pattern: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:(?:5[0678]\d\d|6304|6390|67\d\d)\d{8,15}))([-\s]?[0-9]{4})?/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "4111-1111-1111-1111"
    },
    "Phone Number": {
      pattern: /(?:\+\d{1,3}[\s-]?)?\(?(?:\d{3,4})\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "(555) 555-5555"
    },
    "Social Security Number": {
      pattern: /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d|7[012]))([-\s]?)(?!00)\d\d\3(?!0000)\d{4}\b/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "123-45-6789"
    },
    "Passport Number": {
      pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "A1234567"
    },
    "Aadhaar Number": {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "1234 5678 9012"
    },
    "PAN Card": {
      pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "ABCDE1234F"
    },
    "Password": {
      pattern: /\b(?=\S*[0-9])(?=\S*[a-z])(?=\S*[A-Z])(?=\S*[!@#$%^&*()_\-+={}[\]\\|:;'",.<>/?])\S{8,32}\b/g.source,
      enabled: true,
      isDefault: true,
      sampleData: "P@ssw0rd123!"
    },
  };

// Default URLs
const DEFAULT_URLS = [
  "https://chatgpt.com/*",
  "https://claude.ai/*"
];

function initializeRegexPatterns() {
  browser.storage.local.get(['regexPatterns'], function(result) {
    // If no regex patterns exist in storage, initialize with defaults
    if (!result.regexPatterns) {
      browser.storage.local.set({
        mode: 'interactive',
        regexPatterns: DEFAULT_REGEX_PATTERNS
      });
    }
  });
}

function initializeCustomUrls() {
  browser.storage.local.get(['customUrls'], function(result) {
    // If no custom URLs exist in storage, initialize with defaults
    if (!result.customUrls) {
      browser.storage.local.set({
        customUrls: DEFAULT_URLS
      });
    }
    
    // Register content scripts for all URLs
    registerContentScriptsForUrls(result.customUrls || DEFAULT_URLS);
  });
}

async function registerContentScriptsForUrls(urls) {
  
  try {
    // First attempt to register directly - this works if no script with this ID exists yet
    await browser.scripting.registerContentScripts([{
      id: "pii-detector",
      matches: urls,
      js: ["content.js"],
      runAt: "document_start",
      allFrames: true
    }]);
  } 
  catch (error) {
    // If script already exists, we need to update it
    if (error.message && error.message.includes("already registered")) {
      
      try {
        // First try to update the script directly
        await browser.scripting.updateContentScripts([{
          id: "pii-detector",
          matches: urls
        }]);
      }
      catch (updateError) {
        // If update failed, try unregister and re-register
        
        try {
          await browser.scripting.unregisterContentScripts({ids: ["pii-detector"]});
          await browser.scripting.registerContentScripts([{
            id: "pii-detector",
            matches: urls,
            js: ["content.js"],
            runAt: "document_start",
            allFrames: true
          }]);
        }
        catch (finalError) {
          // If we still have an error, try one more approach - unregister all and register
          if (finalError.message && finalError.message.includes("does not exist")) {
            
            try {
              await browser.scripting.unregisterContentScripts();
              await browser.scripting.registerContentScripts([{
                id: "pii-detector",
                matches: urls,
                js: ["content.js"],
                runAt: "document_start",
                allFrames: true
              }]);
            }
            catch (lastError) {
              console.error('Final attempt to register content scripts failed:', lastError);
            }
          } else {
            console.error('Failed to register content scripts after unregister:', finalError);
          }
        }
      }
    } else {
      console.error('Error registering content scripts:', error);
    }
  }

  // Now inject the script into any already-open matching tabs
  try {
    // For each URL pattern, find matching tabs and execute the script
    for (const urlPattern of urls) {
      // Convert content script match pattern to tabs.query pattern
      // e.g., "https://*.example.com/*" -> "*://*.example.com/*"
      const queryPattern = urlPattern.replace(/^https?:/, "*:");
      
      const matchingTabs = await browser.tabs.query({url: queryPattern});
      
      if (matchingTabs.length) {
        for (const tab of matchingTabs) {
          try {
            await browser.scripting.executeScript({
              target: {tabId: tab.id, allFrames: true},
              files: ["content.js"]
            });
          } catch (tabError) {
          }
        }
      }
    }
  } catch (queryError) {
  }
}

// Initialize everything when the extension loads
function initialize() {
  initializeRegexPatterns();
  initializeCustomUrls();
}

// Run initialization
initialize();

// Listen for changes to custom URLs
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.customUrls) {
    registerContentScriptsForUrls(changes.customUrls.newValue);
  }
});

// Export the function for use in other scripts
if (typeof window !== 'undefined') {
  // For browser environments
  window.OptimusPII = window.OptimusPII || {};
  window.OptimusPII.initializeRegexPatterns = initializeRegexPatterns;
  window.OptimusPII.DEFAULT_REGEX_PATTERNS = DEFAULT_REGEX_PATTERNS;
  window.OptimusPII.DEFAULT_URLS = DEFAULT_URLS;
  window.OptimusPII.registerContentScriptsForUrls = registerContentScriptsForUrls;
}