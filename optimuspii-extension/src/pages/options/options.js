/**
 * OptimusPII Extension Options Page
 * 
 * This module manages the options page functionality including policy management,
 * domain mappings, pattern repository, and global settings.
 */

/**
 * PolicyManager handles storing and retrieving policies and domain mappings
 */
class PolicyManager {
  /**
   * Gets all policies from storage
   * @returns {Promise<Object>} A promise that resolves to all policies
   */
  static getAllPolicies() {
    return chrome.storage.local.get(['policies']).then(result => result.policies || {});
  }

  /**
   * Gets all domain mappings from storage
   * @returns {Promise<Array>} A promise that resolves to all domain mappings
   */
  static getAllDomainMappings() {
    return chrome.storage.local.get(['domainMappings']).then(result => result.domainMappings || []);
  }

  /**
   * Creates a new policy with the specified type
   * @param {string} policyType - The type of policy to create
   * @returns {Promise<Object>} A promise that resolves to the new policy
   */
  static createNewPolicy(policyType) {
    const policyId = 'policy_' + Date.now();
    const defaultPolicyNames = {
      'pasteProtection': 'Paste Protection',
      'fileUploadProtection': 'File Upload Protection',
      'fileDownloadProtection': 'File Download Protection'
    };

    const newPolicy = {
      policyId: policyId,
      policyName: defaultPolicyNames[policyType] || 'New Policy',
      policyType: policyType,
      enabled: true,
      policyConfig: {
        mode: 'interactive',
        enabledPatterns: [],
        blockedExtensions: []
      }
    };

    return Promise.resolve(newPolicy);
  }

  /**
   * Saves a policy to storage
   * @param {Object} policy - The policy to save
   * @returns {Promise} A promise that resolves when the policy is saved
   */
  static savePolicy(policy) {
    return this.getAllPolicies().then(policies => {
      policies[policy.policyId] = policy;
      return chrome.storage.local.set({ policies });
    });
  }

  /**
   * Deletes a policy from storage
   * @param {string} policyId - The ID of the policy to delete
   * @returns {Promise} A promise that resolves when the policy is deleted
   */
  static deletePolicy(policyId) {
    return Promise.all([
      this.getAllPolicies(),
      this.getAllDomainMappings()
    ]).then(([policies, domainMappings]) => {
      // Delete the policy
      if (policies[policyId]) {
        delete policies[policyId];
      }
      
      // Remove policy from domain mappings
      const updatedDomainMappings = domainMappings.map(mapping => {
        mapping.appliedPolicies = mapping.appliedPolicies.filter(id => id !== policyId);
        return mapping;
      });
      
      return chrome.storage.local.set({
        policies,
        domainMappings: updatedDomainMappings
      });
    });
  }

  /**
   * Saves a domain mapping to storage
   * @param {Object} mapping - The domain mapping to save
   * @returns {Promise} A promise that resolves when the mapping is saved
   */
  static saveDomainMapping(mapping) {
    return this.getAllDomainMappings().then(mappings => {
      const existingIndex = mappings.findIndex(m => m.domainPattern === mapping.domainPattern);
      
      if (existingIndex >= 0) {
        mappings[existingIndex] = mapping;
      } else {
        mappings.push(mapping);
      }
      
      return chrome.storage.local.set({ domainMappings: mappings });
    });
  }

  /**
   * Deletes a domain mapping from storage
   * @param {string} domainPattern - The domain pattern to delete
   * @returns {Promise} A promise that resolves when the mapping is deleted
   */
  static deleteDomainMapping(domainPattern) {
    return this.getAllDomainMappings().then(mappings => {
      const updatedMappings = mappings.filter(m => m.domainPattern !== domainPattern);
      return chrome.storage.local.set({ domainMappings: updatedMappings });
    });
  }
}

