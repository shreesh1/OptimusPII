// options.js

function saveOptions(e) {
  e.preventDefault();

  // Get the selected mode
  const mode = document.querySelector('input[name="mode"]:checked').value;

  // Process default regex patterns (keep track of enabled state)
  const defaultRegexElements = document.querySelectorAll('.default-regex-row');
  const defaultRegexPatterns = {};

  defaultRegexElements.forEach(row => {
    const nameElement = row.querySelector('.regex-name');
    const name = nameElement.textContent;
    const enabled = row.querySelector('.toggle-regex').checked;
    const sampleInput = row.querySelector('.regex-sample');
    const sampleData = sampleInput ? sampleInput.value : window.OptimusPII.DEFAULT_REGEX_PATTERNS[name].sampleData;

    if (window.OptimusPII.DEFAULT_REGEX_PATTERNS[name]) {
      defaultRegexPatterns[name] = {
        pattern: window.OptimusPII.DEFAULT_REGEX_PATTERNS[name].pattern,
        enabled: enabled,
        isDefault: true,
        sampleData: sampleData
      };
    }
  });

  // Get custom regex patterns
  const customRegexPatterns = {};
  const customRegexElements = document.querySelectorAll('.custom-regex-row:not(#regex-template)');
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
        enabled: enabled,
        isDefault: false,
        sampleData: sampleInput.value.trim() || "REDACTED"
      };
    }
  });

  // Combine all regex patterns
  const allRegexPatterns = { ...defaultRegexPatterns, ...customRegexPatterns };

  // Get custom URL patterns
  const customUrlElements = document.querySelectorAll('.custom-url-row:not(#url-template)');
  const customUrls = [];

  customUrlElements.forEach(row => {
    const urlPattern = row.querySelector('.url-pattern').value.trim();
    if (urlPattern) {
      customUrls.push(urlPattern);
    }
  });


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



  // Save to browser storage
  api.storage.local.set({
    mode: mode,
    regexPatterns: allRegexPatterns,
    customUrls: customUrls,
    blockFileTypes: blockFileTypes
  }).then(() => {

    window.OptimusPII.registerContentScriptsForUrls(customUrls);

    const status = document.getElementById('status');
    status.style.opacity = '1';
    setTimeout(function () {
      status.style.opacity = '0';
    }, 2000);
  });
}

// Fetch default patterns from storage when options page loads
function initializeOptionsPage() {
  api.storage.local.get(['regexPatterns', 'customUrls','blockFileTypes']).then((result) => {
    const storedPatterns = result.regexPatterns || {};
    const storedUrls = result.customUrls || window.OptimusPII.DEFAULT_URLS || [];
    const storedFileTypes = result.blockFileTypes || window.OptimusPII.DEFAULT_FILE_TYPES || [];

    // Now restore options with the retrieved patterns and URLs
    restoreOptions(storedPatterns, storedUrls, storedFileTypes);
  });

  document.getElementById('add-regex').addEventListener('click', () => {
    addCustomRegexRow();
  });

  document.getElementById('add-url').addEventListener('click', () => {
    addCustomUrlRow();
  });

  document.getElementById('add-ext').addEventListener('click', () => {
    addCustomExtensionRow();
  });
}

function restoreOptions(storedPatterns, storedUrls, storedFileTypes) {
  api.storage.local.get(['mode']).then((result) => {
    // Default to "interactive" if not set
    const mode = result.mode || 'interactive';
    document.querySelector(`input[value="${mode}"]`).checked = true;

    // Process patterns
    const defaultRegexContainer = document.getElementById('default-regex-container');
    defaultRegexContainer.innerHTML = ''; // Clear existing content

    // Add all patterns from storage
    for (const [name, details] of Object.entries(storedPatterns)) {
      if (details.isDefault) {
        // Add default patterns
        addDefaultRegexRow(name, details.pattern, details.enabled, details.sampleData);
      } else {
        // Add custom patterns
        addCustomRegexRow(name, details.pattern, details.enabled, details.sampleData);
      }
    }

    // Add an empty row if no custom patterns exist
    if (!document.querySelector('.custom-regex-row:not(#regex-template)')) {
      addCustomRegexRow();
    }

    // Clear existing URL rows except template
    const existingUrlRows = document.querySelectorAll('.custom-url-row:not(#url-template)');
    existingUrlRows.forEach(row => row.remove());

    // Add saved URLs
    if (storedUrls && storedUrls.length > 0) {
      storedUrls.forEach(url => {
        addCustomUrlRow(url);
      });
    } else {
      // Add at least one empty row
      addCustomUrlRow();
    }

    const existingFileExtRows = document.querySelectorAll('.file-ext-row:not(#file-ext-template)');
    existingFileExtRows.forEach(row => row.remove());
    if (storedFileTypes && storedFileTypes.length > 0) {
      storedFileTypes.forEach(fileExt => {
        addCustomExtensionRow(fileExt);
      });
    }  else {
      addCustomExtensionRow();
    }
  });
}

function addDefaultRegexRow(name, pattern, enabled, sampleData = '') {
  const container = document.getElementById('default-regex-container');

  // Create row
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

  // Create toggle switch
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'switch';
  toggleSwitch.style.cssText = `
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    margin-right: 12px;
    flex-shrink: 0; /* Prevents the toggle from stretching */
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

  // Create the inner span instead of using innerHTML
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

  toggleInput.addEventListener('change', function () {
    sliderHandle.style.transform =
      this.checked ? 'translateX(18px)' : 'translateX(0)';
    toggleSlider.style.backgroundColor =
      this.checked ? '#0078d7' : '#ccc';
  });

  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);

  // Create name element
  const nameElement = document.createElement('div');
  nameElement.className = 'regex-name';
  nameElement.textContent = name;
  nameElement.style.cssText = `
    font-weight: 500;
    flex-grow: 1;
    min-width: 150px; /* Ensure minimum width */
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
  container.appendChild(row);
}

