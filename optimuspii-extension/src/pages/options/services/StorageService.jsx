/**
 * Storage service for handling all Chrome storage operations
 */
export class StorageService {
  /**
   * Gets all policies from storage
   * @returns {Promise<Object>} A promise that resolves to all policies
   */
  static async getAllPolicies() {
    const result = await chrome.storage.local.get(['policies']);
    return result.policies || {};
  }

  /**
   * Gets all domain mappings from storage
   * @returns {Promise<Array>} A promise that resolves to all domain mappings
   */
  static async getAllDomainMappings() {
    const result = await chrome.storage.local.get(['domainMappings']);
    return result.domainMappings || [];
  }

  /**
   * Gets pattern repository from storage
   * @returns {Promise<Object>} A promise that resolves to pattern repository
   */
  static async getPatternRepository() {
    const result = await chrome.storage.local.get(['regexPatterns']);
    return result.regexPatterns || {};
  }

  /**
   * Creates a new policy with the specified type
   * @param {string} policyType - The type of policy to create
   * @returns {Object} The new policy
   */
  static async createNewPolicy(policyType) {
    const policyId = 'policy_' + Date.now();
    const defaultPolicyNames = {
      'pasteProtection': 'Paste Protection',
      'fileUploadProtection': 'File Upload Protection',
      'fileDownloadProtection': 'File Download Protection'
    };
    
    
    const defaultBlockedExtensions = await this.getFileExtensionRepository();

    // Get patterns asynchronously
    let patternRepository = {};
    try {
      const storageData = await chrome.storage.local.get(['regexPatterns']);
      if (storageData && storageData.regexPatterns) {
        patternRepository = storageData.regexPatterns;
      }
    } catch (error) {
      console.error('Failed to get pattern repository:', error);
    }

    return {
      policyId: policyId,
      policyType: policyType,
      enabled: true,
      policyConfig: {
        mode: 'interactive',
        enabledPatterns: policyType === 'pasteProtection' ? Object.values(patternRepository) : [],
        blockedExtensions: defaultBlockedExtensions
      }
    };
  }

  /**
   * Saves a policy to storage
   * @param {Object} policy - The policy to save
   * @param {Object} allPolicies - All existing policies
   * @returns {Promise} A promise that resolves when the policy is saved
   */
  static async savePolicy(policy, allPolicies) {
    const policies = { ...allPolicies };
    policies[policy.policyId] = policy;
    await chrome.storage.local.set({ policies });
    return policies;
  }

  /**
   * Deletes a policy from storage
   * @param {string} policyId - The ID of the policy to delete
   * @param {Object} allPolicies - All existing policies
   * @param {Array} allDomainMappings - All existing domain mappings
   * @returns {Promise} A promise that resolves with updated data
   */
  static async deletePolicy(policyId, allPolicies, allDomainMappings) {
    const policies = { ...allPolicies };
    if (!policies[policyId]) {
      return { policies, domainMappings: allDomainMappings };
    }
    if (policyId == 'default-file-upload-policy' || policyId == 'default-paste-policy') {
      return { policies, domainMappings: allDomainMappings };
    }
    // Remove policy from domain mappings
    const updatedDomainMappings = allDomainMappings.map(mapping => ({
      ...mapping,
      appliedPolicies: mapping.appliedPolicies.filter(id => id !== policyId)
    }));

    await chrome.storage.local.set({
      policies,
      domainMappings: updatedDomainMappings
    });

    return { policies, domainMappings: updatedDomainMappings };
  }

  /**
   * Saves a domain mapping to storage and registers content scripts
   * @param {Object} mapping - The domain mapping to save
   * @param {Array} allDomainMappings - All existing domain mappings
   * @returns {Promise} A promise that resolves with updated mappings
   */
  static async saveDomainMapping(mapping, allDomainMappings) {
    const mappings = [...allDomainMappings];
    const existingIndex = mappings.findIndex(m => m.domainPattern === mapping.domainPattern);

    if (existingIndex >= 0) {
      mappings[existingIndex] = mapping;
    } else {
      mappings.push(mapping);
    }

    await chrome.storage.local.set({ domainMappings: mappings });

    // Extract domain patterns and register content scripts
    const contentUrls = mappings.map(m => m.domainPattern);
    await window.OptimusPII.registerContentScriptsForUrls(contentUrls);

    return mappings;
  }