class OptionsManager {
  constructor() {
    this.hasUnsavedChanges = false;
    this.api = chrome;
    this.OptimusPII = window.OptimusPII;
    this.currentEditingPolicy = null;
    this.currentEditingDomain = null;
    this.allPolicies = {};
    this.allDomainMappings = [];
    this.patternRepository = {};
    
    this.domElements = {
      saveButton: document.getElementById('save'),
      statusIndicator: document.getElementById('status'),
      unsavedIndicator: document.querySelector('.unsaved-indicator'),
      tabs: document.querySelectorAll('.tab'),
      tabContents: document.querySelectorAll('.tab-content'),
      
      // Policy management
      policyList: document.getElementById('policy-list'),
      policyEditor: document.getElementById('policy-editor'),
      createPolicyButton: document.getElementById('create-policy'),
      policyName: document.getElementById('policy-name'),
      policyType: document.getElementById('policy-type'),
      policyMode: document.getElementById('policy-mode'),
      policyEnabled: document.getElementById('policy-enabled'),
      savePolicy: document.getElementById('save-policy'),
      deletePolicy: document.getElementById('delete-policy'),
      cancelPolicyEdit: document.getElementById('cancel-policy-edit'),
      patternList: document.getElementById('pattern-list'),
      extensionList: document.getElementById('extension-list'),
      
      // Domain management
      domainMappingContainer: document.getElementById('domain-mapping-container'),
      domainMappingEditor: document.getElementById('domain-mapping-editor'),
      createDomainMapping: document.getElementById('create-domain-mapping'),
      domainPattern: document.getElementById('domain-pattern'),
      appliedPoliciesList: document.getElementById('applied-policies-list'),
      saveDomainMapping: document.getElementById('save-domain-mapping'),
      deleteDomainMapping: document.getElementById('delete-domain-mapping'),
      cancelDomainEdit: document.getElementById('cancel-domain-edit')
    };
    
    this.containers = {
      defaultRegex: document.getElementById('default-regex-container'),
      customRegex: document.getElementById('custom-regex-container'),
      customUrl: document.getElementById('custom-url-container'),
      fileExt: document.getElementById('custom-file-ext-container')
    };
    
    this.templates = {
      regexTemplate: document.getElementById('regex-template'),
      urlTemplate: document.getElementById('url-template'),
      fileExtTemplate: document.getElementById('file-ext-template')
    };
    
    this.addButtons = {
      addRegex: document.getElementById('add-regex'),
      addUrl: document.getElementById('add-url'),
      addExt: document.getElementById('add-ext')
    };

    // Confirmation modal elements
    this.confirmModal = document.getElementById('confirm-delete-modal');
    this.confirmDeleteButton = document.getElementById('confirm-delete');
    this.cancelDeleteButton = document.getElementById('cancel-delete');
    this.modalCloseButton = document.querySelector('.modal-close');
    this.pendingDeleteAction = null;
  }

  /**
   * Initialize the options page
   */
  init() {
    this.loadAllData();
    this.attachEventListeners();
    this.setupTabNavigation();
    this.addChangeTracking();
    this.domElements.saveButton.disabled = true;
  }

