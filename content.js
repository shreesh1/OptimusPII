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
  
  // Store pending paste event for interactive mode
  let pendingPasteEvent = null;
  let popupDismissTimeout = null;
  
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
      
      // Handle based on mode
      switch(config.mode) {
        case "interactive":
          // Prevent default action until user decision
          event.preventDefault();
          event.stopPropagation();
          
          // Store the event for later use if user allows paste
          pendingPasteEvent = {
            targetElement: event.target,
            text: pastedText
          };
          
          // Show interactive popup with highlighted emails
          showInteractivePopup(pastedText, emailRegex);
          return false;
          
        case "block-and-alert":
          event.preventDefault();
          event.stopPropagation();
          showNotification('Paste blocked: Email address detected');
          return false;
          
        case "alert-only":
          showNotification('Warning: Email address detected in paste');
          return true;
          
        case "silent-block":
          event.preventDefault();
          event.stopPropagation();
          return false;
      }
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
  
  function showInteractivePopup(text, emailRegex) {
    // Remove any existing popup
    const existingPopup = document.getElementById('email-blocker-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Clear any existing timeout
    if (popupDismissTimeout) {
      clearTimeout(popupDismissTimeout);
    }
    
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'email-blocker-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10001;
      width: 450px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: Arial, sans-serif;
    `;
    
    // Create popup header
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: #ff4d4d;
      color: white;
      padding: 12px 15px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.textContent = 'Email Detected in Clipboard';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0 5px;
    `;
    closeButton.addEventListener('click', () => {
      popup.remove();
      pendingPasteEvent = null;
    });
    header.appendChild(closeButton);
    
    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 15px;
      overflow-y: auto;
      max-height: 300px;
    `;
    
    // Highlight emails in content
    const highlightedContent = document.createElement('pre');
    highlightedContent.style.cssText = `
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: monospace;
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    // Replace email addresses with highlighted spans
    const highlightedText = text.replace(emailRegex, match => 
      `<span style="background-color: #ffeb3b; font-weight: bold; padding: 2px 4px; border-radius: 2px;">${match}</span>`
    );
    highlightedContent.innerHTML = highlightedText;
    
    content.appendChild(document.createTextNode('The following paste contains email addresses:'));
    content.appendChild(document.createElement('br'));
    content.appendChild(document.createElement('br'));
    content.appendChild(highlightedContent);
    
    // Create action buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      padding: 15px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid #eee;
    `;
    
    const blockButton = document.createElement('button');
    blockButton.textContent = 'Block Paste';
    blockButton.style.cssText = `
      background-color: #ff4d4d;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    blockButton.addEventListener('click', () => {
      popup.remove();
      pendingPasteEvent = null;
      showNotification('Paste blocked: Email address detected');
    });
    
    const allowButton = document.createElement('button');
    allowButton.textContent = 'Allow Paste';
    allowButton.style.cssText = `
      background-color: #4caf50;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    allowButton.addEventListener('click', () => {
      popup.remove();
      
      // Execute the paste if we have saved event data
      if (pendingPasteEvent && pendingPasteEvent.targetElement) {
        // For input and textarea elements
        if (pendingPasteEvent.targetElement.tagName === 'INPUT' || 
            pendingPasteEvent.targetElement.tagName === 'TEXTAREA') {
          
          const start = pendingPasteEvent.targetElement.selectionStart || 0;
          const end = pendingPasteEvent.targetElement.selectionEnd || 0;
          const value = pendingPasteEvent.targetElement.value || '';
          
          // Insert text at cursor position
          pendingPasteEvent.targetElement.value = 
            value.substring(0, start) + 
            pendingPasteEvent.text + 
            value.substring(end);
          
          // Move cursor after inserted text
          pendingPasteEvent.targetElement.selectionStart = 
          pendingPasteEvent.targetElement.selectionEnd = 
            start + pendingPasteEvent.text.length;
            
        } else if (pendingPasteEvent.targetElement.isContentEditable) {
          // For contenteditable elements
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const textNode = document.createTextNode(pendingPasteEvent.text);
          range.insertNode(textNode);
          
          // Move cursor after inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      pendingPasteEvent = null;
      showNotification('Paste allowed');
    });
    
    buttonContainer.appendChild(blockButton);
    buttonContainer.appendChild(allowButton);
    
    // Assemble popup
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(buttonContainer);
    
    // Add popup to body
    document.body.appendChild(popup);
    
    // Auto-dismiss after 10 seconds if no action
    popupDismissTimeout = setTimeout(() => {
      if (document.body.contains(popup)) {
        popup.remove();
        pendingPasteEvent = null;
        showNotification('Paste blocked (timed out)');
      }
    }, 10000);
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