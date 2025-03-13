// content.js

// Default configuration
let config = {
    mode: "block-and-alert"
  };
  
  // Load configuration from storage
  browser.storage.local.get('mode').then((result) => {
    if (result.mode) {
      config.mode = result.mode;
      console.log('Email blocker mode:', config.mode);
    }
  });
  
  // Listen for changes to configuration
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.mode) {
      config.mode = changes.mode.newValue;
      console.log('Email blocker mode updated:', config.mode);
    }
  });
  
  function handlePaste(event) {
    // If the extension is disabled, do nothing
    if (config.mode === "disabled") {
      return true;
    }
    
    // Get clipboard data as text
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    // Simple regex to detect email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    // Check if the pasted content contains an email
    if (emailRegex.test(pastedText)) {
      // Log the detection (happens in all non-disabled modes)
      console.log('Email detected in paste:', pastedText);
      
      // Block paste if mode is not "alert-only"
      if (config.mode !== "alert-only") {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // Show notification if mode includes alerts
      if (config.mode === "block-and-alert" || config.mode === "alert-only") {
        showNotification(config.mode === "block-and-alert" ? 
          'Paste blocked: Email address detected' : 
          'Warning: Email address detected in paste');
      }
      
      return false;
    }
    return true;
  }
  
  function showNotification(message) {
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
  
  // Add global paste event listener
  document.addEventListener('paste', handlePaste, true);
  
  // Add listeners to all input and contenteditable elements
  function addListenersToElement(element) {
    element.addEventListener('paste', handlePaste, true);
  }
  
  // Add listeners to existing elements
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(addListenersToElement);
  });
  
  // Monitor for new elements being added to the DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const newNode = mutation.addedNodes[i];
          if (newNode.nodeType === 1) { // Element node
            if (newNode.tagName === 'INPUT' || newNode.tagName === 'TEXTAREA' || 
                newNode.getAttribute('contenteditable') === 'true') {
              addListenersToElement(newNode);
            }
            // Check children
            newNode.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(addListenersToElement);
          }
        }
      }
    });
  });
  
  // Start observing once the DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });