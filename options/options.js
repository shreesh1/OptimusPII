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
    
    if (window.OptimusPII.DEFAULT_REGEX_PATTERNS[name]) {
      defaultRegexPatterns[name] = {
        pattern: window.OptimusPII.DEFAULT_REGEX_PATTERNS[name].pattern,
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
  
  // Get custom URL patterns
  const customUrlElements = document.querySelectorAll('.custom-url-row:not(#url-template)');
  const customUrls = [];
  
  customUrlElements.forEach(row => {
    const urlPattern = row.querySelector('.url-pattern').value.trim();
    if (urlPattern) {
      customUrls.push(urlPattern);
    }
  });
  
  // Save to browser storage
  browser.storage.local.set({
    mode: mode,
    regexPatterns: allRegexPatterns,
    customUrls: customUrls
  }).then(() => {
    // Update status to let user know options were saved
    const status = document.getElementById('status');
    status.style.opacity = '1';
    setTimeout(function() {
      status.style.opacity = '0';
    }, 2000);
  });
}

// Fetch default patterns from storage when options page loads
function initializeOptionsPage() {
  browser.storage.local.get(['regexPatterns', 'customUrls']).then((result) => {
    const storedPatterns = result.regexPatterns || {};
    const storedUrls = result.customUrls || window.OptimusPII.DEFAULT_URLS || [];
    
    // Now restore options with the retrieved patterns and URLs
    restoreOptions(storedPatterns, storedUrls);
  });

  document.getElementById('add-regex').addEventListener('click', () => {
    addCustomRegexRow();
  });
  
  document.getElementById('add-url').addEventListener('click', () => {
    addCustomUrlRow();
  });
}

function restoreOptions(storedPatterns, storedUrls) {
  browser.storage.local.get(['mode']).then((result) => {
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
        addDefaultRegexRow(name, details.pattern, details.enabled);
      } else {
        // Add custom patterns
        addCustomRegexRow(name, details.pattern, details.enabled);
      }
    }
    
    // Add an empty row if no custom patterns exist
    if (!document.querySelector('.custom-regex-row:not(#regex-template)')) {
      addCustomRegexRow();
    }
    
    // Populate URL patterns
    const customUrlContainer = document.getElementById('custom-url-container');
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
  newRow.querySelector('.remove-url').addEventListener('click', function() {
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

document.addEventListener('DOMContentLoaded', initializeOptionsPage);

document.getElementById('save').addEventListener('click', saveOptions);