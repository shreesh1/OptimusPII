/**
 * OptimusPII Extension Options Page
 * 
 * This module manages the options page functionality including saving/loading settings,
 * handling UI interactions, and managing regex patterns, URL patterns, and file extensions.
 */

class OptionsManager {
  constructor() {
    this.hasUnsavedChanges = false;
    this.api = window.api || browser;
    this.OptimusPII = window.OptimusPII;
    this.domElements = {
      saveButton: document.getElementById('save'),
      statusIndicator: document.getElementById('status'),
      unsavedIndicator: document.querySelector('.unsaved-indicator')
    };
    
    this.containers = {
      defaultRegex: document.getElementById('default-regex-container'),
      customRegex: document.getElementById('custom-regex-container'),
      customUrl: document.getElementById('custom-url-container'),
      fileExt: document.getElementById('custom-file-ext-container')
    };
    
    this.templates = {
      regexTemplate: document.getElementById('regex-template'),
      urlTemplate: document.getElementById('url-template'),
      fileExtTemplate: document.getElementById('file-ext-template')
    };
    
    this.addButtons = {
      addRegex: document.getElementById('add-regex'),
      addUrl: document.getElementById('add-url'),
      addExt: document.getElementById('add-ext')
    };
  }

  /**
   * Initialize the options page
   */
  init() {
    this.loadStoredOptions();
    this.attachEventListeners();
    this.addChangeTracking();
    this.domElements.saveButton.disabled = true;
  }

  /**
   * Attach event listeners to static elements
   */
  attachEventListeners() {
    this.domElements.saveButton.addEventListener('click', this.saveOptions.bind(this));
    this.addButtons.addRegex.addEventListener('click', () => {
      this.addCustomRegexRow();
      this.markAsChanged();
    });
    this.addButtons.addUrl.addEventListener('click', () => {
      this.addCustomUrlRow();
      this.markAsChanged();
    });
    this.addButtons.addExt.addEventListener('click', () => {
      this.addCustomExtensionRow();
      this.markAsChanged();
    });
  }

