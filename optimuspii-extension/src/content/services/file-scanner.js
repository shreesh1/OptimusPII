/**
 * File scanning service
 */

// Default blocked file extensions
const DEFAULT_BLOCKED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', 
    '.php', '.py', '.rb', '.env',
    '.config', '.yml', '.yaml', '.json',
    '.sh', '.bash', '.zsh', '.conf',
    '.htaccess', '.htpasswd'
  ];
  
  /**
   * Check for blocked file types
   * @param {FileList} files - Files to check
   * @param {Array} customBlocklist - Custom list of blocked extensions
   * @returns {Array} List of blocked file descriptions
   */
  export function checkForBlockedFileTypes(files, customBlocklist = []) {
    const blockedExtensions = customBlocklist.length > 0 
      ? customBlocklist 
      : DEFAULT_BLOCKED_EXTENSIONS;
    
    const blockedFiles = [];
    
    // Check each file extension
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      
      // If the file extension is in the blocked list
      if (blockedExtensions.includes(fileExtension)) {
        blockedFiles.push(`${fileName} (${fileExtension})`);
      }
    }
    
    return blockedFiles;
  }