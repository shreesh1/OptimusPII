import React, { useState } from 'react';
import { StorageService } from '../../services/StorageService';
import PolicyEditor from '../forms/PolicyEditor';
import ConfirmModal from '../ConfirmModal';
import './PoliciesTab.css';

const PoliciesTab = ({ policies, setPolicies, domainMappings, setDomainMappings, onChange }) => {
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  
  const handleCreatePolicy = () => {
    setShowTypeSelector(true);
  };

  const handleSelectPolicyType = async (policyType) => {
    const newPolicy = StorageService.createNewPolicy(policyType);
    setCurrentPolicy(newPolicy);
    setShowPolicyEditor(true);
    setShowTypeSelector(false);
  };

  const handleEditPolicy = (policy) => {
    setCurrentPolicy({...policy});
    setShowPolicyEditor(true);
  };

  const handleSavePolicy = async (policy) => {
    try {
      const updatedPolicies = await StorageService.savePolicy(policy, policies);
      setPolicies(updatedPolicies);
      setShowPolicyEditor(false);
      setCurrentPolicy(null);
      onChange();
    } catch (error) {
      console.error('Failed to save policy:', error);
      // Add error handling UI here
    }
  };

  const handleDeletePolicy = async () => {
    try {
      const { policies: updatedPolicies, domainMappings: updatedMappings } = 
        await StorageService.deletePolicy(
          currentPolicy.policyId, 
          policies, 
          domainMappings
        );
      
      setPolicies(updatedPolicies);
      setDomainMappings(updatedMappings);
      setShowPolicyEditor(false);
      setShowConfirmDelete(false);
      setCurrentPolicy(null);
      onChange();
    } catch (error) {
      console.error('Failed to delete policy:', error);
      // Add error handling UI here
    }
  };

  const confirmDelete = () => {
    setShowConfirmDelete(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(false);
  };

  const handleCancelEdit = () => {
    setShowPolicyEditor(false);
    setCurrentPolicy(null);
  };

  return (
    <div className="policies-tab">
      <h2>Policy Management</h2>
      
      <div className="policy-list-container">
        {Object.keys(policies).length === 0 ? (
          <div className="empty-list-message">
            No policies defined. Click "Create New Policy" below to create one.
          </div>
        ) : (
          <div className="policy-list">
            {Object.values(policies).map(policy => (
              <div 
                key={policy.policyId} 
                className="policy-item"
                onClick={() => handleEditPolicy(policy)}
              >
                <div className="policy-info">
                  <div className="policy-name">{policy.policyName}</div>
                  <div className="policy-type">
                    {policy.policyType === 'pasteProtection' && 'Paste Protection'}
                    {policy.policyType === 'fileUploadProtection' && 'File Upload Protection'}
                    {policy.policyType === 'fileDownloadProtection' && 'File Download Protection'}
                  </div>
                </div>
                <div className={`policy-status ${policy.enabled ? '' : 'disabled'}`}>
                  {policy.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <button 
          className="create-policy-button"
          onClick={handleCreatePolicy}
        >
          Create New Policy
        </button>
      </div>

      {showTypeSelector && (
        <div className="policy-type-selector">
          <h3>Select Policy Type</h3>
          <div className="policy-type-options">
            <button onClick={() => handleSelectPolicyType('pasteProtection')}>
              Paste Protection
            </button>
            <button onClick={() => handleSelectPolicyType('fileUploadProtection')}>
              File Upload Protection
            </button>
            <button onClick={() => handleSelectPolicyType('fileDownloadProtection')}>
              File Download Protection
            </button>
          </div>
          <button className="cancel-button" onClick={() => setShowTypeSelector(false)}>
            Cancel
          </button>
        </div>
      )}

      {showPolicyEditor && currentPolicy && (
        <PolicyEditor
          policy={currentPolicy}
          onSave={handleSavePolicy}
          onDelete={confirmDelete}
          onCancel={handleCancelEdit}
        />
      )}

      {showConfirmDelete && (
        <ConfirmModal
          message="Are you sure you want to delete this policy? This action cannot be undone."
          onConfirm={handleDeletePolicy}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
};

export default PoliciesTab;