/**
 * OptimusPII Extension Background Script
 * 
 * This module manages the core functionality of the extension including
 * regex patterns, content script injection, and file extension blocking.
 */

// Import the new services
import { LoggingService } from '../pages/options/services/LoggingService';
import { getPhishingDetection } from './networksecurity/phishingurldetection.js';

class OptimusPIIBackground {
  constructor() {
    // Define browser API reference safely
    this.api = this._getBrowserApi();
    
    // Default patterns and settings
    this.DEFAULT_REGEX_PATTERNS = {
      "email-address": {
        id:"email-address",
        name: "Email Address",
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.source,
        enabled: true,
        isDefault: true,
        sampleData: "example@redacted.com",
        isGlobal: true,
      },
      "credit-card-number": {
        name:"Credit Card Number",
        id:"credit-card-number",
        pattern: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:(?:5[0678]\d\d|6304|6390|67\d\d)\d{8,15}))([-\s]?[0-9]{4})?/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "4111-1111-1111-1111"
      },
      "phone-number": {
        name: "Phone Number",
        id:"phone-number",
        pattern: /(?:\+\d{1,3}[\s-]?)?\(?(?:\d{3,4})\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "(555) 555-5555"
      },
      "social-security-number": {
        id:"social-security-number",
        name:"Social Security Number",
        pattern: /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d|7[012]))([-\s]?)(?!00)\d\d\3(?!0000)\d{4}\b/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "123-45-6789"
      },
      "passport-number": {
        id:"passport-number",
        name:"Passport Number",
        pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "A1234567"
      },
      "aadhaar-number": {
        id:"aadhaar-number",
        name:"Aadhaar Number",
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "1234 5678 9012"
      },
      "pan-card": {
        id:"pan-card",
        name:"PAN Card",
        pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "ABCDE1234F"
      },
      "password": {
        id:"password",
        name:"Password",
        pattern: /\b(?=\S*[0-9])(?=\S*[a-z])(?=\S*[A-Z])(?=\S*[!@#$%^&*()_\-+={}[\]\\|:;'",.<>/?])\S{8,32}\b/g.source,
        enabled: true,
        isDefault: true,
        isGlobal: true,
        sampleData: "P@ssw0rd123!"
      },
    };

    // Default blocked file extensions
    this.DEFAULT_FILE_TYPES = [
      '.py',
      '.cpp'
    ];

    this.DEFAULT_GLOBAL_SETTINGS = {
      phishingUrlDetection: 'block',
      logLevel: 'info'
    }

    // Default URLs for content script injection
    this.DEFAULT_URLS = [
      "https://chatgpt.com/*",
      "https://claude.ai/*"
    ];

    // Define default policies
    this.DEFAULT_POLICIES = {
      "default-paste-policy": {
        policyId: "default-paste-policy",
        policyName: "Default Paste Protection",
        policyType: "pasteProtection",
        enabled: true,
        policyConfig: {
          mode: "interactive",
          enabledPatterns: Object.values(this.DEFAULT_REGEX_PATTERNS)
        }
      },
      "default-file-upload-policy": {
        policyId: "default-file-upload-policy",
        policyName: "Default File Upload Protection",
        policyType: "fileUploadProtection",
        enabled: true,
        policyConfig: {
          mode: "interactive",
          blockedExtensions: [...this.DEFAULT_FILE_TYPES]
        }
      }
    };
    
    // Define default domain mappings
    this.DEFAULT_DOMAIN_MAPPINGS = [
      {
        domainPattern: "*://chatgpt.com/*",
        appliedPolicies: ["default-paste-policy", "default-file-upload-policy"]
      },
      {
        domainPattern: "*://claude.ai/*",
        appliedPolicies: ["default-paste-policy", "default-file-upload-policy"]
      },
      {
        domainPattern: "*://chat.mistral.ai/*",
        appliedPolicies: ["default-paste-policy", "default-file-upload-policy"]
      }
    ];

    this.phishingDetection = getPhishingDetection();
    
    this.initializePolicies();

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
    LoggingService.info('system', 'OptimusPII Extension background script initializing...');
    this.initializeRegexPatterns();
    this.initializeCustomUrls();
    this.initializeFileExtensions();
    this.initializeGlobalSettings();
    this.initializeEventListeners();
    this.exportFunctions();
  }

  initializeEventListeners() {
    this.api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.globalSettings) {
        const newSettings = changes.globalSettings.newValue || {};
        const oldSettings = changes.globalSettings.oldValue || {};
        
        // Update phishing detection settings if they've changed
        if (newSettings.phishingUrlDetection !== oldSettings.phishingUrlDetection) {
          this.phishingDetection.updateConfig({
            mode: newSettings.phishingUrlDetection || 'disabled'
          });
          
          LoggingService.info('system', `Updated phishing detection mode to: ${newSettings.phishingUrlDetection}`);
        }
      }
    });
  }

  initializeGlobalSettings() {
    this.api.storage.local.get(['globalSettings'])
      .then(result => {
        // If no global settings exist in storage, initialize with defaults
        if (!result.globalSettings) {
          this.api.storage.local.set({
            globalSettings: this.DEFAULT_GLOBAL_SETTINGS
          });
        }
      })
      .catch(error => {
        console.error('Failed to initialize global settings:', error);
      });

      chrome.storage.local.get(['globalSettings'], (result) => {
        const settings = result.globalSettings || {};
        
        // Configure phishing detection based on current settings
        this.phishingDetection.updateConfig({
          mode: settings.phishingUrlDetection || 'disabled'
        });
      });
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
          
          for (const tab of matchingTabs) {
            try {
              const output = await this.api.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                files: ["../content.js"]
              });
            } catch (tabError) {
              console.error(`Failed to inject script into tab ${tab.id}:`, tabError.message);
            }
          }
        } else {
        }
      }
    } catch (queryError) {
      console.error('Error querying tabs:', queryError.message);
    }
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

  // Initialize policies and domain mappings if they don't exist
  initializePolicies() {
    chrome.storage.local.get(['policies', 'domainMappings'], (result) => {
      // Only set default values if they don't already exist
      const updates = {};
      
      if (!result.policies) {
        updates.policies = this.DEFAULT_POLICIES;
      }
      
      if (!result.domainMappings) {
        updates.domainMappings = this.DEFAULT_DOMAIN_MAPPINGS;
      }
      
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }

    });
  }

  /**
   * Check if file upload/download should be blocked based on policies
   * @param {Object} details - Details of the file operation
   * @param {string} operationType - Type of operation ('upload' or 'download')
   * @returns {Promise<boolean>} Promise resolving to true if should block
   */
  checkFilePolicy(details, operationType) {
    const url = details.url || details.initiator || '';
    const filename = details.filename || '';
    const fileExt = this.getFileExtension(filename).toLowerCase();
    
    if (!fileExt) return Promise.resolve(false);
    
    return this.getApplicablePolicies(url).then(policies => {
      // Filter for file policies that match the operation type
      const policyType = operationType === 'upload' ? 'fileUploadProtection' : 'fileDownloadProtection';
      const filePolicies = Object.values(policies).filter(policy => 
        policy.policyType === policyType && policy.enabled
      );
      
      // Check if any policy blocks this extension
      return filePolicies.some(policy => 
        policy.policyConfig.blockedExtensions && 
        policy.policyConfig.blockedExtensions.includes(fileExt)
      );
    });
  }

  /**
   * Get applicable policies for a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} Promise resolving to applicable policies
   */
  getApplicablePolicies(url) {
    return Promise.all([
      this.api.storage.local.get('policies'),
      this.api.storage.local.get('domainMappings')
    ]).then(([policiesResult, mappingsResult]) => {
      const policies = policiesResult.policies || {};
      const domainMappings = mappingsResult.domainMappings || [];
      
      // Find matching domain mappings
      const matchingMappings = domainMappings.filter(mapping => 
        this.urlMatchesPattern(url, mapping.domainPattern)
      );
      
      // Get all policy IDs from matching mappings
      const policyIds = new Set();
      matchingMappings.forEach(mapping => {
        mapping.appliedPolicies.forEach(id => policyIds.add(id));
      });
      
      // Filter policies by ID
      const applicablePolicies = {};
      policyIds.forEach(id => {
        if (policies[id]) {
          applicablePolicies[id] = policies[id];
        }
      });
      
      return applicablePolicies;
    });
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Name of the file
   * @returns {string} File extension without the dot
   */
  getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  setupBackgroundNotifications() {
    // Listen for notification requests from content or options pages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'show-notification') {
        
        console.log("Received notification request:", message);

        const { title, message: body, options } = message;
        
        const notification = chrome.notifications.create({
          type: 'basic',
          iconUrl: options.icon || '/assets/icons/icon-48.png',
          title: title,
          message: body,
          priority: options.priority || 0,
          requireInteraction: options.requireInteraction || false
        });
        
        // Send response with notification ID
        sendResponse({ success: true, notificationId: notification });
        return true; // Indicates async response
      }
      return false;
    });
    
    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      // Extract info from notification ID or store notification data
      // Open relevant extension page
      chrome.runtime.openOptionsPage();
      
      // Close the notification
      chrome.notifications.clear(notificationId);
    });
  }
}

// Initialize the extension
const optimusPII = new OptimusPIIBackground();
optimusPII.init();


