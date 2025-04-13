import { NotificationService } from './NotificationService';

/**
 * Service for managing security alerts in the extension
 */
export class AlertService {
    /**
     * Add an alert
     * @param {string} type - Alert type (phishing, network, pii, file)
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {Object} options - Additional options (url, details)
     */
    static async addAlert(type, title, message, options = {}) {
      try {
        // Get current alerts
        const result = await chrome.storage.local.get(['piialerts']);
        const alerts = result.piialerts || [];
        
        // Add new alert
        const newAlert = {
          timestamp: Date.now(),
          type,
          title,
          message,
          ...options
        };
        
        // Limit to 100 alerts to prevent storage issues
        alerts.unshift(newAlert); // Add at beginning
        if (alerts.length > 100) {
          alerts.pop(); // Remove oldest
        }
        
        // Save back to storage
        await chrome.storage.local.set({ piialerts: alerts });
        
        // Show notification for this alert
        await NotificationService.notifyFromAlert(newAlert);
        
        // Return the created alert
        return newAlert;
      } catch (error) {
        console.error('Error saving alert:', error);
        return null;
      }
    }
    
    /**
     * Add a phishing alert
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {string} url - The phishing URL
     * @param {string} details - Additional details
     */
    static async addPhishingAlert(title, message, url, details = null) {
      return this.addAlert('phishing', title, message, { url, details });
    }
    
    /**
     * Add a network alert
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {string} url - The URL involved
     * @param {string} details - Additional details
     */
    static async addNetworkAlert(title, message, url, details = null) {
      return this.addAlert('network', title, message, { url, details });
    }
    
    /**
     * Add a PII detection alert
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {string} details - Additional details
     */
    static async addPIIAlert(title, message, details = null) {
      return this.addAlert('pii', title, message, { details });
    }
    
    /**
     * Add a file operation alert
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {string} filename - The filename involved
     * @param {string} details - Additional details
     */
    static async addFileAlert(title, message, filename = null, details = null) {
      return this.addAlert('file', title, message, { filename, details });
    }
    
    /**
     * Clear all alerts
     */
    static async clearAlerts() {
      try {
        await chrome.storage.local.set({ piialerts: [] });
      } catch (error) {
        console.error('Error clearing alerts:', error);
      }
    }
  }