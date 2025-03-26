/**
 * Popup UI components
 */

import { showNotification } from './notifications.js';
import { animatePopup } from '../utils/dom.js';
import { pasteTo } from '../utils/dom.js';
import { createRedactedText } from '../services/detection.js';

/**
 * Create the popup container
 * @returns {HTMLElement} Popup container
 */
export function createPopupContainer() {
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
  return popup;
}

/**
 * Show interactive popup for sensitive data detection
 * @param {Object} controller - Controller instance
 */
/**
 * Show interactive popup for sensitive data detection
 * @param {Object} controller - Controller instance
 */
export function showInteractivePopup(controller) {
  // Remove any existing popup
  const existingPopup = document.getElementById('pii-detector-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  if (controller.popupDismissTimeout) {
    clearTimeout(controller.popupDismissTimeout);
  }

  // Create popup container
  const popup = createPopupContainer();
  popup.id = 'pii-detector-popup';

  // Determine what types of PII were detected
  const detectedPatterns = Object.keys(controller.pendingPasteEvent.patternMatches);

  // Set appropriate header text
  let headerText = 'Sensitive Information Detected';
  if (detectedPatterns.length === 1) {
    headerText = `${detectedPatterns[0]} Detected`;
  } else if (detectedPatterns.length > 1) {
    headerText = 'Multiple PII Types Detected';
  }

  // Create header
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
    controller.pendingPasteEvent = null;
  });
  header.appendChild(closeButton);

  // Create content
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    max-height: 300px;
    color: #333;
  `;

  const message = document.createElement('p');
  message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
  message.textContent = `This paste contains ${detectedPatterns.join(", ").replace(/,([^,]*)$/, " and$1")}:`;
  content.appendChild(message);


  let highlightedText = controller.pendingPasteEvent.text;

  const allMatches = [];

  function doesOverlap(newMatch, existingMatches) {
    for (const match of existingMatches) {
      // Check if the new match overlaps with any existing match
      if (!(newMatch.end <= match.start || newMatch.start >= match.end)) {
        return true;
      }
    }
    return false;
  }

  // Collect all matches for each pattern
  let patternIndex = 0;
  for (const [name, regex] of Object.entries(controller.pendingPasteEvent.patternObjects)) {
    const { bg, color } = controller.colorPalette[patternIndex % controller.colorPalette.length];
    patternIndex++;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(controller.pendingPasteEvent.text)) !== null) {
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

  // Apply replacements from end to beginning
  highlightedText = controller.pendingPasteEvent.text;
  for (const match of allMatches) {
    highlightedText =
      highlightedText.substring(0, match.start) +
      match.replacement +
      highlightedText.substring(match.end);
  }

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
      const textBefore = document.createTextNode(controller.pendingPasteEvent.text.substring(lastIndex, match.start));
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
  if (lastIndex < controller.pendingPasteEvent.text.length) {
    const textAfter = document.createTextNode(text.substring(lastIndex));
    fragment.appendChild(textAfter);
  }

  highlightedContent.appendChild(fragment);
  content.appendChild(highlightedContent);



  // Create buttons
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

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    ${buttonBaseStyle}
    background-color: white;
    color: #333;
    border: 1px solid #ddd;
  `;
  cancelButton.addEventListener('mouseenter', () => {
    cancelButton.style.backgroundColor = '#f5f5f5';
  });
  cancelButton.addEventListener('mouseleave', () => {
    cancelButton.style.backgroundColor = 'white';
  });
  cancelButton.addEventListener('click', () => {
    popup.remove();
    controller.pendingPasteEvent = null;
  });

  // Redact button
  const redactButton = document.createElement('button');
  redactButton.textContent = 'Redact & Paste';
  redactButton.style.cssText = `
    ${buttonBaseStyle}
    background-color: #ffab40;
    color: white;
  `;
  redactButton.addEventListener('mouseenter', () => {
    redactButton.style.opacity = '0.9';
  });
  redactButton.addEventListener('mouseleave', () => {
    redactButton.style.opacity = '1';
  });
  redactButton.addEventListener('click', () => {
    if (controller.pendingPasteEvent) {
      const redactedText = createRedactedText(
        controller.pendingPasteEvent.text,
        controller.pendingPasteEvent.patternMatches,
        controller.pendingPasteEvent.samples
      );

      pasteTo(controller.pendingPasteEvent.target, redactedText);
      showNotification('Sensitive information redacted');

      popup.remove();
      controller.pendingPasteEvent = null;
    }
  });

  // Paste anyway button
  const pasteButton = document.createElement('button');
  pasteButton.textContent = 'Paste Anyway';
  pasteButton.style.cssText = `
    ${buttonBaseStyle}
    background-color: #e74c3c;
    color: white;
  `;
  pasteButton.addEventListener('mouseenter', () => {
    pasteButton.style.opacity = '0.9';
  });
  pasteButton.addEventListener('mouseleave', () => {
    pasteButton.style.opacity = '1';
  });
  pasteButton.addEventListener('click', () => {
    if (controller.pendingPasteEvent) {
      pasteTo(controller.pendingPasteEvent.target, controller.pendingPasteEvent.text);
      showNotification('Original text pasted with sensitive information');

      popup.remove();
      controller.pendingPasteEvent = null;
    }
  });

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(redactButton);
  buttonContainer.appendChild(pasteButton);

  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(buttonContainer);

  // Add popup to body
  document.body.appendChild(popup);
  animatePopup(popup);

  // Auto-dismiss after 10 seconds if no action
  controller.popupDismissTimeout = setTimeout(() => {
    if (document.body.contains(popup)) {
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%, -48%)';

      setTimeout(() => {
        if (document.body.contains(popup)) {
          popup.remove();
          controller.pendingPasteEvent = null;
          showNotification('Paste blocked (timed out)');
        }
      }, 200);
    }
  }, 10000);
}

