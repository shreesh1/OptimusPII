/**
 * Main controller for OptimusPII content functionality
 */

import { getBrowserApi } from '../utils/browser.js';
import { handlePaste } from '../handlers/paste-handler.js';
import { handleFileUpload, addFileInputListeners } from '../handlers/file-handler.js';
import { setupDOMObserver } from '../utils/dom.js';
import { addListenersToElement } from '../utils/dom.js';
import { showNotification } from '../components/notifications.js';
import { checkForBlockedFileTypes } from '../services/file-scanner.js';

/**
 * Main PII Detection and Prevention Controller
 */
export class OptimusPIIContentController {
  constructor() {
    // WeakMap to track explicitly allowed file uploads
    this.allowedFileUploads = new WeakMap();
    
    // Define browser API reference safely
    this.api = getBrowserApi();
    
    // Default configuration
    this.config = {
      mode: "interactive",
      regexPatterns: {}, // Will contain both default and custom patterns
      blockFileTypes: [] // Default blocked file extensions
    };
    
    // Flag to track if monitoring should be active for current URL
    this.isMonitoringEnabled = true;
    
    // Store pending paste event for interactive mode
    this.pendingPasteEvent = null;
    this.popupDismissTimeout = null;

    // Color palette for highlighting different types of sensitive data
    this.colorPalette = [
      { bg: '#FFF3F3', color: '#E53935' },  // Red (Credit Card)
      { bg: '#E8F4FD', color: '#1976D2' },  // Blue (Phone)
      { bg: '#F5F0FC', color: '#7B1FA2' },  // Purple (SSN)
      { bg: '#FFFDE7', color: '#F57F17' },  // Amber (Email)
      { bg: '#F1F8E9', color: '#558B2F' },  // Light Green
      { bg: '#E0F2F1', color: '#00796B' },  // Teal
      { bg: '#FFF8E1', color: '#FF8F00' },  // Orange
      { bg: '#FBE9E7', color: '#D84315' }   // Deep Orange
    ];

    // DOM Observer
    this.observer = null;

    // Store applicable policies for current domain
    this.activePolicies = {
      pasteProtection: null,
      fileUploadProtection: null,
      fileDownloadProtection: null
    };
    
    // Load configuration for current domain
    this.loadConfiguration();
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener(this.handleStorageChanges.bind(this));
  }
  
  /**
   * Initialize the controller
   */
  init() {
    this.loadConfiguration();
    this.setupEventListeners();
    this.monitorDOMChanges();
  }
  
  /**
   * Load configuration from storage
   */
  loadConfiguration() {
    const currentUrl = window.location.href;
    
    chrome.storage.local.get(['policies', 'domainMappings', 'regexPatterns'], (result) => {
      
      console.log('Loaded configuration:', result);
      
      // Reset active policies
      this.activePolicies = {
        pasteProtection: null,
        fileUploadProtection: null,
        fileDownloadProtection: null
      };
      
      // Find applicable domain mappings
      const mappings = result.domainMappings || [];
      const applicableMappings = mappings.filter(mapping => {
        return this.urlMatchesPattern(currentUrl, mapping.domainPattern);
      });

      console.log(applicableMappings);
      
      // Get all policy IDs that apply to this domain
      const policyIds = applicableMappings.reduce((ids, mapping) => {
        return [...ids, ...mapping.appliedPolicies];
      }, []);
      
      // Load the policies
      const policies = result.policies || {};
      
      // Assign active policies by type
      policyIds.forEach(id => {
        const policy = policies[id];
        if (policy && policy.enabled) {
          this.activePolicies[policy.policyType] = policy;
        }
      });
      
      // Store regex patterns for use in detection
      this.regexPatterns = result.regexPatterns || {};
      
      console.log('Loaded policies for domain:', this.activePolicies);
    });
  }
  
  /**
   * Check if the current URL should be monitored
   */
  checkIfShouldMonitor() {
    // Get domain mappings instead of customUrls
    this.api.storage.local.get('domainMappings')
    .then(result => {
      const domainMappings = result.domainMappings || [];
      const currentUrl = window.location.href;

      // If there are no domain mappings, assume we should not monitor
      if (!domainMappings || domainMappings.length === 0) {
        this.isMonitoringEnabled = false;
        return;
      }

      // Check if any domain mapping pattern matches the current URL
      this.isMonitoringEnabled = domainMappings.some(mapping => {
        return this.urlMatchesPattern(currentUrl, mapping.domainPattern);
      });
      
      console.log(`Monitoring ${currentUrl}: ${this.isMonitoringEnabled}`);
    })
    .catch(error => {
      console.error('Error checking URL monitoring status:', error);
      this.isMonitoringEnabled = false; // Default to disabled on error
    });
  }
  
  /**
   * Setup main event listeners
   */
  setupEventListeners() {
    // Add global paste event listener
    document.addEventListener('paste', event => handlePaste(event, this), true);
    
    // Add file input listeners
    document.querySelectorAll('input[type="file"]').forEach(
      element => addFileInputListeners(element, this)
    );
    
    // Add listeners when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('input, textarea, [contenteditable="true"]')
        .forEach(element => addListenersToElement(element, this));
        
      document.querySelectorAll('input[type="file"]')
        .forEach(element => addFileInputListeners(element, this));
    });
  }
  
  /**
   * Set up mutation observer to monitor DOM changes
   */
  monitorDOMChanges() {
    setupDOMObserver(this);
  }

  // Update policies when storage changes
  handleStorageChanges(changes, areaName) {
    if (areaName !== 'local') return;
    
    const needsReload = changes.policies || changes.domainMappings || changes.regexPatterns;
    
    if (needsReload) {
      console.log('Configuration changed, reloading policies...');
      this.loadConfiguration();
    }
  }
  
  // Helper method to check if a URL matches a pattern
  urlMatchesPattern(url, pattern) {
    console.log(url, pattern);
    try {
      // Convert the domain pattern to a regex
      const escapedPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
        .replace(/\*/g, '.*'); // Convert * to .*
        
      const regex = new RegExp('^' + escapedPattern + '$');
      return regex.test(url);
    } catch (e) {
      console.error('Invalid pattern:', pattern, e);
      return false;
    }
  }
}