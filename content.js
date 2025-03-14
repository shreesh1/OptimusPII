// content.js

(function () {
  // Define browser API reference safely
  let api;
  try {
    if (typeof api == 'undefined') {
      api = (function () {
        try {
          return browser || chrome;
        } catch (e) {
          return chrome;
        }
      })();
    }
  } catch (e) {
    return;
  }

  // Default configuration
  let config = {
    mode: "interactive",
    regexPatterns: {} // Will contain both default and custom patterns
  };

  // Flag to track if monitoring should be active for current URL
  let isMonitoringEnabled = true;

  // Function to check if current URL should be monitored (non-async version)
  function checkIfShouldMonitor() {
    api.storage.local.get('customUrls').then(result => {
      const customUrls = result.customUrls || [];
      const currentUrl = window.location.href;

      // If there are no custom URLs, assume we should keep monitoring
      // (This handles static registrations from manifest.json)
      if (!customUrls || customUrls.length === 0) {
        isMonitoringEnabled = true;
        return;
      }

      // Check if any pattern in customUrls matches the current URL
      isMonitoringEnabled = customUrls.some(urlPattern => {
        // Convert URL pattern to regex (handling wildcards)
        const pattern = urlPattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
        const regex = new RegExp('^' + pattern + '$');
        return regex.test(currentUrl);
      });

    }).catch(error => {
      isMonitoringEnabled = true; // Default to enabled on error
    });
  }

  // Load configuration from storage
  api.storage.local.get(['mode', 'regexPatterns', 'customUrls']).then((result) => {
    if (result.mode) {
      config.mode = result.mode;
    }

    // Load regex patterns or use defaults if not set
    if (result.regexPatterns) {
      config.regexPatterns = result.regexPatterns;
    }

    // Check URL monitoring status
    checkIfShouldMonitor();
  });

  // Listen for changes to configuration
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.mode) {
        config.mode = changes.mode.newValue;
      }
      if (changes.regexPatterns) {
        config.regexPatterns = changes.regexPatterns.newValue;
      }
      if (changes.customUrls) {
        // URL list changed, check if we should still monitor this page
        checkIfShouldMonitor();
      }
    }
  });

  // Store pending paste event for interactive mode
  let pendingPasteEvent = null;
  let popupDismissTimeout = null;

  // Update handlePaste to store sample data when processing matches
  function handlePaste(event) {
    // If the extension is disabled OR URL monitoring is disabled, do nothing
    if (config.mode === "disabled" || !isMonitoringEnabled) {
      return true;
    }

    // Get clipboard data as text
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');

    // Prepare collection for regex patterns and matches
    const patternObjects = {};
    const matches = {};
    let hasMatches = false;

    // Process all enabled regex patterns
    for (const [name, details] of Object.entries(config.regexPatterns)) {
      // Skip disabled patterns
      if (!details.enabled) continue;

      try {
        // Create RegExp object from pattern string
        const patternMatch = details.pattern.match(/^\/(.*)\/([gimuy]*)$/);
        if (patternMatch) {
          patternObjects[name] = new RegExp(patternMatch[1], patternMatch[2] + 'g'); // Add 'g' flag if missing
        } else {
          patternObjects[name] = new RegExp(details.pattern, 'g');
        }

        // Find matches
        const foundMatches = pastedText.match(patternObjects[name]) || [];
        if (foundMatches.length > 0) {
          matches[name] = foundMatches;
          hasMatches = true;
        }

      } catch (error) {
      }
    }

    // Check if the pasted content contains sensitive data
    if (hasMatches) {
      // Determine the types of PII for notification messages
      const piiTypes = Object.keys(matches).filter(key => matches[key].length > 0);
      const piiMessage = piiTypes.join(", ").replace(/,([^,]*)$/, " and$1");

      // Log the detection (happens in all non-disabled modes)

      // Store sample data for use in the popup
      const patternSamples = {};
      for (const [name, matchedItems] of Object.entries(matches)) {
        patternSamples[name] = config.regexPatterns[name].sampleData || "REDACTED";
      }

      // Handle based on mode
      switch (config.mode) {
        case "interactive":
          // Prevent default action until user decision
          event.preventDefault();
          event.stopPropagation();

          // Store the event for later use if user allows paste
          pendingPasteEvent = {
            targetElement: event.target,
            text: pastedText,
            samples: patternSamples,
            patternMatches: matches  // Store matched patterns and their matches
          };

          // Show interactive popup with highlighted sensitive data
          showInteractivePopup(pastedText, patternObjects, patternSamples);
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

  // Modify showInteractivePopup to include a "Paste Sample" button
  function showInteractivePopup(text, patterns = {}, samples = {}) {
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
    const detectedPatterns = Object.keys(patterns).filter(name => {
      return text.match(patterns[name]) !== null;
    });

    let headerText = 'Sensitive Information Detected';
    if (detectedPatterns.length === 1) {
      headerText = `${detectedPatterns[0]} Detected`;
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

    // Generate different subtle background colors for patterns
    const colorPalette = [
      { bg: '#FFF3F3', color: '#E53935' },  // Red (Credit Card)
      { bg: '#E8F4FD', color: '#1976D2' },  // Blue (Phone)
      { bg: '#F5F0FC', color: '#7B1FA2' },  // Purple (SSN)
      { bg: '#FFFDE7', color: '#F57F17' },  // Amber (Email)
      { bg: '#F1F8E9', color: '#558B2F' },  // Light Green
      { bg: '#E0F2F1', color: '#00796B' },  // Teal
      { bg: '#FFF8E1', color: '#FF8F00' },  // Orange
      { bg: '#FBE9E7', color: '#D84315' }   // Deep Orange
    ];

    // Collect all matches for each pattern
    let patternIndex = 0;
    for (const [name, regex] of Object.entries(patterns)) {
      const { bg, color } = colorPalette[patternIndex % colorPalette.length];
      patternIndex++;

      // Reset regex lastIndex
      regex.lastIndex = 0;

      let match;
      while ((match = regex.exec(text)) !== null) {
        const newMatch = {
          start: match.index,
          end: match.index + match[0].length,
          replacement: `<mark style="background-color: ${bg}; color: ${color}; padding: 2px 4px; border-radius: 2px;" title="${name}">${match[0]}</mark>`,
          original: match[0],
          priority: 10,
          name: name
        };

        if (!doesOverlap(newMatch, allMatches)) {
          allMatches.push(newMatch);
        }
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
    const message = document.createElement('p');
    message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
    message.textContent = `This paste contains ${detectedPatterns.join(", ").replace(/,([^,]*)$/, " and$1")}:`;
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

    const fragment = document.createDocumentFragment();
    const textSegments = [];
    let lastIndex = 0;

    // Sort matches by start position (ascending)
    const orderedMatches = [...allMatches].sort((a, b) => a.start - b.start);

    // Create text nodes and highlighted spans
    for (const match of orderedMatches) {
      // Add text before match
      if (match.start > lastIndex) {
        const textBefore = document.createTextNode(text.substring(lastIndex, match.start));
        fragment.appendChild(textBefore);
      }

      // Create highlighted span
      const span = document.createElement('mark');
      span.textContent = match.original;
      span.setAttribute('title', match.name);

      // Extract style from replacement string and apply it
      const styleMatch = match.replacement.match(/style="([^"]+)"/);
      if (styleMatch && styleMatch[1]) {
        span.style.cssText = styleMatch[1];
      }

      fragment.appendChild(span);
      lastIndex = match.end;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      const textAfter = document.createTextNode(text.substring(lastIndex));
      fragment.appendChild(textAfter);
    }

    highlightedContent.appendChild(fragment);
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

    // Add "Paste Sample" button
    const pasteSampleButton = document.createElement('button');
    pasteSampleButton.textContent = 'Paste Redacted';
    pasteSampleButton.style.cssText = `
    ${buttonBaseStyle}
    background-color: white;
    color: #2980b9;
    border: 1px solid #2980b9;
  `;
    pasteSampleButton.addEventListener('mouseenter', () => {
      pasteSampleButton.style.backgroundColor = '#f0f7fc';
    });
    pasteSampleButton.addEventListener('mouseleave', () => {
      pasteSampleButton.style.backgroundColor = 'white';
    });
    pasteSampleButton.addEventListener('click', () => {
      popup.remove();

      if (pendingPasteEvent && pendingPasteEvent.targetElement) {
        // Create a copy of the original text
        let redactedText = pendingPasteEvent.text;

        // For each matched pattern type, replace all matches with the sample data
        for (const [patternName, matches] of Object.entries(pendingPasteEvent.patternMatches)) {
          const sampleValue = pendingPasteEvent.samples[patternName] || "REDACTED";

          // Sort matches by start position in descending order to replace from end to beginning
          const sortedMatches = [...matches].sort((a, b) => {
            const indexA = pendingPasteEvent.text.indexOf(a);
            const indexB = pendingPasteEvent.text.indexOf(b);
            return indexB - indexA;
          });

          // Replace each match with the sample data
          for (const match of sortedMatches) {
            const index = redactedText.indexOf(match);
            if (index !== -1) {
              redactedText = redactedText.substring(0, index) +
                sampleValue +
                redactedText.substring(index + match.length);
            }
          }
        }

        // Now paste the redacted text instead of the original
        if (pendingPasteEvent.targetElement.tagName === 'INPUT' ||
          pendingPasteEvent.targetElement.tagName === 'TEXTAREA') {
          const start = pendingPasteEvent.targetElement.selectionStart || 0;
          const end = pendingPasteEvent.targetElement.selectionEnd || 0;
          const value = pendingPasteEvent.targetElement.value || '';

          pendingPasteEvent.targetElement.value =
            value.substring(0, start) +
            redactedText +
            value.substring(end);

          pendingPasteEvent.targetElement.selectionStart =
            pendingPasteEvent.targetElement.selectionEnd =
            start + redactedText.length;
        } else if (pendingPasteEvent.targetElement.isContentEditable) {
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          range.deleteContents();

          const textNode = document.createTextNode(redactedText);
          range.insertNode(textNode);

          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      pendingPasteEvent = null;
      showNotification('Paste completed with redacted values');
    });

    const allowButton = document.createElement('button');
    allowButton.textContent = 'Paste Original';
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
    buttonContainer.appendChild(pasteSampleButton);
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
})();