/**
 * Show popup for blocked file uploads
 * @param {HTMLInputElement} fileInput - File input element
 * @param {Array} blockedFiles - List of blocked files
 * @param {Array} originalFiles - Original file list
 * @param {Object} controller - Controller instance
 */
export function showBlockedFilePopup(fileInput, blockedFiles, originalFiles, controller) {
  // Remove any existing popup
  const existingPopup = document.getElementById('pii-blocker-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = createPopupContainer();

  // Create header
  const header = createBlockedFileHeader(popup, fileInput);

  // Create content
  const content = createBlockedFileContent(blockedFiles);

  // Create action buttons
  const buttonContainer = createBlockedFileButtons(popup, fileInput, originalFiles, controller);

  // Clear the file input to block the upload initially
  fileInput.value = '';
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(buttonContainer);

  // Add popup to body
  document.body.appendChild(popup);
  animatePopup(popup);

}

/**
 * Create header for blocked file popup
 * @param {HTMLElement} popup - Popup container
 * @param {HTMLInputElement} fileInput - File input element
 * @returns {HTMLElement} Header element
 */
function createBlockedFileHeader(popup, fileInput) {
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
  header.textContent = 'Sensitive File Upload Detected';

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
    fileInput.value = '';
  });
  header.appendChild(closeButton);

  return header;
}

/**
 * Create content for blocked file popup
 * @param {Array} blockedFiles - List of blocked files
 * @returns {HTMLElement} Content element
 */
function createBlockedFileContent(blockedFiles) {
  const content = document.createElement('div');
  content.style.cssText = `
        padding: 20px;
        overflow-y: auto;
        max-height: 300px;
        color: #333;
      `;

  const message = document.createElement('p');
  message.style.cssText = 'margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;';
  message.textContent = `You're attempting to upload files that may contain sensitive code or credentials:`;
  content.appendChild(message);

  // Create list of blocked files
  const fileList = document.createElement('ul');
  fileList.style.cssText = `
        margin: 0 0 20px 0;
        padding-left: 20px;
        font-family: monospace;
      `;

  blockedFiles.forEach(file => {
    const listItem = document.createElement('li');
    listItem.textContent = file;
    listItem.style.cssText = `
          margin-bottom: 6px;
          color: #e74c3c;
        `;
    fileList.appendChild(listItem);
  });

  content.appendChild(fileList);

  const warningText = document.createElement('p');
  warningText.style.cssText = 'margin: 0; font-size: 14px; line-height: 1.5; color: #666;';
  warningText.textContent = `Code files may contain API keys, credentials, or other sensitive information.`;
  content.appendChild(warningText);

  return content;
}

/**
 * Create buttons for blocked file popup
 * @param {HTMLElement} popup - Popup container
 * @param {HTMLInputElement} fileInput - File input element
 * @param {Array} originalFiles - Original file list
 * @param {Object} controller - Controller instance
 * @returns {HTMLElement} Button container
 */
function createBlockedFileButtons(popup, fileInput, originalFiles, controller) {
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

  // Block upload button
  const blockButton = document.createElement('button');
  blockButton.textContent = 'Block Upload';
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
    showNotification('File upload blocked: Sensitive file types detected');
  });

  // Allow upload button
  const allowButton = document.createElement('button');
  allowButton.textContent = 'Allow Upload';
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
    // Create a new DataTransfer object to reconstruct the FileList
    const dataTransfer = new DataTransfer();
    originalFiles.forEach(file => dataTransfer.items.add(file));
    
    // Remove the popup before setting files to prevent potential re-triggering
    popup.remove();
    
    // Set the files back to the input
    fileInput.files = dataTransfer.files;
    
    // Show notification
    showNotification('File upload allowed');
    
    // Use a timeout to ensure our event handling completes first
    setTimeout(() => {
      // Trigger change event with a flag to bypass our handler
      const changeEvent = new Event('change', { bubbles: true });
      changeEvent._piiAllowOverride = true; // Custom flag
      fileInput.dispatchEvent(changeEvent);
    }, 0);
  });

  buttonContainer.appendChild(blockButton);
  buttonContainer.appendChild(allowButton);

  return buttonContainer;
}