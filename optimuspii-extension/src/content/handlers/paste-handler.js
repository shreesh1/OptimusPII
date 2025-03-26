/**
 * Handler for paste events
 */

import { detectSensitiveInformation } from '../services/detection.js';
import { showInteractivePopup } from '../components/popups.js';
import { showNotification } from '../components/notifications.js';
import { pasteTo } from '../utils/dom.js';
import { createRedactedText } from '../services/detection.js';

/**
 * Handle paste events
 * @param {Event} event - Paste event
 * @param {Object} controller - Controller instance
 * @returns {boolean} Whether to allow the paste
 */
export function handlePaste(event, controller) {
  // Skip processing if monitoring is disabled
  if (controller.config.mode === "disabled" || !controller.isMonitoringEnabled) return true;
  
  // Get pasted text
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return true;
  
  const text = clipboardData.getData('text');
  if (!text) return true;
  
  // Detect sensitive information
  const result = detectSensitiveInformation(text, controller.config.regexPatterns);
  
  // If no sensitive information found, allow paste
  if (Object.keys(result.patternMatches).length === 0) return true;

   // Store sample data for use in the popup
   const patternSamples = {};
   for (const [name,_matchedItems] of Object.entries(result.patternMatches)) {
     patternSamples[name] = controller.config.regexPatterns[name].sampleData || "REDACTED";
   }
  
  // Handle based on mode
  switch (controller.config.mode) {
    case "interactive":
      // Store pending event for interactive handling
      controller.pendingPasteEvent = {
        text,
        target: event.target,
        patternMatches: result.patternMatches,
        samples: patternSamples,
        patternObjects: result.patternObjects
      };
      
      // Show popup
      showInteractivePopup(controller);
      
      // Prevent default paste
      event.preventDefault();
      event.stopPropagation();
      return false;
      
    case "block-and-alert":
      // Show notification
      showNotification("Paste blocked: Sensitive information detected");
      
      // Prevent default paste
      event.preventDefault();
      event.stopPropagation();
      return false;
      
    case "redact-and-paste":
      // Create redacted version
      const redactedText = createRedactedText(text, result.patternMatches, result.samples);
      
      // Replace paste with redacted version
      pasteTo(event.target, redactedText);
      
      // Show notification
      showNotification("Sensitive information redacted from paste");
      
      // Prevent default paste
      event.preventDefault();
      event.stopPropagation();
      return false;
      
    case "warn-only":
      // Allow paste but show notification
      showNotification("Warning: Sensitive information detected in paste");
      return true;
      
    default:
      return true;
  }
}