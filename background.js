// Define browser API reference safely
let api = (function () {
  try {
    return browser || chrome;
  } catch (e) {
    return chrome;
  }
})();

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

// Default blocked file extensions
const DEFAULT_FILE_TYPES = [
  '.py',
  '.cpp'
];

// Default URLs
const DEFAULT_URLS = [
  "https://chatgpt.com/*",
  "https://claude.ai/*"
];

function initializeRegexPatterns() {
  api.storage.local.get(['regexPatterns'], function (result) {
    // If no regex patterns exist in storage, initialize with defaults
    if (!result.regexPatterns) {
      api.storage.local.set({
        mode: 'interactive',
        regexPatterns: DEFAULT_REGEX_PATTERNS
      });
    }
  });
}

function initializeCustomUrls() {
  api.storage.local.get(['customUrls'], function (result) {
    // If no custom URLs exist in storage, initialize with defaults
    if (!result.customUrls) {
      api.storage.local.set({
        customUrls: DEFAULT_URLS
      });
    }

    // Register content scripts for all URLs
    registerContentScriptsForUrls(result.customUrls || DEFAULT_URLS);
  });
}

function initializeFileExtensions() {
  api.storage.local.get(['blockFileTypes'], function (result) {
    // If no file types exist in storage, initialize with defaults
    if (!result.blockFileTypes) {
      api.storage.local.set({
        blockFileTypes: DEFAULT_FILE_TYPES
      });
    }
  });
}

async function registerContentScriptsForUrls(urls) {

  try {
    await api.scripting.registerContentScripts([{
      id: "pii-detector",
      matches: urls,
      js: ["content.js"],
      runAt: "document_start",
      allFrames: true
    }]);
  }
  catch (error) {

    if (error.message &&
      (error.message.includes("Duplicate script ID") || error.message.includes("already registered"))) {

      try {
        await api.scripting.updateContentScripts([{
          id: "pii-detector",
          matches: urls,
          runAt: "document_start",
          allFrames: true
        }]);
      }
      catch (updateError) {

        try {
          await api.scripting.unregisterContentScripts({ ids: ["pii-detector"] });
          await api.scripting.registerContentScripts([{
            id: "pii-detector",
            matches: urls,
            js: ["content.js"],
            runAt: "document_start",
            allFrames: true
          }]);
        }
        catch (finalError) {

          if (finalError.message && finalError.message.includes("does not exist")) {
            try {
              await api.scripting.unregisterContentScripts();
              await api.scripting.registerContentScripts([{
                id: "pii-detector",
                matches: urls,
                js: ["content.js"],
                runAt: "document_start",
                allFrames: true
              }]);
            }
            catch (lastError) {
            }
          } else {
          }
        }
      }
    } else {
    }
  }

  try {
    for (const urlPattern of urls) {
      const queryPattern = urlPattern.replace(/^https?:/, "*:");
      const matchingTabs = await api.tabs.query({ url: queryPattern });

      if (matchingTabs.length) {
        for (const tab of matchingTabs) {
          try {
            await api.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              files: ["content.js"]
            });
          } catch (tabError) {
          }
        }
      } else {
      }
    }
  } catch (queryError) {
  }
}

// Initialize everything when the extension loads
function initialize() {
  initializeRegexPatterns();
  initializeCustomUrls();
  initializeFileExtensions();
}

// Run initialization
initialize();

// Listen for changes to custom URLs
api.storage.onChanged.addListener((changes, area) => {
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
  window.OptimusPII.DEFAULT_FILE_TYPES = DEFAULT_FILE_TYPES;
  window.OptimusPII.registerContentScriptsForUrls = registerContentScriptsForUrls;
}