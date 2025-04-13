/**
 * Service for managing logs in the extension
 */
export class LoggingService {

  static LOG_LEVELS = {
    error: 0,
    warning: 1,
    info: 2,
    debug: 3
  };

  static async shouldLog(level) {
    try {
      const result = await chrome.storage.local.get(['globalSettings']);
      const settings = result.globalSettings || { logLevel: 'info' };
      
      // Get numeric values for comparison
      const configuredLevel = this.LOG_LEVELS[settings.logLevel] || 2; // Default to info
      const messageLevel = this.LOG_LEVELS[level] || 2;
      
      // Only log if the message level is less than or equal to the configured level
      // (lower numbers are higher priority in our hierarchy)
      return messageLevel <= configuredLevel;
    } catch (error) {
      console.error('Error checking log level:', error);
      return true; // Default to logging if we can't check the setting
    }
  }

    /**
     * Add a log entry
     * @param {string} level - Log level (error, warning, info, debug)
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {string} details - Additional details (optional)
     */
    static async log(level, category, message, details = null) {
      try {
        // Check if we should log based on current log level setting
        if (!(await this.shouldLog(level))) {
          return;
        }
        
        // Get current logs
        const result = await chrome.storage.local.get(['piilogs']);
        const logs = result.piilogs || [];
        
        // Add new log entry
        const newLog = {
          timestamp: Date.now(),
          level,
          category,
          message,
          details
        };
        
        // Limit to 1000 logs to prevent storage issues
        logs.unshift(newLog); // Add at beginning
        if (logs.length > 1000) {
          logs.pop(); // Remove oldest
        }
        
        // Save back to storage
        await chrome.storage.local.set({ piilogs: logs });
      } catch (error) {
        console.error('Error saving log:', error);
      }
    }
    
    /**
     * Log an error
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {string} details - Additional details (optional)
     */
    static error(category, message, details = null) {
      this.log('error', category, message, details);
      console.error(`[${category}] ${message}`, details || '');
    }
    
    /**
     * Log a warning
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {string} details - Additional details (optional)
     */
    static warning(category, message, details = null) {
      this.log('warning', category, message, details);
    }
    
    /**
     * Log info
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {string} details - Additional details (optional)
     */
    static info(category, message, details = null) {
      this.log('info', category, message, details);
    }
    
    /**
     * Log debug information
     * @param {string} category - Log category
     * @param {string} message - Log message
     * @param {string} details - Additional details (optional)
     */
    static debug(category, message, details = null) {
      this.log('debug', category, message, details);
      console.debug(`[${category}] ${message}`, details || '');
    }
    
    /**
     * Clear all logs
     */
    static async clearLogs() {
      try {
        await chrome.storage.local.set({ piilogs: [] });
      } catch (error) {
        console.error('Error clearing logs:', error);
      }
    }
  }