// options.js
function saveOptions(e) {
    e.preventDefault();
    
    // Get the selected mode
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    // Get custom regex patterns
    const customRegexPatterns = {};
    const customRegexElements = document.querySelectorAll('.custom-regex-row');
    customRegexElements.forEach(row => {
      const nameInput = row.querySelector('.regex-name');
      const patternInput = row.querySelector('.regex-pattern');
      
      // Only save non-empty patterns with names
      if (nameInput.value.trim() && patternInput.value.trim()) {
        customRegexPatterns[nameInput.value.trim()] = patternInput.value.trim();
      }
    });
    
    // Save to browser storage
    browser.storage.local.set({
      mode: mode,
      customRegexPatterns: customRegexPatterns
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
    browser.storage.local.get(['mode', 'customRegexPatterns']).then((result) => {
      // Default to "interactive" if not set
      const mode = result.mode || 'interactive';
      document.querySelector(`input[value="${mode}"]`).checked = true;
      
      // Restore custom regex patterns
      const customRegexPatterns = result.customRegexPatterns || {};
      const customRegexContainer = document.getElementById('custom-regex-container');
      
      // Clear existing rows (except template)
      const existingRows = customRegexContainer.querySelectorAll('.custom-regex-row:not(#regex-template)');
      existingRows.forEach(row => row.remove());
      
      // Add a row for each saved pattern
      Object.entries(customRegexPatterns).forEach(([name, pattern]) => {
        addCustomRegexRow(name, pattern);
      });
      
      // Add an empty row if none exist
      if (Object.keys(customRegexPatterns).length === 0) {
        addCustomRegexRow();
      }
    });
  }
  
  function addCustomRegexRow(name = '', pattern = '') {
    const container = document.getElementById('custom-regex-container');
    const template = document.getElementById('regex-template');
    
    // Clone the template
    const newRow = template.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');
    
    // Set values if provided
    newRow.querySelector('.regex-name').value = name;
    newRow.querySelector('.regex-pattern').value = pattern;
    
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