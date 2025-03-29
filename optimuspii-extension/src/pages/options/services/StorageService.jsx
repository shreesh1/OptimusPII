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
  static createNewPolicy(policyType) {
    const policyId = 'policy_' + Date.now();
    const defaultPolicyNames = {
      'pasteProtection': 'Paste Protection',
      'fileUploadProtection': 'File Upload Protection',
      'fileDownloadProtection': 'File Download Protection'
    };
    // Default file extensions to block for file policies
    const defaultBlockedExtensions = policyType.includes('file') ?
      ['exe', 'dll', 'bat', 'cmd', 'msi', 'ps1', 'sh'] : [];

    return {
      policyId: policyId,
      policyName: defaultPolicyNames[policyType] || 'New Policy',
      policyType: policyType,
      enabled: true,
      policyConfig: {
        mode: 'interactive',
        enabledPatterns: [],
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
    delete policies[policyId];

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
   * Saves a domain mapping to storage
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
    return mappings;
  }

  /**
   * Deletes a domain mapping from storage
   * @param {string} domainPattern - The domain pattern to delete
   * @param {Array} allDomainMappings - All existing domain mappings
   * @returns {Promise} A promise that resolves with updated mappings
   */
  static async deleteDomainMapping(domainPattern, allDomainMappings) {
    const updatedMappings = allDomainMappings.filter(m => m.domainPattern !== domainPattern);
    await chrome.storage.local.set({ domainMappings: updatedMappings });
    return updatedMappings;
  }

  /**
   * Saves pattern repository to storage
   * @param {Object} patternRepository - The pattern repository to save
   * @returns {Promise} A promise that resolves when saved
   */
  static async savePatternRepository(patternRepository) {
    return chrome.storage.local.set({ regexPatterns: patternRepository });
  }

  static async loadOptions() {
    try {
      const [policies, domainMappings, patterns] = await Promise.all([
        this.getAllPolicies(),
        this.getAllDomainMappings(),
        this.getPatternRepository()
      ]);

      return {
        policies,
        domainMappings,
        patterns
      };
    } catch (error) {
      console.error('Error loading options:', error);
      throw error;
    }
  }

  // Add this method to your StorageService class
  static async saveAllOptions({ policies, domainMappings, patterns }) {
    try {
      await chrome.storage.local.set({
        policies,
        domainMappings,
        regexPatterns: patterns
      });
      return true;
    } catch (error) {
      console.error('Error saving options:', error);
      throw error;
    }
  }

}

