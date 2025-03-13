// options.js
function saveOptions(e) {
    e.preventDefault();
    
    // Get the selected mode
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    // Save to browser storage
    browser.storage.local.set({
      mode: mode
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
    browser.storage.local.get('mode').then((result) => {
      // Default to "interactive" if not set
      const mode = result.mode || 'interactive';
      document.querySelector(`input[value="${mode}"]`).checked = true;
    });
  }
  
  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.getElementById('save').addEventListener('click', saveOptions);