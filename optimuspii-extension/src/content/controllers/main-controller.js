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
    this.api.storage.local.get(['mode', 'regexPatterns', 'customUrls', 'blockFileTypes'])
      .then(result => {
        if (result.mode) {
          this.config.mode = result.mode;
        }

        // Load regex patterns
        if (result.regexPatterns) {
          this.config.regexPatterns = result.regexPatterns;
        }

        // Load blocked file types
        if (result.blockFileTypes) {
          this.config.blockFileTypes = result.blockFileTypes;
        }

        // Check URL monitoring status
        this.checkIfShouldMonitor();
      })
      .catch(error => {
        console.error('Failed to load configuration:', error);
      });

    // Listen for changes to configuration
    this.api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.mode) {
          this.config.mode = changes.mode.newValue;
        }
        if (changes.regexPatterns) {
          this.config.regexPatterns = changes.regexPatterns.newValue;
        }
        if (changes.customUrls) {
          // URL list changed, check if we should still monitor this page
          this.checkIfShouldMonitor();
        }
        if (changes.blockFileTypes) {
          this.config.blockFileTypes = changes.blockFileTypes.newValue;
        }
      }
    });
  }
  
  /**
   * Check if the current URL should be monitored
   */
  checkIfShouldMonitor() {
    this.api.storage.local.get('customUrls')
    .then(result => {
      const customUrls = result.customUrls || [];
      const currentUrl = window.location.href;

      // If there are no custom URLs, assume we should keep monitoring
      if (!customUrls || customUrls.length === 0) {
        this.isMonitoringEnabled = true;
        return;
      }

      // Check if any pattern in customUrls matches the current URL
      this.isMonitoringEnabled = customUrls.some(urlPattern => {
        // Convert URL pattern to regex (handling wildcards)
        const pattern = urlPattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
        const regex = new RegExp('^' + pattern + '$');
        return regex.test(currentUrl);
      });
    })
    .catch(error => {
      console.error('Error checking URL monitoring status:', error);
      this.isMonitoringEnabled = true; // Default to enabled on error
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
}