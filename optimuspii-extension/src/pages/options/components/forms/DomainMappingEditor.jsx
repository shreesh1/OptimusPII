import React, { useState } from 'react';
import './DomainMappingEditor.css';

const DomainMappingEditor = ({ mapping, policies, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState({
    domainPattern: mapping.domainPattern,
    appliedPolicies: [...mapping.appliedPolicies]
  });

  const handleDomainChange = (e) => {
    setFormData(prev => ({
      ...prev,
      domainPattern: e.target.value
    }));
  };

  const handlePolicyToggle = (policyId) => {
    setFormData(prev => {
      const policies = [...prev.appliedPolicies];
      
      if (policies.includes(policyId)) {
        return {
          ...prev,
          appliedPolicies: policies.filter(id => id !== policyId)
        };
      } else {
        return {
          ...prev,
          appliedPolicies: [...policies, policyId]
        };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const hasExistingMapping = mapping.domainPattern !== '';
  
  return (
    <div className="domain-mapping-editor">
      <h3>{hasExistingMapping ? 'Edit Domain Mapping' : 'Create Domain Mapping'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="domainPattern">Domain Pattern</label>
          <input
            type="text"
            id="domainPattern"
            value={formData.domainPattern}
            onChange={handleDomainChange}
            placeholder="e.g., *.example.com or https://app.example.com/*"
            required
          />
          <p className="help-text">
            Use wildcards (*) to match multiple domains or paths. Examples:
            <br />
            - *.example.com - Matches all subdomains of example.com
            <br />
            - https://app.example.com/* - Matches all paths on app.example.com
          </p>
        </div>
        
        <div className="form-group">
          <label>Applied Policies</label>
          <div className="applied-policies-list">
            {Object.keys(policies).length === 0 ? (
              <p className="no-policies-message">
                No policies available. Create policies first before mapping them to domains.
              </p>
            ) : (
              Object.values(policies).map(policy => (
                <div key={policy.policyId} className="form-check">
                  <input
                    type="checkbox"
                    id={`policy-${policy.policyId}`}
                    value={policy.policyId}
                    checked={formData.appliedPolicies.includes(policy.policyId)}
                    onChange={() => handlePolicyToggle(policy.policyId)}
                  />
                  <label htmlFor={`policy-${policy.policyId}`}>
                    <strong>{policy.policyName}</strong>
                    <span className="policy-type-small">
                      ({policy.policyType})
                    </span>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="save-button">Save</button>
          {hasExistingMapping && (
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

export default DomainMappingEditor;