  /**
   * Load all data from storage
   */
  loadAllData() {
    Promise.all([
      PolicyManager.getAllPolicies(),
      PolicyManager.getAllDomainMappings(),
      this.api.storage.local.get(['regexPatterns', 'blockFileTypes'])
    ]).then(([policies, domainMappings, result]) => {
      this.allPolicies = policies || {};
      this.allDomainMappings = domainMappings || [];
      this.patternRepository = result.regexPatterns || {};
      this.blockFileTypes = result.blockFileTypes || [];
      
      this.renderPolicyList();
      this.renderDomainMappings();
      this.loadPatternRepository();
      this.loadGlobalSettings();
    }).catch(error => {
      console.error('Failed to load data:', error);
      this.showErrorMessage('Failed to load saved options');
    });
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    this.domElements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        this.domElements.tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all tab contents
        this.domElements.tabContents.forEach(content => content.classList.remove('active'));
        
        // Show content for active tab
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-content`).classList.add('active');
      });
    });
  }

  /**
   * Attach event listeners to static elements
   */
  attachEventListeners() {
    // Global save button
    this.domElements.saveButton.addEventListener('click', this.saveAllChanges.bind(this));
    
    // Pattern repository buttons
    if (this.addButtons.addRegex) {
      this.addButtons.addRegex.addEventListener('click', () => {
        this.addCustomRegexRow();
        this.markAsChanged();
      });
    }
    
    if (this.addButtons.addUrl) {
      this.addButtons.addUrl.addEventListener('click', () => {
        this.addCustomUrlRow();
        this.markAsChanged();
      });
    }
    
    if (this.addButtons.addExt) {
      this.addButtons.addExt.addEventListener('click', () => {
        this.addCustomExtensionRow();
        this.markAsChanged();
      });
    }
    
    // Policy management
    this.domElements.createPolicyButton.addEventListener('click', () => {
      this.showPolicyTypeSelector();
    });
    
    this.domElements.savePolicy.addEventListener('click', () => {
      this.saveCurrentPolicy();
    });
    
    this.domElements.deletePolicy.addEventListener('click', () => {
      this.confirmDelete(() => this.deleteCurrentPolicy());
    });
    
    this.domElements.cancelPolicyEdit.addEventListener('click', () => {
      this.hidePolicyEditor();
    });
    
    this.domElements.policyType.addEventListener('change', () => {
      this.updatePolicyEditorFields();
    });
    
    // Domain mapping
    this.domElements.createDomainMapping.addEventListener('click', () => {
      this.showDomainMappingEditor();
    });
    
    this.domElements.saveDomainMapping.addEventListener('click', () => {
      this.saveCurrentDomainMapping();
    });
    
    this.domElements.deleteDomainMapping.addEventListener('click', () => {
      this.confirmDelete(() => this.deleteCurrentDomainMapping());
    });
    
    this.domElements.cancelDomainEdit.addEventListener('click', () => {
      this.hideDomainMappingEditor();
    });
    
    // Modal
    this.confirmDeleteButton.addEventListener('click', () => {
      if (this.pendingDeleteAction) {
        this.pendingDeleteAction();
        this.pendingDeleteAction = null;
      }
      this.hideConfirmModal();
    });
    
    this.cancelDeleteButton.addEventListener('click', () => {
      this.hideConfirmModal();
    });
    
    this.modalCloseButton.addEventListener('click', () => {
      this.hideConfirmModal();
    });
  }

  /**
   * Track changes in the UI
   */
  addChangeTracking() {
    // Form inputs in policy editor
    document.querySelectorAll('#policy-editor input, #policy-editor select').forEach(input => {
      input.addEventListener('change', this.markAsChanged.bind(this));
    });
    
    // Form inputs in domain mapping editor
    document.querySelectorAll('#domain-mapping-editor input').forEach(input => {
      input.addEventListener('change', this.markAsChanged.bind(this));
    });
    
    // Radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', this.markAsChanged.bind(this));
    });

    // Track dynamic elements changes
    this.observeMutations();
  }

  /**
   * Observe DOM mutations to track changes in dynamically added elements
   */
  observeMutations() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              node.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('input', this.markAsChanged.bind(this));
                input.addEventListener('change', this.markAsChanged.bind(this));
              });
              node.querySelectorAll('button.remove-regex, button.remove-url, button.remove-ext')
                .forEach(btn => {
                  btn.addEventListener('click', this.markAsChanged.bind(this));
                });
            }
          });
        }
      });
    });

    // Observe containers with dynamic content
    const containers = [
      ...Object.values(this.containers),
      this.domElements.policyList,
      this.domElements.domainMappingContainer,
      this.domElements.patternList,
      this.domElements.extensionList,
      this.domElements.appliedPoliciesList
    ].filter(Boolean);
    
    containers.forEach(container => {
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
    });
  }

  /**
   * Mark the form as having unsaved changes
   */
  markAsChanged() {
    if (!this.hasUnsavedChanges) {
      this.hasUnsavedChanges = true;
      this.domElements.saveButton.disabled = false;
      this.domElements.saveButton.classList.add('has-changes');
      this.domElements.unsavedIndicator.style.display = 'inline';
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  /**
   * Reset the change tracking state
   */
  resetChangeState() {
    this.hasUnsavedChanges = false;
    this.domElements.saveButton.disabled = true;
    this.domElements.saveButton.classList.remove('has-changes');
    this.domElements.unsavedIndicator.style.display = 'none';
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  /**
   * Handler for beforeunload event to warn about unsaved changes
   */
  beforeUnloadHandler(e) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }

  /**
   * Show confirmation dialog for delete actions
   * @param {Function} action - The action to perform on confirmation
   */
  confirmDelete(action) {
    this.pendingDeleteAction = action;
    this.confirmModal.classList.remove('hidden');
  }

  /**
   * Hide confirmation modal
   */
  hideConfirmModal() {
    this.confirmModal.classList.add('hidden');
  }

  /**
   * Save all changes 
   */
  saveAllChanges(e) {
    if (e) e.preventDefault();
    
    // First save pattern repository and global settings
    const patternRepository = this.collectPatternRepository();
    const globalSettings = this.collectGlobalSettings();
    
    this.api.storage.local.set({
      regexPatterns: patternRepository,
      blockFileTypes: globalSettings.blockFileTypes,
      customUrls: globalSettings.customUrls
    }).then(() => {
      this.showSaveConfirmation();
      this.resetChangeState();
    }).catch(error => {
      console.error('Failed to save options:', error);
      this.showErrorMessage('Failed to save options');
    });
  }

  /**
   * Show policy type selector before creating a new policy
   */
  showPolicyTypeSelector() {
    // Create a simple popup to select policy type
    const types = [
      { id: 'pasteProtection', name: 'Paste Protection' },
      { id: 'fileUploadProtection', name: 'File Upload Protection' },
      { id: 'fileDownloadProtection', name: 'File Download Protection' }
    ];
    
    const policyType = prompt(
      'Select policy type:\n1. Paste Protection\n2. File Upload Protection\n3. File Download Protection',
      '1'
    );
    
    let selectedType;
    if (policyType === '1') selectedType = 'pasteProtection';
    else if (policyType === '2') selectedType = 'fileUploadProtection';
    else if (policyType === '3') selectedType = 'fileDownloadProtection';
    else return;
    
    this.createNewPolicy(selectedType);
  }

  /**
   * Create a new policy
   * @param {string} policyType - Type of policy to create
   */
  createNewPolicy(policyType) {
    PolicyManager.createNewPolicy(policyType).then(newPolicy => {
      this.allPolicies[newPolicy.policyId] = newPolicy;
      this.renderPolicyList();
      this.showPolicyEditor(newPolicy);
      this.markAsChanged();
    });
  }

  /**
   * Show the policy editor for a specific policy
   * @param {Object} policy - The policy to edit
   */
  showPolicyEditor(policy) {
    this.currentEditingPolicy = policy;
    
    this.domElements.policyName.value = policy.policyName;
    this.domElements.policyType.value = policy.policyType;
    this.domElements.policyMode.value = policy.policyConfig.mode || 'interactive';
    this.domElements.policyEnabled.checked = policy.enabled;
    
    this.updatePolicyEditorFields();
    
    this.domElements.policyEditor.classList.remove('hidden');
  }

  /**
   * Update policy editor fields based on policy type
   */
  updatePolicyEditorFields() {
    if (!this.currentEditingPolicy) return;
    
    const policyType = this.domElements.policyType.value;
    const policyConfig = this.currentEditingPolicy.policyConfig || {};
    
    // Show/hide relevant containers
    const patternContainer = document.getElementById('enabled-patterns-container');
    const extensionContainer = document.getElementById('blocked-extensions-container');
    
    patternContainer.style.display = (policyType === 'pasteProtection') ? 'block' : 'none';
    extensionContainer.style.display = (policyType === 'fileUploadProtection') ? 'block' : 'none';
    
    // Clear current fields
    this.domElements.patternList.innerHTML = '';
    this.domElements.extensionList.innerHTML = '';
    
    // Populate pattern selection for paste protection
    if (policyType === 'pasteProtection') {
      const enabledPatterns = policyConfig.enabledPatterns || [];
      
      // Add all available patterns from the pattern repository
      for (const [name, details] of Object.entries(this.patternRepository)) {
        const isChecked = enabledPatterns.includes(name);
        this.addPatternCheckbox(name, isChecked);
      }
    }
    
    // Populate extension selection for file upload protection
    if (policyType === 'fileUploadProtection') {
      const blockedExtensions = policyConfig.blockedExtensions || [];
      
      // Add all common file extensions
      const commonExtensions = ['.js', '.jsx', '.ts', '.tsx', '.php', '.py', '.rb', '.env', 
        '.config', '.yml', '.yaml', '.json', '.sh', '.bash', '.zsh', '.conf', '.htaccess', 
        '.htpasswd', '.sql', '.log', '.xml', '.csv'];
      
      commonExtensions.forEach(ext => {
        const isChecked = blockedExtensions.includes(ext);
        this.addExtensionCheckbox(ext, isChecked);
      });
    }
  }

  /**
   * Add a pattern checkbox to the pattern list
   * @param {string} name - Pattern name
   * @param {boolean} checked - Whether the pattern is enabled
   */
  addPatternCheckbox(name, checked) {
    const item = document.createElement('div');
    item.className = 'form-check';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'pattern-checkbox';
    input.id = `pattern-${name.replace(/\s+/g, '-')}`;
    input.value = name;
    input.checked = checked;
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = name;
    
    item.appendChild(input);
    item.appendChild(label);
    
    this.domElements.patternList.appendChild(item);
  }

  /**
   * Add an extension checkbox to the extension list
   * @param {string} ext - File extension
   * @param {boolean} checked - Whether the extension is blocked
   */
  addExtensionCheckbox(ext, checked) {
    const item = document.createElement('div');
    item.className = 'form-check';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'extension-checkbox';
    input.id = `ext-${ext.replace(/\./g, '')}`;
    input.value = ext;
    input.checked = checked;
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = ext;
    
    item.appendChild(input);
    item.appendChild(label);
    
    this.domElements.extensionList.appendChild(item);
  }

  /**
   * Hide the policy editor
   */
  hidePolicyEditor() {
    this.domElements.policyEditor.classList.add('hidden');
    this.currentEditingPolicy = null;
  }

  /**
   * Save the current policy being edited
   */
  saveCurrentPolicy() {
    if (!this.currentEditingPolicy) return;
    
    // Update policy from form
    this.currentEditingPolicy.policyName = this.domElements.policyName.value;
    this.currentEditingPolicy.policyType = this.domElements.policyType.value;
    this.currentEditingPolicy.enabled = this.domElements.policyEnabled.checked;
    
    // Rebuild policy config based on type
    const policyConfig = {
      mode: this.domElements.policyMode.value
    };
    
    if (this.currentEditingPolicy.policyType === 'pasteProtection') {
      const enabledPatterns = [];
      document.querySelectorAll('.pattern-checkbox:checked').forEach(checkbox => {
        enabledPatterns.push(checkbox.value);
      });
      policyConfig.enabledPatterns = enabledPatterns;
    }
    
    if (this.currentEditingPolicy.policyType === 'fileUploadProtection') {
      const blockedExtensions = [];
      document.querySelectorAll('.extension-checkbox:checked').forEach(checkbox => {
        blockedExtensions.push(checkbox.value);
      });
      policyConfig.blockedExtensions = blockedExtensions;
    }
    
    this.currentEditingPolicy.policyConfig = policyConfig;
    
    // Save to storage
    PolicyManager.savePolicy(this.currentEditingPolicy).then(() => {
      this.allPolicies[this.currentEditingPolicy.policyId] = this.currentEditingPolicy;
      this.renderPolicyList();
      this.hidePolicyEditor();
      this.markAsChanged();
    }).catch(error => {
      console.error('Failed to save policy:', error);
      this.showErrorMessage('Failed to save policy');
    });
  }

  /**
   * Delete the current policy
   */
  deleteCurrentPolicy() {
    if (!this.currentEditingPolicy) return;
    
    PolicyManager.deletePolicy(this.currentEditingPolicy.policyId).then(() => {
      delete this.allPolicies[this.currentEditingPolicy.policyId];
      this.renderPolicyList();
      this.hidePolicyEditor();
      this.loadAllData(); // Reload data to update domain mappings
      this.markAsChanged();
    }).catch(error => {
      console.error('Failed to delete policy:', error);
      this.showErrorMessage('Failed to delete policy');
    });
  }

  /**
   * Render the list of policies
   */
  renderPolicyList() {
    this.domElements.policyList.innerHTML = '';
    
    if (Object.keys(this.allPolicies).length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-list-message';
      emptyMessage.textContent = 'No policies defined. Click "Create New Policy" below to create one.';
      this.domElements.policyList.appendChild(emptyMessage);
      return;
    }
    
    for (const [id, policy] of Object.entries(this.allPolicies)) {
      this.addPolicyListItem(policy);
    }
  }

  /**
   * Add a policy item to the policy list
   * @param {Object} policy - The policy to add
   */
  addPolicyListItem(policy) {
    const item = document.createElement('div');
    item.className = 'policy-item';
    item.dataset.policyId = policy.policyId;
    
    const info = document.createElement('div');
    info.className = 'policy-info';
    
    const name = document.createElement('div');
    name.className = 'policy-name';
    name.textContent = policy.policyName;
    
    const type = document.createElement('div');
    type.className = 'policy-type';
    switch (policy.policyType) {
      case 'pasteProtection': type.textContent = 'Paste Protection'; break;
      case 'fileUploadProtection': type.textContent = 'File Upload Protection'; break;
      case 'fileDownloadProtection': type.textContent = 'File Download Protection'; break;
      default: type.textContent = policy.policyType;
    }
    
    info.appendChild(name);
    info.appendChild(type);
    
    const status = document.createElement('div');
    status.className = `policy-status ${policy.enabled ? '' : 'disabled'}`;
    status.textContent = policy.enabled ? 'Enabled' : 'Disabled';
    
    item.appendChild(info);
    item.appendChild(status);
    
    item.addEventListener('click', () => {
      this.showPolicyEditor(policy);
    });
    
    this.domElements.policyList.appendChild(item);
  }

  /**
   * Show the domain mapping editor
   * @param {Object} mapping - The domain mapping to edit, or null for a new mapping
   */
  showDomainMappingEditor(mapping = null) {
    this.currentEditingDomain = mapping || { domainPattern: '', appliedPolicies: [] };
    
    this.domElements.domainPattern.value = this.currentEditingDomain.domainPattern;
    
    // Populate the applied policies checkboxes
    this.domElements.appliedPoliciesList.innerHTML = '';
    
    for (const [id, policy] of Object.entries(this.allPolicies)) {
      const isApplied = this.currentEditingDomain.appliedPolicies.includes(id);
      this.addPolicyCheckbox(policy, isApplied);
    }
    
    this.domElements.domainMappingEditor.classList.remove('hidden');
  }

  /**
   * Add a policy checkbox to the applied policies list
   * @param {Object} policy - The policy
   * @param {boolean} checked - Whether the policy is applied
   */
  addPolicyCheckbox(policy, checked) {
    const item = document.createElement('div');
    item.className = 'form-check';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'policy-checkbox';
    input.id = `policy-${policy.policyId}`;
    input.value = policy.policyId;
    input.checked = checked;
    
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.innerHTML = `<strong>${policy.policyName}</strong> <span class="policy-type-small">(${policy.policyType})</span>`;
    
    item.appendChild(input);
    item.appendChild(label);
    
    this.domElements.appliedPoliciesList.appendChild(item);
  }

  /**
   * Hide the domain mapping editor
   */
  hideDomainMappingEditor() {
    this.domElements.domainMappingEditor.classList.add('hidden');
    this.currentEditingDomain = null;
  }

  /**
   * Save the current domain mapping
   */
  saveCurrentDomainMapping() {
    if (!this.currentEditingDomain) return;
    
    // Update mapping from form
    this.currentEditingDomain.domainPattern = this.domElements.domainPattern.value;
    
    // Get selected policies
    const appliedPolicies = [];
    document.querySelectorAll('.policy-checkbox:checked').forEach(checkbox => {
      appliedPolicies.push(checkbox.value);
    });
    this.currentEditingDomain.appliedPolicies = appliedPolicies;
    
    // Save to storage
    PolicyManager.saveDomainMapping(this.currentEditingDomain).then(() => {
      this.loadAllData(); // Reload to update both policies and mappings
      this.hideDomainMappingEditor();
      this.markAsChanged();
    }).catch(error => {
      console.error('Failed to save domain mapping:', error);
      this.showErrorMessage('Failed to save domain mapping');
    });
  }

  /**
   * Delete the current domain mapping
   */
  deleteCurrentDomainMapping() {
    if (!this.currentEditingDomain || !this.currentEditingDomain.domainPattern) return;
    
    PolicyManager.deleteDomainMapping(this.currentEditingDomain.domainPattern).then(() => {
      this.loadAllData(); // Reload data
      this.hideDomainMappingEditor();
      this.markAsChanged();
    }).catch(error => {
      console.error('Failed to delete domain mapping:', error);
      this.showErrorMessage('Failed to delete domain mapping');
    });
  }

  /**
   * Render the list of domain mappings
   */
  renderDomainMappings() {
    this.domElements.domainMappingContainer.innerHTML = '';
    
    if (this.allDomainMappings.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-list-message';
      emptyMessage.textContent = 'No domain mappings defined. Click "Add Domain Mapping" below to create one.';
      this.domElements.domainMappingContainer.appendChild(emptyMessage);
      return;
    }
    
    for (const mapping of this.allDomainMappings) {
      this.addDomainMappingItem(mapping);
    }
  }

  /**
   * Add a domain mapping item to the list
   * @param {Object} mapping - The domain mapping to add
   */
  addDomainMappingItem(mapping) {
    const item = document.createElement('div');
    item.className = 'domain-mapping-item';
    
    const pattern = document.createElement('div');
    pattern.className = 'domain-pattern';
    pattern.textContent = mapping.domainPattern;
    
    const policies = document.createElement('div');
    policies.className = 'domain-policies';
    
    // List applied policy names
    const policyNames = mapping.appliedPolicies.map(id => {
      return this.allPolicies[id] ? this.allPolicies[id].policyName : id;
    }).join(', ');
    
    policies.textContent = policyNames || 'No policies applied';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'button-secondary';
    editButton.style.marginLeft = '10px';
    
    editButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent item click
      this.showDomainMappingEditor(mapping);
    });
    
    item.appendChild(pattern);
    item.appendChild(policies);
    item.appendChild(editButton);
    
    this.domElements.domainMappingContainer.appendChild(item);
  }

  /**
   * Load pattern repository data to UI
   */
  loadPatternRepository() {
    // Clear containers
    this.clearContainer(this.containers.defaultRegex);
    this.clearContainer(this.containers.customRegex);
    
    // Add patterns from repository
    for (const [name, details] of Object.entries(this.patternRepository)) {
      if (details.isDefault) {
        // Add default patterns
        this.addDefaultRegexRow(name, details.pattern, details.enabled, details.sampleData);
      } else {
        // Add custom patterns
        this.addCustomRegexRow(name, details.pattern, details.enabled, details.sampleData);
      }
    }
    
    // Ensure at least one custom pattern row exists
    if (!document.querySelector('.custom-regex-row:not(#regex-template)')) {
      this.addCustomRegexRow();
    }
  }

  /**
   * Load global settings to UI
   */
  loadGlobalSettings() {
    // Clear containers
    this.clearContainer(this.containers.customUrl);
    this.clearContainer(this.containers.fileExt);
    
    // Load URLs
    this.api.storage.local.get(['customUrls']).then(result => {
      const storedUrls = result.customUrls || [];
      
      // Add saved URLs or at least one empty row
      if (storedUrls && storedUrls.length > 0) {
        storedUrls.forEach(url => this.addCustomUrlRow(url));
      } else {
        this.addCustomUrlRow();
      }
    });
    
    // Load file extensions
    if (this.blockFileTypes && this.blockFileTypes.length > 0) {
      this.blockFileTypes.forEach(fileExt => this.addCustomExtensionRow(fileExt));
    } else {
      this.addCustomExtensionRow();
    }
  }

  /**
   * Collect pattern repository data from UI
   * @returns {Object} Pattern repository
   */
  collectPatternRepository() {
    // Process default regex patterns
    const defaultRegexPatterns = this.collectDefaultRegexPatterns();
    
    // Get custom regex patterns
    const customRegexPatterns = this.collectCustomRegexPatterns();
    
    // Combine all regex patterns
    return { ...defaultRegexPatterns, ...customRegexPatterns };
  }

  /**
   * Collect global settings from UI
   * @returns {Object} Global settings
   */
  collectGlobalSettings() {
    // Get custom URL patterns
    const customUrls = this.collectCustomUrlPatterns();
    
    // Get file extension patterns
    const blockFileTypes = this.collectFileExtensions();
    
    return {
      customUrls,
      blockFileTypes
    };
  }

  /* The rest of your existing methods for pattern repository and settings handling */
  
  /**
   * Collect default regex patterns from the form
   * @returns {Object} Default regex patterns with their settings
   */
  collectDefaultRegexPatterns() {
    const defaultRegexElements = document.querySelectorAll('.default-regex-row');
    const defaultRegexPatterns = {};

    defaultRegexElements.forEach(row => {
      const nameElement = row.querySelector('.regex-name');
      const name = nameElement.textContent;
      const enabled = row.querySelector('.toggle-regex').checked;
      const sampleInput = row.querySelector('.regex-sample');
      const sampleData = sampleInput ? sampleInput.value : 
        this.OptimusPII.DEFAULT_REGEX_PATTERNS[name].sampleData;

      if (this.OptimusPII.DEFAULT_REGEX_PATTERNS[name]) {
        defaultRegexPatterns[name] = {
          pattern: this.OptimusPII.DEFAULT_REGEX_PATTERNS[name].pattern,
          enabled,
          isDefault: true,
          sampleData
        };
      }
    });

    return defaultRegexPatterns;
  }

  /**
   * Collect custom regex patterns from the form
   * @returns {Object} Custom regex patterns with their settings
   */
  collectCustomRegexPatterns() {
    const customRegexElements = document.querySelectorAll('.custom-regex-row:not(#regex-template)');
    const customRegexPatterns = {};

    customRegexElements.forEach((row, index) => {
      if (index === 0) return;
      
      const nameInput = row.querySelector('.regex-name');
      const patternInput = row.querySelector('.regex-pattern');
      const sampleInput = row.querySelector('.regex-sample');
      const enabled = row.querySelector('.toggle-regex').checked;

      // Only save non-empty patterns with names
      if (nameInput.value.trim() && patternInput.value.trim()) {
        customRegexPatterns[nameInput.value.trim()] = {
          pattern: patternInput.value.trim(),
          enabled,
          isDefault: false,
          sampleData: sampleInput.value.trim() || "REDACTED"
        };
      }
    });

    return customRegexPatterns;
  }

  /**
   * Collect custom URL patterns from the form
   * @returns {Array} List of URL patterns
   */
  collectCustomUrlPatterns() {
    const customUrlElements = document.querySelectorAll('.custom-url-row:not(#url-template)');
    const customUrls = [];

    customUrlElements.forEach(row => {
      const urlPattern = row.querySelector('.url-pattern').value.trim();
      if (urlPattern) {
        customUrls.push(urlPattern);
      }
    });

    return customUrls;
  }

  /**
   * Collect file extension patterns from the form
   * @returns {Array} List of file extensions to block
   */
  collectFileExtensions() {
    const fileExtElements = document.querySelectorAll('.file-ext-row:not(#file-ext-template)');
    const blockFileTypes = [];

    fileExtElements.forEach(row => {
      const fileExt = row.querySelector('.file-ext-pattern').value.trim();
      if (fileExt) {
        if (!fileExt.startsWith('.')) {
          blockFileTypes.push('.' + fileExt.toLowerCase());
        } else {
          blockFileTypes.push(fileExt.toLowerCase());
        }
      }
    });

    return blockFileTypes;
  }

  /**
   * Show save confirmation message
   */
  showSaveConfirmation() {
    const status = this.domElements.statusIndicator;
    status.style.opacity = '1';
    setTimeout(function() {
      status.style.opacity = '0';
    }, 2000);
  }

  /**
   * Show error message
   * @param {string} message - The error message to display
   */
  showErrorMessage(message) {
    alert(`Error: ${message}`);
  }

  /**
   * Clear a container element
   * @param {HTMLElement} container - The container to clear
   */
  clearContainer(container) {
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Add a default regex pattern row to the UI
   * @param {string} name - The pattern name
   * @param {string} pattern - The regex pattern
   * @param {boolean} enabled - Whether the pattern is enabled
   * @param {string} sampleData - Sample data for the pattern
   */
  addDefaultRegexRow(name, pattern, enabled, sampleData = '') {
    const row = document.createElement('div');
    row.className = 'default-regex-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    `;

    const toggleSwitch = this.createToggleSwitch(enabled);
    
    // Create name element
    const nameElement = document.createElement('div');
    nameElement.className = 'regex-name';
    nameElement.textContent = name;
    nameElement.style.cssText = `
      font-weight: 500;
      flex-grow: 1;
      min-width: 150px;
    `;

    // Info button to view pattern
    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.textContent = 'View Pattern';
    infoButton.style.cssText = `
      padding: 5px 10px;
      background-color: #f5f5f5;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      color: #333;
      margin-right: 10px;
    `;

    infoButton.addEventListener('click', () => {
      alert(`Pattern for ${name}:\n\n${pattern}`);
    });

    // Create sample data input
    const sampleLabel = document.createElement('div');
    sampleLabel.textContent = 'Sample replacement:';
    sampleLabel.style.cssText = `
      font-size: 13px;
      color: #666;
      margin-right: 5px;
    `;

    const sampleInput = document.createElement('input');
    sampleInput.type = 'text';
    sampleInput.className = 'regex-sample';
    sampleInput.value = sampleData || '';
    sampleInput.placeholder = 'Sample replacement data';
    sampleInput.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
      width: 180px;
      margin-right: 10px;
    `;

    // Add elements to row
    row.appendChild(toggleSwitch);
    row.appendChild(nameElement);
    row.appendChild(infoButton);
    row.appendChild(sampleLabel);
    row.appendChild(sampleInput);

    // Add row to container
    this.containers.defaultRegex.appendChild(row);
  }

  /**
   * Create a toggle switch element
   * @param {boolean} enabled - Whether the switch is on
   * @returns {HTMLElement} The toggle switch element
   */
  createToggleSwitch(enabled) {
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'switch';
    toggleSwitch.style.cssText = `
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
      margin-right: 12px;
      flex-shrink: 0;
    `;

    const toggleInput = document.createElement('input');
    toggleInput.className = 'toggle-regex';
    toggleInput.type = 'checkbox';
    toggleInput.checked = enabled;
    toggleInput.style.cssText = `
      opacity: 0;
      width: 0;
      height: 0;
    `;

    const toggleSlider = document.createElement('span');
    toggleSlider.style.cssText = `
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${enabled ? '#0078d7' : '#ccc'};
      transition: .4s;
      border-radius: 22px;
    `;

    const sliderHandle = document.createElement('span');
    sliderHandle.style.cssText = `
      position: absolute;
      content: '';
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
      transform: ${enabled ? 'translateX(18px)' : 'translateX(0)'};
    `;

    toggleSlider.appendChild(sliderHandle);

    toggleInput.addEventListener('change', function() {
      sliderHandle.style.transform = this.checked ? 'translateX(18px)' : 'translateX(0)';
      toggleSlider.style.backgroundColor = this.checked ? '#0078d7' : '#ccc';
    });

    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);

    return toggleSwitch;
  }

  /**
   * Add a custom regex pattern row to the UI
   * @param {string} name - The pattern name
   * @param {string} pattern - The regex pattern
   * @param {boolean} enabled - Whether the pattern is enabled
   * @param {string} sampleData - Sample data for the pattern
   */
  addCustomRegexRow(name = '', pattern = '', enabled = true, sampleData = '') {
    // Clone the template
    const newRow = this.templates.regexTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set values if provided
    newRow.querySelector('.regex-name').value = name;
    newRow.querySelector('.regex-pattern').value = pattern;
    newRow.querySelector('.regex-sample').value = sampleData;

    // Add toggle switch
    const toggleSwitch = this.createToggleSwitch(enabled);
    newRow.insertBefore(toggleSwitch, newRow.firstChild);

    // Add remove button functionality
    const removeButton = newRow.querySelector('.remove-regex');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        newRow.remove();
        this.markAsChanged();
      });
    }

    // Add to container
    if (this.containers.customRegex) {
      this.containers.customRegex.appendChild(newRow);
    }
  }

  /**
   * Add a custom URL pattern row to the UI
   * @param {string} url - The URL pattern
   */
  addCustomUrlRow(url = '') {
    // Clone the template
    const newRow = this.templates.urlTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set value if provided
    const urlInput = newRow.querySelector('.url-pattern');
    if (urlInput) {
      urlInput.value = url;
    }

    // Add remove button functionality
    const removeButton = newRow.querySelector('.remove-url');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        const urlPattern = urlInput ? urlInput.value.trim() : '';
        
        // Check if it's a default URL that shouldn't be removed
        if (this.OptimusPII.DEFAULT_URLS && 
            this.OptimusPII.DEFAULT_URLS.includes(urlPattern)) {
          alert('Cannot remove default URL pattern');
          return;
        }
        
        newRow.remove();
        this.markAsChanged();
      });
    }

    // Add to container
    if (this.containers.customUrl) {
      this.containers.customUrl.appendChild(newRow);
    }
  }

  /**
   * Add a custom file extension row to the UI
   * @param {string} fileExt - The file extension
   */
  addCustomExtensionRow(fileExt = '') {
    // Clone the template
    const newRow = this.templates.fileExtTemplate.cloneNode(true);
    newRow.id = '';
    newRow.classList.remove('hidden');

    // Set value if provided
    const fileExtInput = newRow.querySelector('.file-ext-pattern');
    if (fileExtInput) {
      fileExtInput.value = fileExt;
    }

    // Add remove button functionality
    const removeButton = newRow.querySelector('.remove-ext');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        newRow.remove();
        this.markAsChanged();
      });
    }

    // Add to container
    if (this.containers.fileExt) {
      this.containers.fileExt.appendChild(newRow);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const optionsManager = new OptionsManager();
  optionsManager.init();
});