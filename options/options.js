// options.js

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
  }
};

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
    
    if (DEFAULT_REGEX_PATTERNS[name]) {
      defaultRegexPatterns[name] = {
        pattern: DEFAULT_REGEX_PATTERNS[name].pattern,
        enabled: enabled,
        isDefault: true
      };
    }
  });
  
  // Get custom regex patterns
  const customRegexPatterns = {};
  const customRegexElements = document.querySelectorAll('.custom-regex-row:not(#regex-template)');
  customRegexElements.forEach(row => {
    const nameInput = row.querySelector('.regex-name');
    const patternInput = row.querySelector('.regex-pattern');
    const enabled = row.querySelector('.toggle-regex').checked;
    
    // Only save non-empty patterns with names
    if (nameInput.value.trim() && patternInput.value.trim()) {
      customRegexPatterns[nameInput.value.trim()] = {
        pattern: patternInput.value.trim(),
        enabled: enabled,
        isDefault: false
      };
    }
  });
  
  // Combine all regex patterns
  const allRegexPatterns = { ...defaultRegexPatterns, ...customRegexPatterns };
  
  // Save to browser storage
  browser.storage.local.set({
    mode: mode,
    regexPatterns: allRegexPatterns
  }).then(() => {
    // Update status to let user know options were saved
    const status = document.getElementById('status');
    status.style.opacity = '1';
    setTimeout(function() {
      status.style.opacity = '0';
    }, 2000);
  });
}

function restoreOptions() {
  browser.storage.local.get(['mode', 'regexPatterns']).then((result) => {
    // Default to "interactive" if not set
    const mode = result.mode || 'interactive';
    document.querySelector(`input[value="${mode}"]`).checked = true;
    
    // Get stored regex patterns or use defaults
    const storedRegexPatterns = result.regexPatterns || {};
    
    // Process default patterns
    const defaultRegexContainer = document.getElementById('default-regex-container');
    defaultRegexContainer.innerHTML = ''; // Clear existing content
    
    // Add default patterns
    for (const [name, details] of Object.entries(DEFAULT_REGEX_PATTERNS)) {
      // Check if this default pattern exists in stored patterns
      const storedPattern = storedRegexPatterns[name];
      const isEnabled = storedPattern ? storedPattern.enabled : details.enabled;
      
      addDefaultRegexRow(name, details.pattern, isEnabled);
    }
    
    // Restore custom regex patterns
    const customRegexContainer = document.getElementById('custom-regex-container');
    
    // Clear existing rows (except template)
    const existingRows = customRegexContainer.querySelectorAll('.custom-regex-row:not(#regex-template)');
    existingRows.forEach(row => row.remove());
    
    // Add a row for each custom pattern (non-default)
    let hasCustomPatterns = false;
    
    for (const [name, details] of Object.entries(storedRegexPatterns)) {
      // Skip default patterns as they're already handled
      if (details.isDefault) continue;
      
      addCustomRegexRow(name, details.pattern, details.enabled);
      hasCustomPatterns = true;
    }
    
    // Add an empty row if no custom patterns exist
    if (!hasCustomPatterns) {
      addCustomRegexRow();
    }
  });
}

function addDefaultRegexRow(name, pattern, enabled) {
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
  toggleSlider.innerHTML = `
    <span style="
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
    "></span>
  `;
  
  toggleInput.addEventListener('change', function() {
    toggleSlider.querySelector('span').style.transform = 
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
  `;
  
  infoButton.addEventListener('click', () => {
    alert(`Pattern for ${name}:\n\n${pattern}`);
  });
  
  // Add elements to row
  row.appendChild(toggleSwitch);
  row.appendChild(nameElement);
  row.appendChild(infoButton);
  
  // Add row to container
  container.appendChild(row);
}

function addCustomRegexRow(name = '', pattern = '', enabled = true) {
  const container = document.getElementById('custom-regex-container');
  const template = document.getElementById('regex-template');
  
  // Clone the template
  const newRow = template.cloneNode(true);
  newRow.id = '';
  newRow.classList.remove('hidden');
  
  // Set values if provided
  newRow.querySelector('.regex-name').value = name;
  newRow.querySelector('.regex-pattern').value = pattern;
  
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
  toggleSlider.innerHTML = `
    <span style="
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
    "></span>
  `;
  
  toggleInput.addEventListener('change', function() {
    toggleSlider.querySelector('span').style.transform = 
      this.checked ? 'translateX(18px)' : 'translateX(0)';
    toggleSlider.style.backgroundColor = 
      this.checked ? '#0078d7' : '#ccc';
  });
  
  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);
  
  // Add toggle at the beginning of the row
  newRow.insertBefore(toggleSwitch, newRow.firstChild);
  
  // Add remove button functionality
  newRow.querySelector('.remove-regex').addEventListener('click', function() {
    newRow.remove();
  });
  
  // Add to container
  container.appendChild(newRow);
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  
  // Add button for new regex
  document.getElementById('add-regex').addEventListener('click', () => {
    addCustomRegexRow();
  });
});

document.getElementById('save').addEventListener('click', saveOptions);