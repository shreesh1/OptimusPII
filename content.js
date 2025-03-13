// content.js

// Default configuration
let config = {
    mode: "interactive"
  };
  
  // Load configuration from storage
  browser.storage.local.get('mode').then((result) => {
    if (result.mode) {
      config.mode = result.mode;
      console.log('PII blocker mode:', config.mode);
    }
  });
  
  // Listen for changes to configuration
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.mode) {
      config.mode = changes.mode.newValue;
      console.log('PII blocker mode updated:', config.mode);
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
    
    // Regex to detect email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Regex to detect credit card numbers (supports major card formats with or without spaces/dashes)
    const creditCardRegex = /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:(?:5[0678]\d\d|6304|6390|67\d\d)\d{8,15}))([-\s]?[0-9]{4})?/g;
    
    // Regex to detect phone numbers (various formats including international)
    const phoneRegex = /(?:\+\d{1,3}[\s-]?)?\(?(?:\d{1,4})\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g;

    // Regex to detect SSNs (formats: XXX-XX-XXXX, XXX XX XXXX, XXXXXXXXX)
    const ssnRegex = /\b(?!000|666|9\d{2})([0-8]\d{2}|7([0-6]\d|7[012]))([-\s]?)(?!00)\d\d\3(?!0000)\d{4}\b/g;
    
    // Find all sensitive data
    const emails = pastedText.match(emailRegex) || [];
    const creditCards = pastedText.match(creditCardRegex) || [];
    const phoneNumbers = pastedText.match(phoneRegex) || [];
    const ssns = pastedText.match(ssnRegex) || [];
    
    // Check if the pasted content contains sensitive data
    if (emails.length > 0 || creditCards.length > 0 || phoneNumbers.length > 0 || ssns.length > 0) {
      // Determine the type of PII for notification messages
      const piiTypes = [];
      if (emails.length > 0) piiTypes.push("email");
      if (creditCards.length > 0) piiTypes.push("credit card");
      if (phoneNumbers.length > 0) piiTypes.push("phone number");
      if (ssns.length > 0) piiTypes.push("SSN");
      const piiMessage = piiTypes.join(", ").replace(/,([^,]*)$/, " and$1");
      
      // Log the detection (happens in all non-disabled modes)
      console.log(`${piiMessage} detected in paste:`, pastedText);
      
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
          
          // Show interactive popup with highlighted sensitive data
          showInteractivePopup(pastedText, emailRegex, creditCardRegex, phoneRegex, ssnRegex);
          return false;
          
        case "block-and-alert":
          event.preventDefault();
          event.stopPropagation();
          showNotification(`Paste blocked: ${piiMessage} detected`);
          return false;
          
        case "alert-only":
          showNotification(`Warning: ${piiMessage} detected in paste`);
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
  
  function showInteractivePopup(text, emailRegex, creditCardRegex, phoneRegex, ssnRegex) {
    // Remove any existing popup
    const existingPopup = document.getElementById('pii-blocker-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Clear any existing timeout
    if (popupDismissTimeout) {
      clearTimeout(popupDismissTimeout);
    }
    
    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'pii-blocker-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #f9f9f9;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 10001;
      width: 450px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: Arial, sans-serif;
    `;
    
    // Determine what types of PII were detected
    const hasEmails = text.match(emailRegex) !== null;
    const hasCardNumbers = text.match(creditCardRegex) !== null;
    const hasPhoneNumbers = text.match(phoneRegex) !== null;
    const hasSSNs = text.match(ssnRegex) !== null;
    
    let headerText = 'Sensitive Information Detected';
    if (hasEmails && !hasCardNumbers && !hasPhoneNumbers && !hasSSNs) headerText = 'Email Address Detected';
    if (!hasEmails && hasCardNumbers && !hasPhoneNumbers && !hasSSNs) headerText = 'Credit Card Number Detected';
    if (!hasEmails && !hasCardNumbers && hasPhoneNumbers && !hasSSNs) headerText = 'Phone Number Detected';
    if (!hasEmails && !hasCardNumbers && !hasPhoneNumbers && hasSSNs) headerText = 'Social Security Number Detected';
    if ((hasEmails ? 1 : 0) + (hasCardNumbers ? 1 : 0) + (hasPhoneNumbers ? 1 : 0) + (hasSSNs ? 1 : 0) > 1) headerText = 'Multiple PII Types Detected';
    
    // Create popup header with softer color
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: #e74c3c;
      color: white;
      padding: 12px 15px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.textContent = headerText;
    
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
      color: #333;
    `;
    
    // Highlight sensitive info in content
    const highlightedContent = document.createElement('pre');
    highlightedContent.style.cssText = `
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: monospace;
      border: 1px solid #e0e0e0;
      padding: 10px;
      background-color: #fff;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    // Function to mask all but last 4 digits of credit card
    function maskCardNumber(cardNumber) {
      const lastFourDigits = cardNumber.replace(/\D/g, '').slice(-4);
      return `****-****-****-${lastFourDigits}`;
    }
    
    // Function to mask phone number (show only last 4 digits)
    function maskPhoneNumber(phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '');
      const lastFourDigits = digits.slice(-4);
      return `(***) ***-${lastFourDigits}`;
    }
    
    // Function to mask SSN (show only last 4 digits)
    function maskSSN(ssn) {
      const digits = ssn.replace(/\D/g, '');
      const lastFourDigits = digits.slice(-4);
      return `***-**-${lastFourDigits}`;
    }
    
    // Replace sensitive information with highlighted spans
    let highlightedText = text;
    
    // First replace credit cards (to avoid overlap issues)
    if (hasCardNumbers) {
      highlightedText = highlightedText.replace(creditCardRegex, match => {
        const masked = maskCardNumber(match);
        return `<span style="background-color: #fdebd0; font-weight: bold; padding: 2px 4px; border-radius: 2px;">${masked}</span>`;
      });
    }
    
    // Then replace phone numbers
    if (hasPhoneNumbers) {
      highlightedText = highlightedText.replace(phoneRegex, match => {
        const masked = maskPhoneNumber(match);
        return `<span style="background-color: #d6eaf8; font-weight: bold; padding: 2px 4px; border-radius: 2px;">${masked}</span>`;
      });
    }
    
    // Then replace SSNs
    if (hasSSNs) {
      highlightedText = highlightedText.replace(ssnRegex, match => {
        const masked = maskSSN(match);
        return `<span style="background-color: #e8daef; font-weight: bold; padding: 2px 4px; border-radius: 2px;">${masked}</span>`;
      });
    }
    
    // Then replace emails
    if (hasEmails) {
      highlightedText = highlightedText.replace(emailRegex, match => 
        `<span style="background-color: #fcf3cf; font-weight: bold; padding: 2px 4px; border-radius: 2px;">${match}</span>`
      );
    }
    
    highlightedContent.innerHTML = highlightedText;
    
    const detectedTypes = [];
    if (hasEmails) detectedTypes.push("email addresses");
    if (hasCardNumbers) detectedTypes.push("credit card numbers");
    if (hasPhoneNumbers) detectedTypes.push("phone numbers");
    if (hasSSNs) detectedTypes.push("social security numbers");
    
    content.appendChild(document.createTextNode(`The following paste contains ${detectedTypes.join(", ").replace(/,([^,]*)$/, " and$1")}:`));
    
    content.appendChild(document.createElement('br'));
    content.appendChild(document.createElement('br'));
    content.appendChild(highlightedContent);
    
    // Create action buttons with less bright colors
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      padding: 15px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid #e0e0e0;
    `;
    
    const blockButton = document.createElement('button');
    blockButton.textContent = 'Block Paste';
    blockButton.style.cssText = `
      background-color: #e74c3c;
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
      showNotification('Paste blocked: Sensitive information detected');
    });
    
    const allowButton = document.createElement('button');
    allowButton.textContent = 'Allow Paste';
    allowButton.style.cssText = `
      background-color: #2ecc71;
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