/**
 * OptimusPII Extension Background Script
 * 
 * This module manages the core functionality of the extension including
 * regex patterns, content script injection, and file extension blocking.
 */

class OptimusPIIBackground {
  constructor() {
    // Define browser API reference safely
    this.api = this._getBrowserApi();
    
    // Default patterns and settings
    this.DEFAULT_REGEX_PATTERNS = {
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
    this.DEFAULT_FILE_TYPES = [
      '.py',
      '.cpp'
    ];

    // Default URLs for content script injection
    this.DEFAULT_URLS = [
      "https://chatgpt.com/*",
      "https://claude.ai/*"
    ];
  }

  /**
   * Get the appropriate browser API
   * @returns {Object} Browser API object
   * @private
   */
  _getBrowserApi() {
    try {
      return browser || chrome;
    } catch (e) {
      return chrome;
    }
  }

  /**
   * Initialize extension components
   */
  init() {
    this.initializeRegexPatterns();
    this.initializeCustomUrls();
    this.initializeFileExtensions();
    this.setupEventListeners();
    this.exportFunctions();
  }

  /**
   * Initialize regex patterns in storage
   */
  initializeRegexPatterns() {
    this.api.storage.local.get(['regexPatterns'])
      .then(result => {
        // If no regex patterns exist in storage, initialize with defaults
        if (!result.regexPatterns) {
          this.api.storage.local.set({
            mode: 'interactive',
            regexPatterns: this.DEFAULT_REGEX_PATTERNS
          });
        }
      })
      .catch(error => {
        console.error('Failed to initialize regex patterns:', error);
      });
  }

  /**
   * Initialize custom URLs in storage and register content scripts
   */
  initializeCustomUrls() {
    this.api.storage.local.get(['customUrls'])
      .then(result => {
        // If no custom URLs exist in storage, initialize with defaults
        if (!result.customUrls) {
          this.api.storage.local.set({
            customUrls: this.DEFAULT_URLS
          });
        }

        // Register content scripts for all URLs
        this.registerContentScriptsForUrls(result.customUrls || this.DEFAULT_URLS);
      })
      .catch(error => {
        console.error('Failed to initialize custom URLs:', error);
      });
  }

  /**
   * Initialize file extensions to block
   */
  initializeFileExtensions() {
    this.api.storage.local.get(['blockFileTypes'])
      .then(result => {
        // If no file types exist in storage, initialize with defaults
        if (!result.blockFileTypes) {
          this.api.storage.local.set({
            blockFileTypes: this.DEFAULT_FILE_TYPES
          });
        }
      })
      .catch(error => {
        console.error('Failed to initialize file extensions:', error);
      });
  }

  /**
   * Register content scripts for the provided URLs
   * @param {Array} urls - List of URL patterns
   * @returns {Promise} A promise that resolves when content scripts are registered
   */
  async registerContentScriptsForUrls(urls) {
    if (!urls || urls.length === 0) {
      console.warn('No URLs provided for content script registration');
      return;
    }

    try {
      // First attempt: Register new content scripts
      await this.api.scripting.registerContentScripts([{
        id: "pii-detector",
        matches: urls,
        js: ["content.js"],
        runAt: "document_start",
        allFrames: true
      }]);
      console.log('Content scripts registered successfully');
    }
    catch (error) {
      await this._handleContentScriptRegistrationError(error, urls);
    }

    // Inject scripts into existing tabs that match the patterns
    await this._injectScriptsIntoMatchingTabs(urls);
  }

  /**
   * Handle errors during content script registration
   * @param {Error} error - The registration error
   * @param {Array} urls - List of URL patterns
   * @private
   */
  async _handleContentScriptRegistrationError(error, urls) {
    if (!error.message) {
      console.error('Unknown content script registration error');
      return;
    }

    const isDuplicateError = error.message.includes("Duplicate script ID") || 
                            error.message.includes("already registered");
    
    if (isDuplicateError) {
      try {
        // Try updating existing content scripts
        await this.api.scripting.updateContentScripts([{
          id: "pii-detector",
          matches: urls,
          runAt: "document_start",
          allFrames: true
        }]);
        console.log('Content scripts updated successfully');
      }
      catch (updateError) {
        await this._handleContentScriptUpdateError(urls);
      }
    } else {
      console.error('Content script registration failed:', error.message);
    }
  }

  /**
   * Handle errors during content script update
   * @param {Array} urls - List of URL patterns
   * @private
   */
  async _handleContentScriptUpdateError(urls) {
    try {
      // Try unregistering specific script and re-registering
      await this.api.scripting.unregisterContentScripts({ ids: ["pii-detector"] });
      await this.api.scripting.registerContentScripts([{
        id: "pii-detector",
        matches: urls,
        js: ["content.js"],
        runAt: "document_start",
        allFrames: true
      }]);
      console.log('Content scripts unregistered and re-registered successfully');
    }
    catch (finalError) {
      if (finalError.message && finalError.message.includes("does not exist")) {
        await this._finalContentScriptRegistrationAttempt(urls);
      } else {
        console.error('Final content script registration failed:', finalError.message);
      }
    }
  }

  /**
   * Last attempt at content script registration
   * @param {Array} urls - List of URL patterns
   * @private
   */
  async _finalContentScriptRegistrationAttempt(urls) {
    try {
      // Clear all content scripts and register new ones
      await this.api.scripting.unregisterContentScripts();
      await this.api.scripting.registerContentScripts([{
        id: "pii-detector",
        matches: urls,
        js: ["content.js"],
        runAt: "document_start",
        allFrames: true
      }]);
      console.log('All content scripts cleared and re-registered successfully');
    }
    catch (lastError) {
      console.error('Failed to clear and re-register content scripts:', lastError.message);
    }
  }

  /**
   * Inject content scripts into existing tabs that match URL patterns
   * @param {Array} urls - List of URL patterns
   * @private
   */
  async _injectScriptsIntoMatchingTabs(urls) {
    try {
      for (const urlPattern of urls) {
        const queryPattern = urlPattern.replace(/^https?:/, "*:");
        const matchingTabs = await this.api.tabs.query({ url: queryPattern });

        if (matchingTabs.length) {
          console.log(`Found ${matchingTabs.length} matching tabs for pattern ${queryPattern}`);
          
          for (const tab of matchingTabs) {
            try {
              await this.api.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                files: ["content.js"]
              });
              console.log(`Content script injected into tab ${tab.id}`);
            } catch (tabError) {
              console.error(`Failed to inject script into tab ${tab.id}:`, tabError.message);
            }
          }
        } else {
          console.log(`No matching tabs found for pattern ${queryPattern}`);
        }
      }
    } catch (queryError) {
      console.error('Error querying tabs:', queryError.message);
    }
  }

  /**
   * Setup event listeners for the extension
   */
  setupEventListeners() {
    // Listen for changes to custom URLs
    this.api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.customUrls) {
        console.log('Custom URLs changed, updating content scripts');
        this.registerContentScriptsForUrls(changes.customUrls.newValue);
      }
    });
  }

  /**
   * Export functions for use in other scripts
   */
  exportFunctions() {
    if (typeof window !== 'undefined') {
      // For browser environments
      window.OptimusPII = window.OptimusPII || {};
      window.OptimusPII.initializeRegexPatterns = this.initializeRegexPatterns.bind(this);
      window.OptimusPII.DEFAULT_REGEX_PATTERNS = this.DEFAULT_REGEX_PATTERNS;
      window.OptimusPII.DEFAULT_URLS = this.DEFAULT_URLS;
      window.OptimusPII.DEFAULT_FILE_TYPES = this.DEFAULT_FILE_TYPES;
      window.OptimusPII.registerContentScriptsForUrls = this.registerContentScriptsForUrls.bind(this);
    }
  }
}

// Initialize the extension
const optimusPII = new OptimusPIIBackground();
optimusPII.init();