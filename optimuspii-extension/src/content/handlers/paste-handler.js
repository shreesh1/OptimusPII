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
  // Get the active paste policy for this domain
  const pastePolicy = controller.activePolicies.pasteProtection;
  
  // Skip processing if no paste policy is active or monitoring is disabled
  if (!pastePolicy || !controller.isMonitoringEnabled) return true;
  
  // Get policy configuration
  const mode = pastePolicy.policyConfig.mode;
  const enabledPatterns = pastePolicy.policyConfig.enabledPatterns || [];
  
  // Skip if policy is in disabled mode
  if (mode === "disabled") return true;
  
  // Get pasted text
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return true;
  
  const text = clipboardData.getData('text');
  if (!text) return true;
  
  // Filter regex patterns based on enabled patterns in policy
  const filteredPatterns = {};
  for (const patternName of enabledPatterns) {
    if (controller.regexPatterns[patternName]) {
      filteredPatterns[patternName] = controller.regexPatterns[patternName];
    }
  }
  
  // Detect sensitive information using filtered patterns
  const result = detectSensitiveInformation(text, filteredPatterns);
  
  // If no sensitive information found, allow paste
  if (Object.keys(result.patternMatches).length === 0) return true;

  // Store sample data for use in the popup
  const patternSamples = {};
  for (const [name, _matchedItems] of Object.entries(result.patternMatches)) {
    patternSamples[name] = filteredPatterns[name].sampleData || "REDACTED";
  }
  
  // Handle based on mode from policy
  switch (mode) {
    case "interactive":
      // Store pending event for interactive handling
      controller.pendingPasteEvent = {
        text,
        target: event.target,
        patternMatches: result.patternMatches,
        samples: patternSamples,
        patternObjects: result.patternObjects,
        policy: pastePolicy // Include the policy for reference in the popup
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
      showNotification(`Warning: Sensitive information detected in paste (Policy: ${pastePolicy.policyName})`);
      return true;
      
    default:
      return true;
  }
}