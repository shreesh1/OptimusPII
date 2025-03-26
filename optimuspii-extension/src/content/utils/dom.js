/**
 * DOM utility functions
 */

import { handlePaste } from '../handlers/paste-handler.js';
import { addFileInputListeners } from '../handlers/file-handler.js';

/**
 * Add event listeners to an element
 * @param {HTMLElement} element - Element to add listeners to
 * @param {Object} controller - Controller instance
 */
export function addListenersToElement(element, controller) {
  element.addEventListener('paste', event => handlePaste(event, controller), true);
}

/**
 * Set up mutation observer to monitor DOM changes
 * @param {Object} controller - Controller instance
 */
export function setupDOMObserver(controller) {
  controller.observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const newNode = mutation.addedNodes[i];
          if (newNode.nodeType === 1) { // Element node
            // Monitor inputs and contenteditable elements
            if ((newNode.tagName === 'INPUT' || newNode.tagName === 'TEXTAREA') ||
                newNode.getAttribute('contenteditable') === 'true') {
              addListenersToElement(newNode, controller);
            }

            // Check for file inputs
            if (newNode.tagName === 'INPUT' && newNode.type === 'file') {
              addFileInputListeners(newNode, controller);
            }

            // Check children
            newNode.querySelectorAll('input, textarea, [contenteditable="true"]')
              .forEach(element => addListenersToElement(element, controller));
              
            newNode.querySelectorAll('input[type="file"]')
              .forEach(element => addFileInputListeners(element, controller));
          }
        }
      }
    });
  });

  // Start observing once the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    controller.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Animate popup entrance
 * @param {HTMLElement} popup - Popup element
 */
export function animatePopup(popup) {
  // Start with opacity 0
  popup.style.opacity = '0';

  // Trigger reflow to enable animation
  void popup.offsetWidth;

  // Animate to opacity 1
  popup.style.opacity = '1';
}

/**
 * Paste text to a target element
 * @param {HTMLElement} target - Target element
 * @param {string} text - Text to paste
 */
export function pasteTo(target, text) {
  
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const value = target.value || '';

    target.value =
      value.substring(0, start) +
      text +
      value.substring(end);

    target.selectionStart = target.selectionEnd = start + text.length;
  } else if (target.isContentEditable) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}