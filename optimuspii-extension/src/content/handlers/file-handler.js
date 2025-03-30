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
  // Get the active file upload policy for this domain
  const fileUploadPolicy = controller.activePolicies.fileUploadProtection;

  // Skip processing if no file upload policy is active or monitoring is disabled
  if (!fileUploadPolicy || !controller.isMonitoringEnabled) return true;

  // Get policy configuration
  const mode = fileUploadPolicy.policyConfig.mode;
  const blockedExtensions = fileUploadPolicy.policyConfig.blockedExtensions || [];

  // Skip if policy is in disabled mode
  if (mode === "disabled") return true;

  const fileInput = event.currentTarget;

  if (fileInput.files && fileInput.files.length > 0) {
    const blockedFiles = checkForBlockedFileTypes(fileInput.files, blockedExtensions);

    // If there are blocked files
    if (blockedFiles.length > 0) {
      // Save the original files for alert-only mode
      const originalFiles = Array.from(fileInput.files);

      // Handle based on mode from policy
      switch (mode) {
        case "interactive":
          // Include the policy for reference in the popup
          showBlockedFilePopup(fileInput, blockedFiles, originalFiles, controller, fileUploadPolicy);
          break;

        case "block-and-alert":
          event.preventDefault();
          event.stopPropagation();
          fileInput.value = '';
          showNotification(`File upload blocked: Sensitive file types detected (Policy: ${fileUploadPolicy.policyName})`);
          break;

        case "alert-only":
          showNotification(`Warning: Uploading sensitive file types: ${blockedFiles.join(", ")} (Policy: ${fileUploadPolicy.policyName})`);
          // Don't prevent default - let the upload continue
          return true;

        case "silent-block":
          event.preventDefault();
          event.stopPropagation();
          fileInput.value = '';
          break;

        case "warn-only":
          showNotification(`Warning: Potentially sensitive file types detected (Policy: ${fileUploadPolicy.policyName})`);
          break;

        default:
          return true;
      }

      return false;
    }
  }

  return true;
}