  /**
   * Track changes in the UI
   */
  addChangeTracking() {
    // Radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', this.markAsChanged.bind(this));
    });

    // Track dynamic elements changes
    this.observeMutations();
  }

  /**
   * Observe DOM mutations to track changes in dynamically added elements
   */
  observeMutations() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              node.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', this.markAsChanged.bind(this));
              });
              node.querySelectorAll('button.remove-regex, button.remove-url, button.remove-ext')
                .forEach(btn => {
                  btn.addEventListener('click', this.markAsChanged.bind(this));
                });
            }
          });
        }
      });
    });

    // Observe containers with dynamic content
    Object.values(this.containers).forEach(container => {
      observer.observe(container, { childList: true, subtree: true });
    });
  }

  /**
   * Mark the form as having unsaved changes
   */
  markAsChanged() {
    if (!this.hasUnsavedChanges) {
      this.hasUnsavedChanges = true;
      this.domElements.saveButton.disabled = false;
      this.domElements.saveButton.classList.add('has-changes');
      this.domElements.unsavedIndicator.style.display = 'inline';
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  /**
   * Reset the change tracking state
   */
  resetChangeState() {
    this.hasUnsavedChanges = false;
    this.domElements.saveButton.disabled = true;
    this.domElements.saveButton.classList.remove('has-changes');
    this.domElements.unsavedIndicator.style.display = 'none';
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Handler for beforeunload event to warn about unsaved changes
   */
  beforeUnloadHandler(e) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }

  /**
   * Load stored options from browser storage
   */
  loadStoredOptions() {
    this.api.storage.local.get(['regexPatterns', 'customUrls', 'blockFileTypes'])
      .then(result => {
        const storedPatterns = result.regexPatterns || {};
        const storedUrls = result.customUrls || this.OptimusPII.DEFAULT_URLS || [];
        const storedFileTypes = result.blockFileTypes || this.OptimusPII.DEFAULT_FILE_TYPES || [];
        this.restoreOptions(storedPatterns, storedUrls, storedFileTypes);
      })
      .catch(error => {
        console.error('Failed to load stored options:', error);
      });
  }

  /**
   * Save options to browser storage
   * @param {Event} e - The triggered event
   */
  saveOptions(e) {
    if (e) e.preventDefault();

    try {
      const options = this.collectOptionsFromForm();
      
      this.api.storage.local.set(options)
        .then(() => {
          this.OptimusPII.registerContentScriptsForUrls(options.customUrls);
          this.showSaveConfirmation();
          this.resetChangeState();
        })
        .catch(error => {
          console.error('Failed to save options:', error);
          this.showErrorMessage('Failed to save options');
        });
    } catch (error) {
      console.error('Error collecting options from form:', error);
      this.showErrorMessage('Error processing form data');
    }
  }

  /**
   * Collect all options data from the form
   * @returns {Object} The collected options
   */
  collectOptionsFromForm() {
    // Get selected mode
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    // Process default regex patterns
    const defaultRegexPatterns = this.collectDefaultRegexPatterns();
    
    // Get custom regex patterns
    const customRegexPatterns = this.collectCustomRegexPatterns();
    
    // Combine all regex patterns
    const allRegexPatterns = { ...defaultRegexPatterns, ...customRegexPatterns };
    
    // Get custom URL patterns
    const customUrls = this.collectCustomUrlPatterns();
    
    // Get file extension patterns
    const blockFileTypes = this.collectFileExtensions();
    
    return {
      mode,
      regexPatterns: allRegexPatterns,
      customUrls,
      blockFileTypes
    };
  }

  /**
   * Collect default regex patterns from the form
   * @returns {Object} Default regex patterns with their settings
   */
  collectDefaultRegexPatterns() {
    const defaultRegexElements = document.querySelectorAll('.default-regex-row');
    const defaultRegexPatterns = {};

    defaultRegexElements.forEach(row => {
      const nameElement = row.querySelector('.regex-name');
      const name = nameElement.textContent;
      const enabled = row.querySelector('.toggle-regex').checked;
      const sampleInput = row.querySelector('.regex-sample');
      const sampleData = sampleInput ? sampleInput.value : 
        this.OptimusPII.DEFAULT_REGEX_PATTERNS[name].sampleData;

      if (this.OptimusPII.DEFAULT_REGEX_PATTERNS[name]) {
        defaultRegexPatterns[name] = {
          pattern: this.OptimusPII.DEFAULT_REGEX_PATTERNS[name].pattern,
          enabled,
          isDefault: true,
          sampleData
        };
      }
    });

    return defaultRegexPatterns;
  }

  /**
   * Collect custom regex patterns from the form
   * @returns {Object} Custom regex patterns with their settings
   */
  collectCustomRegexPatterns() {
    const customRegexElements = document.querySelectorAll('.custom-regex-row:not(#regex-template)');
    const customRegexPatterns = {};

    customRegexElements.forEach((row, index) => {
      if (index === 0) return;
      
      const nameInput = row.querySelector('.regex-name');
      const patternInput = row.querySelector('.regex-pattern');
      const sampleInput = row.querySelector('.regex-sample');
      const enabled = row.querySelector('.toggle-regex').checked;

      // Only save non-empty patterns with names
      if (nameInput.value.trim() && patternInput.value.trim()) {
        customRegexPatterns[nameInput.value.trim()] = {
          pattern: patternInput.value.trim(),
          enabled,
          isDefault: false,
          sampleData: sampleInput.value.trim() || "REDACTED"
        };
      }
    });

    return customRegexPatterns;
  }

  /**
   * Collect custom URL patterns from the form
   * @returns {Array} List of URL patterns
   */
  collectCustomUrlPatterns() {
    const customUrlElements = document.querySelectorAll('.custom-url-row:not(#url-template)');
    const customUrls = [];

    customUrlElements.forEach(row => {
      const urlPattern = row.querySelector('.url-pattern').value.trim();
      if (urlPattern) {
        customUrls.push(urlPattern);
      }
    });

    return customUrls;
  }

  /**
   * Collect file extension patterns from the form
   * @returns {Array} List of file extensions to block
   */
  collectFileExtensions() {
    const fileExtElements = document.querySelectorAll('.file-ext-row:not(#file-ext-template)');
    const blockFileTypes = [];

    fileExtElements.forEach(row => {
      const fileExt = row.querySelector('.file-ext-pattern').value.trim();
      if (fileExt) {
        if (!fileExt.startsWith('.')) {
          blockFileTypes.push('.' + fileExt.toLowerCase());
        } else {
          blockFileTypes.push(fileExt.toLowerCase());
        }
      }
    });

    return blockFileTypes;
  }

  /**
   * Show save confirmation message
   */
  showSaveConfirmation() {
    const status = this.domElements.statusIndicator;
    status.style.opacity = '1';
    setTimeout(function() {
      status.style.opacity = '0';
    }, 2000);
  }

  /**
   * Show error message
   * @param {string} message - The error message to display
   */
  showErrorMessage(message) {
    alert(`Error: ${message}`);
  }

  /**
   * Restore previously saved options to the UI
   * @param {Object} storedPatterns - Saved regex patterns
   * @param {Array} storedUrls - Saved URL patterns
   * @param {Array} storedFileTypes - Saved file extensions
   */
  restoreOptions(storedPatterns, storedUrls, storedFileTypes) {
    this.api.storage.local.get(['mode'])
      .then(result => {
        // Default to "interactive" if not set
        const mode = result.mode || 'interactive';
        document.querySelector(`input[value="${mode}"]`).checked = true;

        // Clear containers
        this.clearContainer(this.containers.defaultRegex);
        
        // Add patterns from storage
        this.addStoredPatterns(storedPatterns);
        
        // Ensure at least one custom pattern row exists
        if (!document.querySelector('.custom-regex-row:not(#regex-template)')) {
          this.addCustomRegexRow();
        }
        
        // Handle URL patterns
        this.restoreUrlPatterns(storedUrls);
        
        // Handle file extensions
        this.restoreFileExtensions(storedFileTypes);
      })
      .catch(error => {
        console.error('Failed to restore options:', error);
        this.showErrorMessage('Failed to restore saved options');
      });
  }

  /**
   * Clear a container element
   * @param {HTMLElement} container - The container to clear
   */
  clearContainer(container) {
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Add stored patterns to the UI
   * @param {Object} storedPatterns - The patterns to add
   */
  addStoredPatterns(storedPatterns) {
    for (const [name, details] of Object.entries(storedPatterns)) {
      if (details.isDefault) {
        // Add default patterns
        this.addDefaultRegexRow(name, details.pattern, details.enabled, details.sampleData);
      } else {
        // Add custom patterns
        this.addCustomRegexRow(name, details.pattern, details.enabled, details.sampleData);
      }
    }
  }

  /**
   * Restore URL patterns to the UI
   * @param {Array} storedUrls - The URL patterns to add
   */
  restoreUrlPatterns(storedUrls) {
    // Clear existing URL rows except template
    const existingUrlRows = document.querySelectorAll('.custom-url-row:not(#url-template)');
    existingUrlRows.forEach(row => row.remove());

    // Add saved URLs or at least one empty row
    if (storedUrls && storedUrls.length > 0) {
      storedUrls.forEach(url => this.addCustomUrlRow(url));
    } else {
      this.addCustomUrlRow();
    }
  }

  /**
   * Restore file extensions to the UI
   * @param {Array} storedFileTypes - The file extensions to add
   */
  restoreFileExtensions(storedFileTypes) {
    // Clear existing file extension rows except template
    const existingFileExtRows = document.querySelectorAll('.file-ext-row:not(#file-ext-template)');
    existingFileExtRows.forEach(row => row.remove());

    // Add saved file extensions or at least one empty row
    if (storedFileTypes && storedFileTypes.length > 0) {
      storedFileTypes.forEach(fileExt => this.addCustomExtensionRow(fileExt));
    } else {
      this.addCustomExtensionRow();
    }
  }

  /**
   * Add a default regex pattern row to the UI
   * @param {string} name - The pattern name
   * @param {string} pattern - The regex pattern
   * @param {boolean} enabled - Whether the pattern is enabled
   * @param {string} sampleData - Sample data for the pattern
   */
  addDefaultRegexRow(name, pattern, enabled, sampleData = '') {
    const row = document.createElement('div');
    row.className = 'default-regex-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    `;

    const toggleSwitch = this.createToggleSwitch(enabled);
    
    // Create name element
    const nameElement = document.createElement('div');
    nameElement.className = 'regex-name';
    nameElement.textContent = name;
    nameElement.style.cssText = `
      font-weight: 500;
      flex-grow: 1;
      min-width: 150px;
    `;

    // Info button to view pattern
    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.textContent = 'View Pattern';
    infoButton.style.cssText = `
      padding: 5px 10px;
      background-color: #f5f5f5;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      color: #333;
      margin-right: 10px;
    `;

    infoButton.addEventListener('click', () => {
      alert(`Pattern for ${name}:\n\n${pattern}`);
    });

    // Create sample data input
    const sampleLabel = document.createElement('div');
    sampleLabel.textContent = 'Sample replacement:';
    sampleLabel.style.cssText = `
      font-size: 13px;
      color: #666;
      margin-right: 5px;
    `;

    const sampleInput = document.createElement('input');
    sampleInput.type = 'text';
    sampleInput.className = 'regex-sample';
    sampleInput.value = sampleData || '';
    sampleInput.placeholder = 'Sample replacement data';
    sampleInput.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      width: 180px;
      margin-right: 10px;
    `;

    // Add elements to row
    row.appendChild(toggleSwitch);
    row.appendChild(nameElement);
    row.appendChild(infoButton);
    row.appendChild(sampleLabel);
    row.appendChild(sampleInput);

    // Add row to container
    this.containers.defaultRegex.appendChild(row);
  }

  /**
   * Create a toggle switch element
   * @param {boolean} enabled - Whether the switch is on
   * @returns {HTMLElement} The toggle switch element
   */
  createToggleSwitch(enabled) {
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'switch';
    toggleSwitch.style.cssText = `
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      margin-right: 12px;
      flex-shrink: 0;
    `;

    const toggleInput = document.createElement('input');
    toggleInput.className = 'toggle-regex';
    toggleInput.type = 'checkbox';
    toggleInput.checked = enabled;
    toggleInput.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'slider';
    toggleSlider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${enabled ? '#0078d7' : '#ccc'};
      transition: .4s;
      border-radius: 22px;
    `;

    const sliderHandle = document.createElement('span');
    sliderHandle.style.cssText = `
      position: absolute;
      content: '';
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
      transform: ${enabled ? 'translateX(18px)' : 'translateX(0)'};
    `;

    toggleSlider.appendChild(sliderHandle);

    toggleInput.addEventListener('change', function() {
      sliderHandle.style.transform = this.checked ? 'translateX(18px)' : 'translateX(0)';
      toggleSlider.style.backgroundColor = this.checked ? '#0078d7' : '#ccc';
    });

    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);

    return toggleSwitch;
  }

  /**
   * Add a custom regex pattern row to the UI
   * @param {string} name - The pattern name
   * @param {string} pattern - The regex pattern
   * @param {boolean} enabled - Whether the pattern is enabled
   * @param {string} sampleData - Sample data for the pattern
   */
  addCustomRegexRow(name = '', pattern = '', enabled = true, sampleData = '') {
    // Clone the template
    const newRow = this.templates.regexTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set values if provided
    newRow.querySelector('.regex-name').value = name;
    newRow.querySelector('.regex-pattern').value = pattern;
    newRow.querySelector('.regex-sample').value = sampleData;

    // Add toggle switch
    const toggleSwitch = this.createToggleSwitch(enabled);
    newRow.insertBefore(toggleSwitch, newRow.firstChild);

    // Add remove button functionality
    newRow.querySelector('.remove-regex').addEventListener('click', function() {
      newRow.remove();
    });

    // Add to container
    this.containers.customRegex.appendChild(newRow);
  }

  /**
   * Add a custom URL pattern row to the UI
   * @param {string} url - The URL pattern
   */
  addCustomUrlRow(url = '') {
    // Clone the template
    const newRow = this.templates.urlTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set value if provided
    newRow.querySelector('.url-pattern').value = url;

    // Add remove button functionality
    newRow.querySelector('.remove-url').addEventListener('click', () => {
      const urlPattern = newRow.querySelector('.url-pattern').value.trim();
      
      // Check if it's a default URL that shouldn't be removed
      if (this.OptimusPII.DEFAULT_URLS && 
          this.OptimusPII.DEFAULT_URLS.includes(urlPattern)) {
        alert('Cannot remove default URL pattern');
        return;
      }
      
      newRow.remove();
    });

    // Add to container
    this.containers.customUrl.appendChild(newRow);
  }

  /**
   * Add a custom file extension row to the UI
   * @param {string} fileExt - The file extension
   */
  addCustomExtensionRow(fileExt = '') {
    // Clone the template
    const newRow = this.templates.fileExtTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set value if provided
    newRow.querySelector('.file-ext-pattern').value = fileExt;

    // Add remove button functionality
    newRow.querySelector('.remove-ext').addEventListener('click', function() {
      newRow.remove();
    });

    // Add to container
    this.containers.fileExt.appendChild(newRow);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const optionsManager = new OptionsManager();
  optionsManager.init();
});