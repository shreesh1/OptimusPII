/**
 * Handler for file upload events
 */

import { checkForBlockedFileTypes } from '../services/file-scanner.js';
import { showBlockedFilePopup } from '../components/popups.js';
import { showNotification } from '../components/notifications.js';

/**
 * Add listeners for file inputs
 * @param {HTMLInputElement} element - File input element
 * @param {Object} controller - Controller instance
 */
export function addFileInputListeners(element, controller) {
  if (element.tagName === 'INPUT' && element.type === 'file') {
    // Remove any existing listeners to avoid duplicates
    element.removeEventListener('change', handleFileUploadWrapper, true);

    // Add the listener with controller context
    element.addEventListener('change', handleFileUploadWrapper, true);

    // Store controller reference on the element
    element._piiController = controller;
  }
}

/**
 * Wrapper function to handle file upload events
 * @param {Event} event - File input change event
 */
function handleFileUploadWrapper(event) {
  // Skip processing if this is our programmatically triggered event with override flag
  if (event._piiAllowOverride) {
    return true;
  }
  
  if (event.currentTarget.value.length > 0) {
    const controller = event.currentTarget._piiController;
    if (controller) {
      return handleFileUpload(event, controller);
    }
    return true;
  }
}

/**
 * Handle file upload events
 * @param {Event} event - File input change event
 * @param {Object} controller - Controller instance
 * @returns {boolean} Whether to allow the upload
 */
export function handleFileUpload(event, controller) {
  // Skip processing if monitoring is disabled
  if (controller.config.mode === "disabled" || !controller.isMonitoringEnabled) return true;

  const fileInput = event.currentTarget;

  if (fileInput.files && fileInput.files.length > 0) {
    const blockedFiles = checkForBlockedFileTypes(fileInput.files, controller.config.blockFileTypes);

    // If there are blocked files
    if (blockedFiles.length > 0) {
      // Save the original files for alert-only mode
      const originalFiles = Array.from(fileInput.files);

      // Handle based on mode
      switch (controller.config.mode) {
        case "interactive":
          showBlockedFilePopup(fileInput, blockedFiles, originalFiles, controller);
          break;

        case "block-and-alert":
          event.preventDefault();
          event.stopPropagation();
          fileInput.value = '';
          showNotification("File upload blocked: Sensitive file types detected");
          break;

        case "alert-only":
          showNotification(`Warning: Uploading sensitive file types: ${blockedFiles.join(", ")}`);
          // Don't prevent default - let the upload continue
          return true;

        case "silent-block":
          event.preventDefault();
          event.stopPropagation();
          fileInput.value = '';
          break;

        case "warn-only":
          showNotification("Warning: Potentially sensitive file types detected");
          break;

        default:
          return true;
      }

      return false;
    }
  }

  return true;
}