function addCustomRegexRow(name = '', pattern = '', enabled = true, sampleData = '') {
  const container = document.getElementById('custom-regex-container');
  const template = document.getElementById('regex-template');

  // Clone the template
  const newRow = template.cloneNode(true);
  newRow.id = '';
  newRow.classList.remove('hidden');

  // Set values if provided
  newRow.querySelector('.regex-name').value = name;
  newRow.querySelector('.regex-pattern').value = pattern;
  newRow.querySelector('.regex-sample').value = sampleData;

  // Add toggle switch for custom patterns
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'switch';
  toggleSwitch.style.cssText = `
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    margin-right: 12px;
    flex-shrink: 0; /* Prevents the toggle from stretching */
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

  // Create the inner span instead of using innerHTML
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

  toggleInput.addEventListener('change', function () {
    sliderHandle.style.transform =
      this.checked ? 'translateX(18px)' : 'translateX(0)';
    toggleSlider.style.backgroundColor =
      this.checked ? '#0078d7' : '#ccc';
  });

  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);

  // Add toggle at the beginning of the row
  newRow.insertBefore(toggleSwitch, newRow.firstChild);

  // Add remove button functionality
  newRow.querySelector('.remove-regex').addEventListener('click', function () {
    newRow.remove();
  });

  // Add to container
  container.appendChild(newRow);
}

function addCustomUrlRow(url = '') {
  const container = document.getElementById('custom-url-container');
  const template = document.getElementById('url-template');

  // Clone the template
  const newRow = template.cloneNode(true);
  newRow.id = '';
  newRow.classList.remove('hidden');

  // Set value if provided
  newRow.querySelector('.url-pattern').value = url;

  // Add remove button functionality
  newRow.querySelector('.remove-url').addEventListener('click', function () {
    const urlPattern = newRow.querySelector('.url-pattern').value.trim();
    if (window.OptimusPII.DEFAULT_URLS && window.OptimusPII.DEFAULT_URLS.includes(urlPattern)) {
      alert('Cannot remove default URL pattern');
      return;
    }
    newRow.remove();
  });

  // Add to container
  container.appendChild(newRow);
}

function addCustomExtensionRow(fileExt = '') {
  const container = document.getElementById('custom-file-ext-container');
  const template = document.getElementById('file-ext-template');

  // Clone the template
  const newRow = template.cloneNode(true);
  newRow.id = '';
  newRow.classList.remove('hidden');

  // Set value if provided
  newRow.querySelector('.file-ext-pattern').value = fileExt;

  // Add remove button functionality
  newRow.querySelector('.remove-ext').addEventListener('click', function () {
    newRow.remove();
  });

  // Add to container
  container.appendChild(newRow);
}

document.addEventListener('DOMContentLoaded', initializeOptionsPage);

document.getElementById('save').addEventListener('click', saveOptions);

// Add this after your initial document is loaded

// Track if there are unsaved changes
let hasUnsavedChanges = false;

// Function to mark that changes have been made
function markAsChanged() {
  if (!hasUnsavedChanges) {
    hasUnsavedChanges = true;

    // Enable the save button
    document.getElementById('save').disabled = false;

    // Add visual indicator
    document.getElementById('save').classList.add('has-changes');
    document.querySelector('.unsaved-indicator').style.display = 'inline';

    // Add warning when trying to leave the page
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
}

// Function to reset changes state after saving
function resetChangeState() {
  hasUnsavedChanges = false;
  document.getElementById('save').disabled = true;
  document.getElementById('save').classList.remove('has-changes');
  document.querySelector('.unsaved-indicator').style.display = 'none';
  window.removeEventListener('beforeunload', beforeUnloadHandler);
}

// Warning when trying to leave with unsaved changes
function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  return e.returnValue;
}

// Add change listeners to all form elements
function addChangeListeners() {
  // Radio buttons
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', markAsChanged);
  });

  // Add listeners to dynamic elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            node.querySelectorAll('input').forEach(input => {
              input.addEventListener('input', markAsChanged);
            });
            node.querySelectorAll('button.remove-regex, button.remove-url').forEach(btn => {
              btn.addEventListener('click', markAsChanged);
            });
            node.querySelectorAll('button.remove-ext').forEach(btn => {
              btn.addEventListener('click', markAsChanged);
            });     
          }
        });
      }
    });
  });

  // Observe containers that might have dynamic content
  observer.observe(document.getElementById('custom-regex-container'), { childList: true, subtree: true });
  observer.observe(document.getElementById('custom-url-container'), { childList: true, subtree: true });
  observer.observe(document.getElementById('default-regex-container'), { childList: true, subtree: true });
  observer.observe(document.getElementById('custom-file-ext-container'), { childList: true, subtree: true });

  // Add button listeners
  document.getElementById('add-regex').addEventListener('click', markAsChanged);
  document.getElementById('add-url').addEventListener('click', markAsChanged);
  document.getElementById('add-ext').addEventListener('click', markAsChanged);
}

// Modify your existing save function
document.getElementById('save').addEventListener('click', function () {
  resetChangeState();
});

// Initialize listeners once DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Disable save button initially
  document.getElementById('save').disabled = true;

  // Add change listeners
  addChangeListeners();
});