import React, { useState, useEffect } from 'react';
import './PolicyEditor.css';

const PolicyEditor = ({ policy, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState({ ...policy });
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [extensions, setExtensions] = useState([]);

  useEffect(() => {
    // Initialize selected patterns
    if (policy.policyConfig?.enabledPatterns) {
      setSelectedPatterns(policy.policyConfig.enabledPatterns);
    }
    
    // Initialize extensions for file policies
    if (policy.policyConfig?.blockedExtensions) {
      setExtensions(policy.policyConfig.blockedExtensions);
    }
  }, [policy]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      policyConfig: {
        ...prev.policyConfig,
        [name]: value
      }
    }));
  };

  const handlePatternToggle = (patternId) => {
    setSelectedPatterns(prev => {
      if (prev.includes(patternId)) {
        return prev.filter(id => id !== patternId);
      } else {
        return [...prev, patternId];
      }
    });
  };

  const handleAddExtension = () => {
    setExtensions(prev => [...prev, '']);
  };

  const handleRemoveExtension = (index) => {
    setExtensions(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtensionChange = (index, value) => {
    setExtensions(prev => {
      const updated = [...prev];
      updated[index] = value.trim().toLowerCase();
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Update policy with current form data
    const updatedPolicy = { 
      ...formData,
      policyConfig: {
        ...formData.policyConfig,
      }
    };
    
    // Add patterns for paste protection
    if (formData.policyType === 'pasteProtection') {
      updatedPolicy.policyConfig.enabledPatterns = selectedPatterns;
    }
    
    // Add extensions for file policies
    if (formData.policyType === 'fileUploadProtection' || 
        formData.policyType === 'fileDownloadProtection') {
      updatedPolicy.policyConfig.blockedExtensions = extensions.filter(Boolean);
    }
    
    onSave(updatedPolicy);
  };

  return (
    <div className="policy-editor">
      <h3>{policy.policyId ? 'Edit Policy' : 'Create Policy'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="policyName">Policy Name</label>
          <input
            type="text"
            id="policyName"
            name="policyName"
            value={formData.policyName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="policyType">Policy Type</label>
          <select
            id="policyType"
            name="policyType"
            value={formData.policyType}
            onChange={handleChange}
            disabled={!!policy.policyId}  // Disable changing type for existing policies
          >
            <option value="pasteProtection">Paste Protection</option>
            <option value="fileUploadProtection">File Upload Protection</option>
            <option value="fileDownloadProtection">File Download Protection</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="policyMode">Mode</label>
          <select
            id="policyMode"
            name="mode"
            value={formData.policyConfig?.mode || 'interactive'}
            onChange={handleConfigChange}
          >
            <option value="interactive">Interactive</option>
            <option value="block">Block</option>
            <option value="log">Log Only</option>
          </select>
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="policyEnabled"
            name="enabled"
            checked={formData.enabled}
            onChange={handleChange}
          />
          <label htmlFor="policyEnabled">Enabled</label>
        </div>
        
        {/* Conditional UI for paste protection */}
        {formData.policyType === 'pasteProtection' && (
          <div className="pattern-list">
            <h4>Enabled Patterns</h4>
            <div className="patterns">
              {/* Here you would render checkboxes for all available patterns */}
              {/* This is a placeholder example */}
              <div className="pattern-item">
                <input
                  type="checkbox"
                  id="pattern-ssn"
                  checked={selectedPatterns.includes('SSN')}
                  onChange={() => handlePatternToggle('SSN')}
                />
                <label htmlFor="pattern-ssn">Social Security Number (SSN)</label>
              </div>
              <div className="pattern-item">
                <input
                  type="checkbox"
                  id="pattern-cc"
                  checked={selectedPatterns.includes('CreditCard')}
                  onChange={() => handlePatternToggle('CreditCard')}
                />
                <label htmlFor="pattern-cc">Credit Card Number</label>
              </div>
              {/* Add more patterns here */}
            </div>
          </div>
        )}
        
        {/* Conditional UI for file policies */}
        {(formData.policyType === 'fileUploadProtection' || 
          formData.policyType === 'fileDownloadProtection') && (
          <div className="extension-list">
            <h4>Blocked File Extensions</h4>
            {extensions.map((ext, index) => (
              <div key={index} className="extension-row">
                <input
                  type="text"
                  value={ext}
                  onChange={(e) => handleExtensionChange(index, e.target.value)}
                  placeholder="File extension (e.g., pdf)"
                />
                <button 
                  type="button" 
                  className="remove-extension"
                  onClick={() => handleRemoveExtension(index)}
                >
                  X
                </button>
              </div>
            ))}
            <button 
              type="button" 
              className="add-extension"
              onClick={handleAddExtension}
            >
              + Add Extension
            </button>
          </div>
        )}
        
        <div className="form-actions">
          <button type="submit" className="save-button">Save</button>
          {policy.policyId && (
            <button 
              type="button" 
              className="delete-button" 
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PolicyEditor;