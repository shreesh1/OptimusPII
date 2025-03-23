/**
 * OptimusPII Extension Content Script
 * 
 * This module handles real-time detection and prevention of sensitive data transmission.
 * It monitors paste events and file uploads, detecting PII based on configured patterns.
 */

(function() {
  'use strict';

  /**
   * Main PII Detection and Prevention Controller
   */
  class OptimusPIIContentController {
    constructor() {
      // WeakMap to track explicitly allowed file uploads
      this.allowedFileUploads = new WeakMap();
      
      // Define browser API reference safely
      this.api = this.getBrowserApi();
      
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
     * Get browser API reference
     * @returns {Object} Browser API object
     */
    getBrowserApi() {
      try {
        return browser || chrome;
      } catch (e) {
        return chrome;
      }
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
      document.addEventListener('paste', this.handlePaste.bind(this), true);
      
      // Add file input listeners
      document.querySelectorAll('input[type="file"]').forEach(
        element => this.addFileInputListeners(element)
      );
      
      // Add listeners when DOM is loaded
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('input, textarea, [contenteditable="true"]')
          .forEach(element => this.addListenersToElement(element));
          
        document.querySelectorAll('input[type="file"]')
          .forEach(element => this.addFileInputListeners(element));
      });
    }
    
    /**
     * Add event listeners to an element
     * @param {HTMLElement} element - Element to add listeners to
     */
    addListenersToElement(element) {
      element.addEventListener('paste', this.handlePaste.bind(this), true);
    }
    
    /**
     * Add listeners for file inputs
     * @param {HTMLInputElement} element - File input element
     */
    addFileInputListeners(element) {
      if (element.tagName === 'INPUT' && element.type === 'file') {
        // Remove any existing listeners to avoid duplicates
        element.removeEventListener('change', this.handleFileUpload.bind(this), true);
        // Add the listener
        element.addEventListener('change', this.handleFileUpload.bind(this), true);
      }
    }
    
    /**
     * Set up mutation observer to monitor DOM changes
     */
    monitorDOMChanges() {
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const newNode = mutation.addedNodes[i];
              if (newNode.nodeType === 1) { // Element node
                // Monitor inputs and contenteditable elements
                if ((newNode.tagName === 'INPUT' || newNode.tagName === 'TEXTAREA') ||
                    newNode.getAttribute('contenteditable') === 'true') {
                  this.addListenersToElement(newNode);
                }
  
                // Check for file inputs
                if (newNode.tagName === 'INPUT' && newNode.type === 'file') {
                  this.addFileInputListeners(newNode);
                }
  
                // Check children
                newNode.querySelectorAll('input, textarea, [contenteditable="true"]')
                  .forEach(element => this.addListenersToElement(element));
                  
                newNode.querySelectorAll('input[type="file"]')
                  .forEach(element => this.addFileInputListeners(element));
              }
            }
          }
        });
      });

      // Start observing once the DOM is ready
      document.addEventListener('DOMContentLoaded', () => {
        this.observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
    
    /**
     * Handle paste events
     * @param {Event} event - Paste event
     * @returns {boolean} Whether to allow the paste
     */
    handlePaste(event) {
      // If the extension is disabled OR URL monitoring is disabled, do nothing
      if (this.config.mode === "disabled" || !this.isMonitoringEnabled) {
        return true;
      }

      // Get clipboard data as text
      const clipboardData = event.clipboardData || window.clipboardData;
      const pastedText = clipboardData.getData('text');

      // Process the pasted text for sensitive information
      const { hasMatches, matches, patternObjects } = this.detectSensitiveInformation(pastedText);

      // Check if the pasted content contains sensitive data
      if (hasMatches) {
        // Determine the types of PII for notification messages
        const piiTypes = Object.keys(matches).filter(key => matches[key].length > 0);
        const piiMessage = piiTypes.join(", ").replace(/,([^,]*)$/, " and$1");

        // Store sample data for use in the popup
        const patternSamples = {};
        for (const [name, matchedItems] of Object.entries(matches)) {
          patternSamples[name] = this.config.regexPatterns[name].sampleData || "REDACTED";
        }

        // Handle based on mode
        switch (this.config.mode) {
          case "interactive":
            // Prevent default action until user decision
            event.preventDefault();
            event.stopPropagation();

            // Store the event for later use if user allows paste
            this.pendingPasteEvent = {
              targetElement: event.target,
              text: pastedText,
              samples: patternSamples,
              patternMatches: matches  // Store matched patterns and their matches
            };

            // Show interactive popup with highlighted sensitive data
            this.showInteractivePopup(pastedText, patternObjects, patternSamples);
            return false;

          case "block-and-alert":
            event.preventDefault();
            event.stopPropagation();
            this.showNotification(`Paste blocked: ${piiMessage} detected`);
            return false;

          case "alert-only":
            this.showNotification(`Warning: ${piiMessage} detected in paste`);
            return true;

          case "silent-block":
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
      }
      return true;
    }
    
    /**
     * Detect sensitive information in text
     * @param {string} text - Text to analyze
     * @returns {Object} Detection results
     */
    detectSensitiveInformation(text) {
      // Prepare collection for regex patterns and matches
      const patternObjects = {};
      const matches = {};
      let hasMatches = false;

      // Process all enabled regex patterns
      for (const [name, details] of Object.entries(this.config.regexPatterns)) {
        // Skip disabled patterns
        if (!details.enabled) continue;

        try {
          // Create RegExp object from pattern string
          const patternMatch = details.pattern.match(/^\/(.*)\/([gimuy]*)$/);
          if (patternMatch) {
            patternObjects[name] = new RegExp(patternMatch[1], patternMatch[2] + 'g'); // Add 'g' flag if missing
          } else {
            patternObjects[name] = new RegExp(details.pattern, 'g');
          }

          // Find matches
          const foundMatches = text.match(patternObjects[name]) || [];
          if (foundMatches.length > 0) {
            matches[name] = foundMatches;
            hasMatches = true;
          }
        } catch (error) {
          console.error(`Error with regex pattern ${name}:`, error);
        }
      }

      return { hasMatches, matches, patternObjects };
    }
    
    /**
     * Handle file upload events
     * @param {Event} event - File input change event
     * @returns {boolean} Whether to allow the upload
     */
    handleFileUpload(event) {
      // If the extension is disabled OR URL monitoring is disabled, do nothing
      if (this.config.mode === "disabled" || !this.isMonitoringEnabled) {
        return true;
      }

      // Get the file input element
      const fileInput = event.target;
      
      // Check if this is a re-triggered event for an explicitly allowed upload
      if (this.allowedFileUploads.has(fileInput)) {
        // This is our own triggered event after allowing files, let it pass through
        this.allowedFileUploads.delete(fileInput); // Clean up the reference
        return true;
      }
      
      // Check if there are any files selected
      if (fileInput.files && fileInput.files.length > 0) {
        const blockedFiles = this.checkForBlockedFileTypes(fileInput.files);
        
        // If there are blocked files
        if (blockedFiles.length > 0) {
          // Save the original files for alert-only mode
          const originalFiles = Array.from(fileInput.files);
          
          // Handle based on mode
          switch (this.config.mode) {
            case "interactive":
              this.showBlockedFilePopup(fileInput, blockedFiles, originalFiles);
              break;
              
            case "block-and-alert":
              event.preventDefault();
              event.stopPropagation();
              this.showNotification(`Upload blocked: ${blockedFiles.join(", ")} files not allowed`);
              fileInput.value = '';
              break;
              
            case "alert-only":
              this.showNotification(`Warning: Uploading sensitive file types: ${blockedFiles.join(", ")}`);
              // Don't prevent default - let the upload continue
              return true;
              
            case "silent-block":
              event.preventDefault();
              event.stopPropagation();
              fileInput.value = '';
              break;
          }
          
          return false;
        }
      }
      
      return true;
    }
    
    /**
     * Check for blocked file types
     * @param {FileList} files - Files to check
     * @returns {Array} List of blocked file descriptions
     */
    checkForBlockedFileTypes(files) {
      const blockedFiles = [];
      
      // Check each file extension
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        
        // If the file extension is in the blocked list
        if (this.config.blockFileTypes.includes(fileExtension)) {
          blockedFiles.push(`${fileName} (${fileExtension})`);
        }
      }
      
      return blockedFiles;
    }
    
    /**
     * Show a notification to the user
     * @param {string} message - Notification message
     */
    showNotification(message) {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${message.includes('blocked') ? '#ff4d4d' : '#ffad33'};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      `;

      document.body.appendChild(notification);

      // Remove the notification after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 3000);
    }
    
    /**
     * Show interactive popup for sensitive data detection
     * @param {string} text - The pasted text
     * @param {Object} patterns - Regex patterns
     * @param {Object} samples - Sample replacements
     */
    showInteractivePopup(text, patterns = {}, samples = {}) {
      // Remove any existing popup
      const existingPopup = document.getElementById('pii-blocker-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Clear any existing timeout
      if (this.popupDismissTimeout) {
        clearTimeout(this.popupDismissTimeout);
      }

      // Create popup container
      const popup = this.createPopupContainer();
      
      // Determine what types of PII were detected
      const detectedPatterns = Object.keys(patterns).filter(name => {
        return text.match(patterns[name]) !== null;
      });

      // Set appropriate header text
      let headerText = 'Sensitive Information Detected';
      if (detectedPatterns.length === 1) {
        headerText = `${detectedPatterns[0]} Detected`;
      } else {
        headerText = 'Multiple PII Types Detected';
      }

      // Create popup header
      const header = this.createPopupHeader(headerText, popup);
      
      // Create content area with highlighted sensitive data
      const content = this.createPopupContent(text, patterns, detectedPatterns);
      
      // Create action buttons
      const buttonContainer = this.createPopupButtons(popup, text, patterns);
      
      // Assemble popup
      popup.appendChild(header);
      popup.appendChild(content);
      popup.appendChild(buttonContainer);

      // Add popup to body with animation
      document.body.appendChild(popup);
      this.animatePopup(popup);

      // Auto-dismiss after 10 seconds if no action
      this.popupDismissTimeout = setTimeout(() => {
        if (document.body.contains(popup)) {
          popup.style.opacity = '0';
          popup.style.transform = 'translate(-50%, -48%)';

          setTimeout(() => {
            if (document.body.contains(popup)) {
              popup.remove();
              this.pendingPasteEvent = null;
              this.showNotification('Paste blocked (timed out)');
            }
          }, 200);
        }
      }, 10000);
    }
    
    /**
     * Create the popup container
     * @returns {HTMLElement} Popup container
     */
    createPopupContainer() {
      const popup = document.createElement('div');
      popup.id = 'pii-blocker-popup';
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        width: 420px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        border: 1px solid #eaeaea;
      `;
      return popup;
    }
    
    /**
     * Create the popup header
     * @param {string} headerText - Header text
     * @param {HTMLElement} popup - Popup container
     * @returns {HTMLElement} Header element
     */
    createPopupHeader(headerText, popup) {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 16px 20px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #e74c3c;
        border-bottom: 1px solid #f5f5f5;
      `;
      header.textContent = headerText;

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: #909090;
        font-size: 22px;
        cursor: pointer;
        padding: 0;
        margin: 0;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeButton.addEventListener('click', () => {
        popup.remove();
        this.pendingPasteEvent = null;
      });
      header.appendChild(closeButton);
      
      return header;
    }
    
    /**
     * Create popup content area with highlighted text
     * @param {string} text - Text to highlight
     * @param {Object} patterns - Regex patterns
     * @param {Array} detectedPatterns - Names of detected patterns
     * @returns {HTMLElement} Content element
     */
    createPopupContent(text, patterns, detectedPatterns) {
      const content = document.createElement('div');
      content.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: 300px;
        color: #333;
      `;

      // Create message text
      const message = document.createElement('p');
      message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
      message.textContent = `This paste contains ${detectedPatterns.join(", ").replace(/,([^,]*)$/, " and$1")}:`;
      content.appendChild(message);

      // Add highlighted text in a clean container
      const highlightedContent = document.createElement('div');
      highlightedContent.style.cssText = `
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: monospace;
        border: 1px solid #eaeaea;
        padding: 12px;
        background-color: #fafafa;
        border-radius: 4px;
        max-height: 180px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.5;
      `;

      // Get highlighted text with sensitive data marked
      const { fragment } = this.getHighlightedTextElements(text, patterns);
      highlightedContent.appendChild(fragment);
      content.appendChild(highlightedContent);
      
      return content;
    }
    
    /**
     * Create action buttons for the popup
     * @param {HTMLElement} popup - Popup container
     * @param {string} text - Original text
     * @param {Object} patterns - Regex patterns
     * @returns {HTMLElement} Button container
     */
    createPopupButtons(popup) {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        padding: 16px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #f5f5f5;
      `;

      const buttonBaseStyle = `
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s, opacity 0.2s;
      `;

      // Block button
      const blockButton = document.createElement('button');
      blockButton.textContent = 'Block';
      blockButton.style.cssText = `
        ${buttonBaseStyle}
        background-color: white;
        color: #e74c3c;
        border: 1px solid #e74c3c;
      `;
      blockButton.addEventListener('mouseenter', () => {
        blockButton.style.backgroundColor = '#fff5f5';
      });
      blockButton.addEventListener('mouseleave', () => {
        blockButton.style.backgroundColor = 'white';
      });
      blockButton.addEventListener('click', () => {
        popup.remove();
        this.pendingPasteEvent = null;
        this.showNotification('Paste blocked: Sensitive information detected');
      });

      // Paste redacted button
      const pasteSampleButton = document.createElement('button');
      pasteSampleButton.textContent = 'Paste Redacted';
      pasteSampleButton.style.cssText = `
        ${buttonBaseStyle}
        background-color: white;
        color: #2980b9;
        border: 1px solid #2980b9;
      `;
      pasteSampleButton.addEventListener('mouseenter', () => {
        pasteSampleButton.style.backgroundColor = '#f0f7fc';
      });
      pasteSampleButton.addEventListener('mouseleave', () => {
        pasteSampleButton.style.backgroundColor = 'white';
      });
      pasteSampleButton.addEventListener('click', () => {
        popup.remove();

        if (this.pendingPasteEvent && this.pendingPasteEvent.targetElement) {
          const redactedText = this.createRedactedText();
          this.pasteTo(this.pendingPasteEvent.targetElement, redactedText);
        }

        this.pendingPasteEvent = null;
        this.showNotification('Paste completed with redacted values');
      });

      // Allow original paste button
      const allowButton = document.createElement('button');
      allowButton.textContent = 'Paste Original';
      allowButton.style.cssText = `
        ${buttonBaseStyle}
        background-color: #e74c3c;
        color: white;
      `;
      allowButton.addEventListener('mouseenter', () => {
        allowButton.style.opacity = '0.9';
      });
      allowButton.addEventListener('mouseleave', () => {
        allowButton.style.opacity = '1';
      });
      allowButton.addEventListener('click', () => {
        popup.remove();

        if (this.pendingPasteEvent && this.pendingPasteEvent.targetElement) {
          this.pasteTo(
            this.pendingPasteEvent.targetElement, 
            this.pendingPasteEvent.text
          );
        }

        this.pendingPasteEvent = null;
        this.showNotification('Paste allowed');
      });

      buttonContainer.appendChild(blockButton);
      buttonContainer.appendChild(pasteSampleButton);
      buttonContainer.appendChild(allowButton);
      
      return buttonContainer;
    }
    
    /**
     * Get highlighted text elements with sensitive data marked
     * @param {string} text - Text to highlight
     * @param {Object} patterns - Regex patterns
     * @returns {Object} Fragment with highlighted text
     */
    getHighlightedTextElements(text, patterns) {
      // Create an array to store all matches and their replacement info
      const allMatches = [];

      // Collect all matches for each pattern
      let patternIndex = 0;
      for (const [name, regex] of Object.entries(patterns)) {
        const { bg, color } = this.colorPalette[patternIndex % this.colorPalette.length];
        patternIndex++;

        // Reset regex lastIndex
        regex.lastIndex = 0;

        let match;
        while ((match = regex.exec(text)) !== null) {
          const newMatch = {
            start: match.index,
            end: match.index + match[0].length,
            replacement: `<mark style="background-color: ${bg}; color: ${color}; padding: 2px 4px; border-radius: 2px;" title="${name}">${match[0]}</mark>`,
            original: match[0],
            name: name
          };

          if (!this.doesOverlap(newMatch, allMatches)) {
            allMatches.push(newMatch);
          }
        }
      }

      // Process matches in reverse order of their position
      allMatches.sort((a, b) => b.start - a.start);

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      // Sort matches by start position (ascending)
      const orderedMatches = [...allMatches].sort((a, b) => a.start - b.start);

      // Create text nodes and highlighted spans
      for (const match of orderedMatches) {
        // Add text before match
        if (match.start > lastIndex) {
          const textBefore = document.createTextNode(text.substring(lastIndex, match.start));
          fragment.appendChild(textBefore);
        }

        // Create highlighted span
        const span = document.createElement('mark');
        span.textContent = match.original;
        span.setAttribute('title', match.name);

        // Extract style from replacement string and apply it
        const styleMatch = match.replacement.match(/style="([^"]+)"/);
        if (styleMatch && styleMatch[1]) {
          span.style.cssText = styleMatch[1];
        }

        fragment.appendChild(span);
        lastIndex = match.end;
      }

      // Add remaining text after last match
      if (lastIndex < text.length) {
        const textAfter = document.createTextNode(text.substring(lastIndex));
        fragment.appendChild(textAfter);
      }

      return { fragment };
    }
    
    /**
     * Helper function to check for overlapping matches
     * @param {Object} newMatch - New match to check
     * @param {Array} existingMatches - Existing matches
     * @returns {boolean} Whether the new match overlaps with any existing match
     */
    doesOverlap(newMatch, existingMatches) {
      for (const match of existingMatches) {
        // Check if the new match overlaps with any existing match
        if (!(newMatch.end <= match.start || newMatch.start >= match.end)) {
          return true;
        }
      }
      return false;
    }
    
    /**
     * Create redacted version of text by replacing sensitive data with samples
     * @returns {string} Redacted text
     */
    createRedactedText() {
      if (!this.pendingPasteEvent) return '';
      
      // Create a copy of the original text
      let redactedText = this.pendingPasteEvent.text;

      // For each matched pattern type, replace all matches with the sample data
      for (const [patternName, matches] of Object.entries(this.pendingPasteEvent.patternMatches)) {
        const sampleValue = this.pendingPasteEvent.samples[patternName] || "REDACTED";

        // Sort matches by start position in descending order to replace from end to beginning
        const sortedMatches = [...matches].sort((a, b) => {
          const indexA = this.pendingPasteEvent.text.indexOf(a);
          const indexB = this.pendingPasteEvent.text.indexOf(b);
          return indexB - indexA;
        });

        // Replace each match with the sample data
        for (const match of sortedMatches) {
          const index = redactedText.indexOf(match);
          if (index !== -1) {
            redactedText = redactedText.substring(0, index) +
              sampleValue +
              redactedText.substring(index + match.length);
          }
        }
      }
      
      return redactedText;
    }
    
    /**
     * Paste text to a target element
     * @param {HTMLElement} target - Target element
     * @param {string} text - Text to paste
     */
    pasteTo(target, text) {
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const value = target.value || '';

        target.value =
          value.substring(0, start) +
          text +
          value.substring(end);

        target.selectionStart = target.selectionEnd = start + text.length;
      } else if (target.isContentEditable) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    /**
     * Animate popup entrance
     * @param {HTMLElement} popup - Popup element
     */
    animatePopup(popup) {
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%, -48%)';
      popup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

      setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translate(-50%, -50%)';
      }, 10);
    }
    
    /**
     * Show popup for blocked file uploads
     * @param {HTMLInputElement} fileInput - File input element
     * @param {Array} blockedFiles - List of blocked files
     * @param {Array} originalFiles - Original file list
     */
    showBlockedFilePopup(fileInput, blockedFiles, originalFiles) {
      // Remove any existing popup
      const existingPopup = document.getElementById('pii-blocker-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Create popup container
      const popup = this.createPopupContainer();

      // Create header
      const header = this.createBlockedFileHeader(popup, fileInput);

      // Create content
      const content = this.createBlockedFileContent(blockedFiles);

      // Create action buttons
      const buttonContainer = this.createBlockedFileButtons(popup, fileInput, originalFiles);

      // Assemble popup
      popup.appendChild(header);
      popup.appendChild(content);
      popup.appendChild(buttonContainer);

      // Add popup to body
      document.body.appendChild(popup);
      this.animatePopup(popup);
      
      // Clear the file input to block the upload initially
      fileInput.value = '';
    }
    
    /**
     * Create header for blocked file popup
     * @param {HTMLElement} popup - Popup container
     * @param {HTMLInputElement} fileInput - File input element
     * @returns {HTMLElement} Header element
     */
    createBlockedFileHeader(popup, fileInput) {
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 16px 20px;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #e74c3c;
        border-bottom: 1px solid #f5f5f5;
      `;
      header.textContent = 'Sensitive File Upload Detected';

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: #909090;
        font-size: 22px;
        cursor: pointer;
        padding: 0;
        margin: 0;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeButton.addEventListener('click', () => {
        popup.remove();
        fileInput.value = '';
      });
      header.appendChild(closeButton);
      
      return header;
    }
    
    /**
     * Create content for blocked file popup
     * @param {Array} blockedFiles - List of blocked files
     * @returns {HTMLElement} Content element
     */
    createBlockedFileContent(blockedFiles) {
      const content = document.createElement('div');
      content.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: 300px;
        color: #333;
      `;

      const message = document.createElement('p');
      message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
      message.textContent = `You're attempting to upload files that may contain sensitive code or credentials:`;
      content.appendChild(message);

      // Create list of blocked files
      const fileList = document.createElement('ul');
      fileList.style.cssText = `
        margin: 0 0 20px 0;
        padding-left: 20px;
        font-family: monospace;
      `;
      
      blockedFiles.forEach(file => {
        const listItem = document.createElement('li');
        listItem.textContent = file;
        listItem.style.cssText = `
          margin-bottom: 6px;
          color: #e74c3c;
        `;
        fileList.appendChild(listItem);
      });
      
      content.appendChild(fileList);

      const warningText = document.createElement('p');
      warningText.style.cssText = 'margin: 0; font-size: 14px; line-height: 1.5; color: #666;';
      warningText.textContent = `Code files may contain API keys, credentials, or other sensitive information.`;
      content.appendChild(warningText);
      
      return content;
    }
    
    /**
     * Create buttons for blocked file popup
     * @param {HTMLElement} popup - Popup container
     * @param {HTMLInputElement} fileInput - File input element
     * @param {Array} originalFiles - Original file list
     * @returns {HTMLElement} Button container
     */
    createBlockedFileButtons(popup, fileInput, originalFiles) {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        padding: 16px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #f5f5f5;
      `;

      const buttonBaseStyle = `
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s, opacity 0.2s;
      `;

      // Block upload button
      const blockButton = document.createElement('button');
      blockButton.textContent = 'Block Upload';
      blockButton.style.cssText = `
        ${buttonBaseStyle}
        background-color: white;
        color: #e74c3c;
        border: 1px solid #e74c3c;
      `;
      blockButton.addEventListener('mouseenter', () => {
        blockButton.style.backgroundColor = '#fff5f5';
      });
      blockButton.addEventListener('mouseleave', () => {
        blockButton.style.backgroundColor = 'white';
      });
      blockButton.addEventListener('click', () => {
        popup.remove();
        this.showNotification('File upload blocked: Sensitive file types detected');
      });

      // Allow upload button
      const allowButton = document.createElement('button');
      allowButton.textContent = 'Allow Upload';
      allowButton.style.cssText = `
        ${buttonBaseStyle}
        background-color: #e74c3c;
        color: white;
      `;
      allowButton.addEventListener('mouseenter', () => {
        allowButton.style.opacity = '0.9';
      });
      allowButton.addEventListener('mouseleave', () => {
        allowButton.style.opacity = '1';
      });
      allowButton.addEventListener('click', () => {
        popup.remove();
        this.showNotification('File upload allowed');
        
        // Temporarily mark this file input as allowed
        this.allowedFileUploads.set(fileInput, true);
        
        // Create a new DataTransfer object to reconstruct the FileList
        const dataTransfer = new DataTransfer();
        originalFiles.forEach(file => dataTransfer.items.add(file));
        
        // Set the files back to the input
        fileInput.files = dataTransfer.files;
        
        // Trigger native change events (without our listener)
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
      });

      buttonContainer.appendChild(blockButton);
      buttonContainer.appendChild(allowButton);
      
      return buttonContainer;
    }
  }

  // Initialize the content script
  const controller = new OptimusPIIContentController();
  controller.init();
})();