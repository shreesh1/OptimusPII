/**
 * Service for managing browser notifications in the extension
 */
export class NotificationService {
    /**
     * Check if browser notifications are supported and permission is granted
     * @returns {Promise<boolean>} Whether notifications can be displayed
     */
    static async canNotify() {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }
      
      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        return true;
      }
      
      // Check if permission is denied
      if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return false;
      }
      
      // Request permission
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    /**
     * Show a browser notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {Object} options - Additional options
     */
    static async showNotification(title, message, options = {}) {
      const canShow = await this.canNotify();
      
      if (!canShow) return false;

      const result = await chrome.storage.local.get('globalSettings');
      const globalSettings = result.globalSettings || {};
      if (globalSettings && globalSettings?.enableNotifications === false) {
        return false;
      }
      
      const notificationOptions = {
        body: message,
        icon: '/assets/icons/icon-48.png', // Use an appropriate icon path
        badge: '/assets/icons/badge-16.png',
        tag: options.tag || 'optimuspii-notification',
        requireInteraction: options.requireInteraction || false,
        silent: null, 
        ...options
      };
      
      const notification = new Notification(title, notificationOptions);
      
      notification.onclick = () => {
        // Handle click event - open relevant extension page
        if (options.url) {
          chrome.tabs.create({ url: options.url });
        } else {
          chrome.runtime.openOptionsPage();
        }
        notification.close();
      };
      
      return notification;
    }
    
    /**
     * Show a notification for a specific alert type
     * @param {Object} alert - Alert object
     */
    static async notifyFromAlert(alert) {
      let title, message, icon, url;
      
      switch (alert.type) {
        case 'phishing':
          title = 'Phishing Threat Detected';
          message = alert.title || 'A phishing attempt was blocked';
          icon = '/assets/icons/phishing-icon.png';
          url = 'options.html?tab=alerts&filter=phishing';
          break;
          
        case 'network':
          title = 'Network Security Alert';
          message = alert.title || 'Suspicious network activity detected';
          icon = '/assets/icons/network-icon.png';
          url = 'options.html?tab=alerts&filter=network';
          break;
          
        case 'pii':
          title = 'PII Data Alert';
          message = alert.title || 'Personal information was protected';
          icon = '/assets/icons/pii-icon.png';
          url = 'options.html?tab=alerts&filter=pii';
          break;
          
        case 'file':
          title = 'File Security Alert';
          message = alert.title || 'File operation blocked';
          icon = '/assets/icons/file-icon.png';
          url = 'options.html?tab=alerts&filter=file';
          break;
          
        default:
          title = 'Security Alert';
          message = alert.title || 'Security event detected';
          icon = '/assets/icons/icon-48.png';
          url = 'options.html?tab=alerts';
      }
      
      return this.showNotification(title, message, {
        tag: `optimuspii-${alert.type}-${Date.now()}`,
        icon,
        url,
        requireInteraction: false // Keep phishing alerts visible until user interaction
      });
    }
  }