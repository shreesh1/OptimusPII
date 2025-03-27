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
    // Default file extensions to block for file policies
    const defaultBlockedExtensions = policyType.includes('file') ?
      ['exe', 'dll', 'bat', 'cmd', 'msi', 'ps1', 'sh'] : [];

    const newPolicy = {
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
    };

    this.templates = {
      regexTemplate: document.getElementById('regex-template'),
    };

    this.addButtons = {
      addRegex: document.getElementById('add-regex'),
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
      this.api.storage.local.get(['regexPatterns'])
    ]).then(([policies, domainMappings, result]) => {
      this.allPolicies = policies || {};
      this.allDomainMappings = domainMappings || [];
      this.patternRepository = result.regexPatterns || {};

      this.renderPolicyList();
      this.renderDomainMappings();
      this.loadPatternRepository();
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

    // For example, if you had something like:
    this.api.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.domainMappings) {
        console.log('Domain mappings changed, updating content scripts');
        console.log(changes.domainMappings.newValue);
        if (changes.domainMappings.newValue.length > 0) {
          var contentUrls = [];
          for (const i in changes.domainMappings.newValue) {
            contentUrls.push(changes.domainMappings.newValue[i]['domainPattern']);
          }
          console.log(contentUrls);
        this.OptimusPII.registerContentScriptsForUrls(contentUrls);
        }
      }
    });

    // Pattern repository buttons
    if (this.addButtons.addRegex) {
      this.addButtons.addRegex.addEventListener('click', () => {
        this.addCustomRegexRow();
        this.markAsChanged();
      });
    }

    // Policy management
    this.domElements.createPolicyButton.addEventListener('click', () => {
      this.showPolicyTypeS2elector();
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
              node.querySelectorAll('button.remove-regex')
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

    this.api.storage.local.set({
      regexPatterns: patternRepository,
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
    const policyType = this.domElements.policyType.value;
    
    // Show/hide extension list based on policy type
    if (policyType === 'fileUploadProtection' || policyType === 'fileDownloadProtection') {
      this.domElements.extensionList.parentElement.classList.remove('hidden');
    } else {
      this.domElements.extensionList.parentElement.classList.add('hidden');
    }
    
    // Populate extension list if needed
    if (this.currentEditingPolicy && 
        (policyType === 'fileUploadProtection' || policyType === 'fileDownloadProtection')) {
      this.renderExtensionList(this.currentEditingPolicy.policyConfig.blockedExtensions || []);
    }
  }

  /**
   * Render extension list for file-based policies
   * @param {Array} extensions - Array of extensions to render
   */
  renderExtensionList(extensions) {
    this.domElements.extensionList.innerHTML = '';
    
    extensions.forEach(ext => {
      const row = document.createElement('div');
      row.className = 'extension-row';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'extension-input';
      input.value = ext;
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-extension';
      removeBtn.textContent = 'X';
      removeBtn.addEventListener('click', () => {
        row.remove();
        this.markAsChanged();
      });
      
      row.appendChild(input);
      row.appendChild(removeBtn);
      this.domElements.extensionList.appendChild(row);
    });
    
    // Add an "add extension" button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-extension';
    addBtn.textContent = '+ Add Extension';
    addBtn.addEventListener('click', () => this.addExtensionToList());
    
    this.domElements.extensionList.appendChild(addBtn);
  }

  /**
   * Add a new extension input to the list
   */
  addExtensionToList() {
    const row = document.createElement('div');
    row.className = 'extension-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'extension-input';
    input.placeholder = 'File extension (e.g., pdf)';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-extension';
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', () => {
      row.remove();
      this.markAsChanged();
    });
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    
    // Insert before the Add button
    const addBtn = this.domElements.extensionList.querySelector('.add-extension');
    this.domElements.extensionList.insertBefore(row, addBtn);
    this.markAsChanged();
  }

  /**
   * Collect extensions from the policy editor
   */
  collectExtensionsFromPolicy() {
    const extensions = [];
    const extensionInputs = this.domElements.extensionList.querySelectorAll('.extension-input');
    
    extensionInputs.forEach(input => {
      const ext = input.value.trim().toLowerCase();
      if (ext) {
        extensions.push(ext);
      }
    });
    
    return extensions;
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

    if (this.currentEditingPolicy.policyType === 'fileUploadProtection' || 
        this.currentEditingPolicy.policyType === 'fileDownloadProtection') {
      policyConfig.blockedExtensions = this.collectExtensionsFromPolicy();
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
   * Show save confirmation message
   */
  showSaveConfirmation() {
    const status = this.domElements.statusIndicator;
    status.style.opacity = '1';
    setTimeout(function () {
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

    toggleInput.addEventListener('change', function () {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const optionsManager = new OptionsManager();
  optionsManager.init();
});