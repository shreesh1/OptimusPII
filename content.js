// content.js

// Default configuration
let config = {
  mode: "interactive",
  customRegexPatterns: {} // Add storage for custom patterns
};

// Load configuration from storage
browser.storage.local.get(['mode', 'customRegexPatterns']).then((result) => {
  if (result.mode) {
    config.mode = result.mode;
    console.log('PII blocker mode:', config.mode);
  }
  if (result.customRegexPatterns) {
    config.customRegexPatterns = result.customRegexPatterns;
    console.log('Custom regex patterns loaded:', Object.keys(config.customRegexPatterns));
  }
});

// Listen for changes to configuration
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.mode) {
      config.mode = changes.mode.newValue;
      console.log('PII blocker mode updated:', config.mode);
    }
    if (changes.customRegexPatterns) {
      config.customRegexPatterns = changes.customRegexPatterns.newValue;
      console.log('Custom regex patterns updated:', Object.keys(config.customRegexPatterns));
    }
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

  // Prepare collection for custom regex matches
  const customMatches = {};
  
  // Create RegExp objects from custom patterns
  const customRegexes = {};
  for (const [name, pattern] of Object.entries(config.customRegexPatterns)) {
    try {
      // Extract the pattern and flags if provided in format /pattern/flags
      const patternMatch = pattern.match(/^\/(.*)\/([gimuy]*)$/);
      if (patternMatch) {
        customRegexes[name] = new RegExp(patternMatch[1], patternMatch[2] + 'g'); // Add 'g' flag if missing
      } else {
        customRegexes[name] = new RegExp(pattern, 'g');
      }
      customMatches[name] = pastedText.match(customRegexes[name]) || [];
    } catch (error) {
      console.error(`Invalid regex pattern for "${name}":`, error);
      customMatches[name] = [];
    }
  }

  // Find all sensitive data
  const emails = pastedText.match(emailRegex) || [];
  const creditCards = pastedText.match(creditCardRegex) || [];
  const phoneNumbers = pastedText.match(phoneRegex) || [];
  const ssns = pastedText.match(ssnRegex) || [];

  // Check if any custom pattern matched
  const hasCustomMatch = Object.values(customMatches).some(matches => matches.length > 0);

  // Check if the pasted content contains sensitive data
  if (emails.length > 0 || creditCards.length > 0 || phoneNumbers.length > 0 || ssns.length > 0 || hasCustomMatch) {
    // Determine the type of PII for notification messages
    const piiTypes = [];
    if (emails.length > 0) piiTypes.push("email");
    if (creditCards.length > 0) piiTypes.push("credit card");
    if (phoneNumbers.length > 0) piiTypes.push("phone number");
    if (ssns.length > 0) piiTypes.push("SSN");
    
    // Add custom match types
    for (const [name, matches] of Object.entries(customMatches)) {
      if (matches.length > 0) {
        piiTypes.push(name);
      }
    }
    
    const piiMessage = piiTypes.join(", ").replace(/,([^,]*)$/, " and$1");

    // Log the detection (happens in all non-disabled modes)
    console.log(`${piiMessage} detected in paste:`, pastedText);

    // Handle based on mode
    switch (config.mode) {
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
        showInteractivePopup(pastedText, {
          email: emailRegex,
          creditCard: creditCardRegex,
          phone: phoneRegex,
          ssn: ssnRegex,
          custom: customRegexes
        });
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

function showInteractivePopup(text, patterns = {}) {
  // Remove any existing popup
  const existingPopup = document.getElementById('pii-blocker-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Clear any existing timeout
  if (popupDismissTimeout) {
    clearTimeout(popupDismissTimeout);
  }

  // Create popup container with minimalist design
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

  // Determine what types of PII were detected
  const hasEmails = patterns.email && text.match(patterns.email) !== null;
  const hasCardNumbers = patterns.creditCard && text.match(patterns.creditCard) !== null;
  const hasPhoneNumbers = patterns.phone && text.match(patterns.phone) !== null;
  const hasSSNs = patterns.ssn && text.match(patterns.ssn) !== null;
  
  // Check for custom regex matches
  const customMatches = {};
  for (const [name, regex] of Object.entries(patterns.custom || {})) {
    customMatches[name] = text.match(regex) !== null;
  }
  
  // Count total PII types detected
  const piiCount = (hasEmails ? 1 : 0) + 
                  (hasCardNumbers ? 1 : 0) + 
                  (hasPhoneNumbers ? 1 : 0) + 
                  (hasSSNs ? 1 : 0) + 
                  Object.values(customMatches).filter(Boolean).length;
  
  let headerText = 'Sensitive Information Detected';
  if (piiCount === 1) {
    if (hasEmails) headerText = 'Email Address Detected';
    else if (hasCardNumbers) headerText = 'Credit Card Number Detected';
    else if (hasPhoneNumbers) headerText = 'Phone Number Detected';
    else if (hasSSNs) headerText = 'Social Security Number Detected';
    else {
      for (const [name, matched] of Object.entries(customMatches)) {
        if (matched) {
          headerText = `${name} Detected`;
          break;
        }
      }
    }
  } else {
    headerText = 'Multiple PII Types Detected';
  }

  // Create popup header with minimalist design
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
    pendingPasteEvent = null;
  });
  header.appendChild(closeButton);

  // Create content area
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    max-height: 300px;
    color: #333;
  `;

  // Replace sensitive information with highlighted spans
  let highlightedText = text;
  
  // Create an array to store all matches and their replacement info
  const allMatches = [];
  
  // Helper function to check for overlapping matches
  function doesOverlap(newMatch, existingMatches) {
    for (const match of existingMatches) {
      // Check if the new match overlaps with any existing match
      if (!(newMatch.end <= match.start || newMatch.start >= match.end)) {
        return true;
      }
    }
    return false;
  }
  
  // Collect all matches
  if (hasCardNumbers) {
    let match;
    while ((match = patterns.creditCard.exec(text)) !== null) {
      const newMatch = {
        start: match.index,
        end: match.index + match[0].length,
        replacement: `<mark style="background-color: #FFF3F3; color: #E53935; padding: 2px 4px; border-radius: 2px; font-weight: normal;">${match[0]}</mark>`,
        original: match[0],
        priority: 10 // Higher priority for credit cards
      };
      
      if (!doesOverlap(newMatch, allMatches)) {
        allMatches.push(newMatch);
      }
    }
    // Reset regex lastIndex
    patterns.creditCard.lastIndex = 0;
  }

  if (hasPhoneNumbers) {
    let match;
    while ((match = patterns.phone.exec(text)) !== null) {
      const newMatch = {
        start: match.index,
        end: match.index + match[0].length,
        replacement: `<mark style="background-color: #E8F4FD; color: #1976D2; padding: 2px 4px; border-radius: 2px; font-weight: normal;">${match[0]}</mark>`,
        original: match[0],
        priority: 5
      };
      
      if (!doesOverlap(newMatch, allMatches)) {
        allMatches.push(newMatch);
      }
    }
    // Reset regex lastIndex
    patterns.phone.lastIndex = 0;
  }

  if (hasSSNs) {
    let match;
    while ((match = patterns.ssn.exec(text)) !== null) {
      const newMatch = {
        start: match.index,
        end: match.index + match[0].length,
        replacement: `<mark style="background-color: #F5F0FC; color: #7B1FA2; padding: 2px 4px; border-radius: 2px; font-weight: normal;">${match[0]}</mark>`,
        original: match[0],
        priority: 15 // Highest priority for SSNs
      };
      
      if (!doesOverlap(newMatch, allMatches)) {
        allMatches.push(newMatch);
      }
    }
    // Reset regex lastIndex
    patterns.ssn.lastIndex = 0;
  }

  if (hasEmails) {
    let match;
    while ((match = patterns.email.exec(text)) !== null) {
      const newMatch = {
        start: match.index,
        end: match.index + match[0].length,
        replacement: `<mark style="background-color: #FFFDE7; color: #F57F17; padding: 2px 4px; border-radius: 2px; font-weight: normal;">${match[0]}</mark>`,
        original: match[0],
        priority: 8
      };
      
      if (!doesOverlap(newMatch, allMatches)) {
        allMatches.push(newMatch);
      }
    }
    // Reset regex lastIndex
    patterns.email.lastIndex = 0;
  }
  
  // Generate different subtle background colors for custom patterns
  const colorPalette = [
    { bg: '#F1F8E9', color: '#558B2F' },
    { bg: '#E0F2F1', color: '#00796B' },
    { bg: '#FFF8E1', color: '#FF8F00' },
    { bg: '#FBE9E7', color: '#D84315' }
  ];
  
  let colorIndex = 0;
  for (const [name, regex] of Object.entries(patterns.custom || {})) {
    if (customMatches[name]) {
      const { bg, color } = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        const newMatch = {
          start: match.index,
          end: match.index + match[0].length,
          replacement: `<mark style="background-color: ${bg}; color: ${color}; padding: 2px 4px; border-radius: 2px;" title="${name}">${match[0]}</mark>`,
          original: match[0]
        };
        
        if (!doesOverlap(newMatch, allMatches)) {
          allMatches.push(newMatch);
        }
      }
      // Reset regex lastIndex
      regex.lastIndex = 0;
    }
  }
  
  // Process matches in reverse order of their position
  // This ensures we replace from the end of the string first to maintain indices
  allMatches.sort((a, b) => b.start - a.start);
  
  // Apply replacements from end to beginning
  highlightedText = text;
  for (const match of allMatches) {
    highlightedText = 
      highlightedText.substring(0, match.start) + 
      match.replacement + 
      highlightedText.substring(match.end);
  }

  // Create message text
  const detectedTypes = [];
  if (hasEmails) detectedTypes.push("email addresses");
  if (hasCardNumbers) detectedTypes.push("credit card numbers");
  if (hasPhoneNumbers) detectedTypes.push("phone numbers");
  if (hasSSNs) detectedTypes.push("social security numbers");
  
  for (const [name, matched] of Object.entries(customMatches)) {
    if (matched) detectedTypes.push(name);
  }

  const message = document.createElement('p');
  message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
  message.textContent = `This paste contains ${detectedTypes.join(", ").replace(/,([^,]*)$/, " and$1")}:`;
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
  highlightedContent.innerHTML = highlightedText;
  content.appendChild(highlightedContent);

  // Create action buttons with minimalist design
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
    pendingPasteEvent = null;
    showNotification('Paste blocked: Sensitive information detected');
  });

  const allowButton = document.createElement('button');
  allowButton.textContent = 'Allow Paste';
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

    if (pendingPasteEvent && pendingPasteEvent.targetElement) {
      if (pendingPasteEvent.targetElement.tagName === 'INPUT' ||
          pendingPasteEvent.targetElement.tagName === 'TEXTAREA') {
        const start = pendingPasteEvent.targetElement.selectionStart || 0;
        const end = pendingPasteEvent.targetElement.selectionEnd || 0;
        const value = pendingPasteEvent.targetElement.value || '';

        pendingPasteEvent.targetElement.value =
          value.substring(0, start) +
          pendingPasteEvent.text +
          value.substring(end);

        pendingPasteEvent.targetElement.selectionStart =
          pendingPasteEvent.targetElement.selectionEnd =
          start + pendingPasteEvent.text.length;
      } else if (pendingPasteEvent.targetElement.isContentEditable) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const textNode = document.createTextNode(pendingPasteEvent.text);
        range.insertNode(textNode);

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

  // Add subtle animation
  popup.style.opacity = '0';
  popup.style.transform = 'translate(-50%, -48%)';
  popup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  
  setTimeout(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translate(-50%, -50%)';
  }, 10);

  // Auto-dismiss after 10 seconds if no action
  popupDismissTimeout = setTimeout(() => {
    if (document.body.contains(popup)) {
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%, -48%)';
      
      setTimeout(() => {
        if (document.body.contains(popup)) {
          popup.remove();
          pendingPasteEvent = null;
          showNotification('Paste blocked (timed out)');
        }
      }, 200);
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
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(addListenersToElement);
});

// Monitor for new elements being added to the DOM
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
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
document.addEventListener('DOMContentLoaded', function () {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});