  /**
   * Deletes a domain mapping from storage and updates content scripts
   * @param {string} domainPattern - The domain pattern to delete
   * @param {Array} allDomainMappings - All existing domain mappings
   * @returns {Promise} A promise that resolves with updated mappings
   */
  static async deleteDomainMapping(domainPattern, allDomainMappings) {
    const updatedMappings = allDomainMappings.filter(m => m.domainPattern !== domainPattern);
    await chrome.storage.local.set({ domainMappings: updatedMappings });

    const contentUrls = updatedMappings.map(m => m.domainPattern);
    await window.OptimusPII.registerContentScriptsForUrls(contentUrls);

    return updatedMappings;
  }

  /**
   * Saves pattern repository to storage
   * @param {Object} pattern - The pattern to save
   * @param {Object} allPatterns - All existing patterns
   * @returns {Promise} A promise that resolves when saved
   */
  static async savePatternRepository(pattern, allPatterns) {
    console.log('Saving pattern:', pattern);
    console.log('All patterns:', allPatterns);

    // All Patterns is an object, so instead of using a find index we can just check if the pattern name exists in the object

    const existingPattern = allPatterns[pattern.name];

    console.log('Saving pattern:', pattern);

    if (existingPattern == null) {
      if (!pattern.hasOwnProperty('isGlobal')) {
        pattern.isGlobal = true;
      }
      allPatterns[pattern.name] = pattern;
    } else {
      // Preserve isGlobal flag from existing pattern if not explicitly set
      if (!pattern.hasOwnProperty('isGlobal') && existingPattern.hasOwnProperty('isGlobal')) {
        pattern.isGlobal = existingPattern.isGlobal;
      }
      allPatterns[pattern.name] = pattern;
    }

    console.log('Updated patterns:', allPatterns);
    await chrome.storage.local.set({ regexPatterns: allPatterns });
    return allPatterns;
  }

  /**
   * Deletes a pattern from storage
   * @param {string} patternName - The pattern name to delete
   * @returns {Promise<Object>} A promise that resolves to updated patterns
   */
  static async deletePattern(patternName) {
    const allPatterns = await this.getPatternRepository();

    if (allPatterns[patternName]) {
      delete allPatterns[patternName];
    }

    await chrome.storage.local.set({ regexPatterns: allPatterns });
    return allPatterns;
  }

  /**
   * Gets user theme preference from storage
   * @returns {Promise<string>} A promise that resolves to theme ('light' or 'dark')
   */
  static async getThemePreference() {
    const result = await chrome.storage.local.get(['themePreference']);
    return result.themePreference || 'light';
  }

  /**
   * Saves user theme preference to storage
   * @param {string} theme - The theme preference ('light' or 'dark')
   * @returns {Promise} A promise that resolves when saved
   */
  static async saveThemePreference(theme) {
    return chrome.storage.local.set({ themePreference: theme });
  }

  static async loadOptions() {
    try {
      const [policies, domainMappings, patterns, themePreference, fileExtensions, globalSettings] = await Promise.all([
        this.getAllPolicies(),
        this.getAllDomainMappings(),
        this.getPatternRepository(),
        this.getThemePreference(),
        this.getFileExtensionRepository(),
        this.getGlobalSettings()
      ]);

      return {
        policies,
        domainMappings,
        patterns,
        themePreference,
        fileExtensions,
        globalSettings
      };
    } catch (error) {
      console.error('Error loading options:', error);
      throw error;
    }
  }

  // Updated to include theme preference
  static async saveAllOptions({ policies, domainMappings, patterns, themePreference, globalSettings }) {
    try {
      await chrome.storage.local.set({
        policies,
        domainMappings,
        regexPatterns: patterns,
        themePreference,
        globalSettings
      });
      return true;
    } catch (error) {
      console.error('Error saving options:', error);
      throw error;
    }
  }

  /**
 * Save file extension repository to storage
 * @param {Array} extensions - Array of file extensions to save
 * @returns {Promise} A promise that resolves when saved
 */
  static async saveFileExtensionRepository(extensions) {
    console.log('Saving file extensions:', extensions);

    await chrome.storage.local.set({ blockFileTypes: extensions });
    return extensions;
  }

  /**
   * Get file extension repository from storage
   * @returns {Promise<Array>} A promise that resolves with the file extensions
   */
  static async getFileExtensionRepository() {
    const result = await chrome.storage.local.get('blockFileTypes');
    return result.blockFileTypes || [];
  }

  static async getGlobalSettings() {
    const result = await chrome.storage.local.get('globalSettings');
    return result.globalSettings || {};
  }

}

