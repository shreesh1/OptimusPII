/**
 * Browser API utility functions
 */

/**
 * Get browser API reference
 * @returns {Object} Browser API object
 */
export function getBrowserApi() {
    try {
      return browser || chrome;
    } catch (e) {
      return chrome;
    }
  }