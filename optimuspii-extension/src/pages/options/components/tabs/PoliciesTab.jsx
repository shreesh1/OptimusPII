import React, { useState } from 'react';
import { Button, ListGroup, Card } from 'react-bootstrap';
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
      const updatedPolicies = await StorageService.savePolicy(policy);
      setPolicies(updatedPolicies);
      setShowPolicyEditor(false);
      setCurrentPolicy(null);
      onChange();
    } catch (error) {
      console.error('Error saving policy:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePolicy = async (policyId) => {
    setShowConfirmDelete(true);
  };

  const confirmDeletePolicy = async () => {
    if (!currentPolicy?.policyId) return;
    
    try {
      const updatedData = await StorageService.deletePolicy(
        currentPolicy.policyId,
        domainMappings
      );
      
      setPolicies(updatedData.policies);
      setDomainMappings(updatedData.domainMappings);
      setShowConfirmDelete(false);
      setShowPolicyEditor(false);
      setCurrentPolicy(null);
      onChange();
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const cancelPolicyEditor = () => {
    setShowPolicyEditor(false);
    setCurrentPolicy(null);
  };

  return (
    <div className="policies-tab">
      {!showPolicyEditor && !showTypeSelector && (
        <>
          <div className="policies-header d-flex justify-content-between align-items-center mb-3">
            <h3>Policies</h3>
            <Button 
              variant="primary"
              onClick={handleCreatePolicy}
            >
              + Create Policy
            </Button>
          </div>
          
          <div className="policies-list">
            {Object.keys(policies).length === 0 ? (
              <Card body className="text-center bg-light">
                No policies created yet. Click "Create Policy" to add one.
              </Card>
            ) : (
              <ListGroup>
                {Object.entries(policies).map(([id, policy]) => (
                  <ListGroup.Item 
                    key={id}
                    action
                    onClick={() => handleEditPolicy(policy)}
                    className={`d-flex justify-content-between align-items-center ${!policy.enabled ? 'disabled-policy' : ''}`}
                  >
                    <div>
                      <h5>{policy.name}</h5>
                      <div className="policy-details">
                        <span className="policy-type">{policy.policyType}</span>
                        <span className="policy-mode">{policy.policyConfig?.mode || 'interactive'}</span>
                      </div>
                    </div>
                    <div className="policy-status">
                      {policy.enabled ? (
                        <span className="badge bg-success">Enabled</span>
                      ) : (
                        <span className="badge bg-secondary">Disabled</span>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </>
      )}
      
      {showTypeSelector && (
        <div className="policy-type-selector">
          <h3>Select Policy Type</h3>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Paste Protection</Card.Title>
              <Card.Text>
                Detect and prevent sensitive data from being pasted into web forms
              </Card.Text>
              <Button 
                variant="primary"
                onClick={() => handleSelectPolicyType('pasteProtection')}
              >
                Select
              </Button>
            </Card.Body>
          </Card>
          
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>File Upload Protection</Card.Title>
              <Card.Text>
                Prevent uploading files with sensitive data
              </Card.Text>
              <Button 
                variant="primary"
                onClick={() => handleSelectPolicyType('fileUploadProtection')}
              >
                Select
              </Button>
            </Card.Body>
          </Card>
          
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>File Download Protection</Card.Title>
              <Card.Text>
                Block downloading of files with sensitive extensions
              </Card.Text>
              <Button 
                variant="primary"
                onClick={() => handleSelectPolicyType('fileDownloadProtection')}
              >
                Select
              </Button>
            </Card.Body>
          </Card>
          
          <Button 
            variant="secondary"
            onClick={() => setShowTypeSelector(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      
      {showPolicyEditor && currentPolicy && (
        <PolicyEditor
          policy={currentPolicy}
          onSave={handleSavePolicy}
          onDelete={handleDeletePolicy}
          onCancel={cancelPolicyEditor}
        />
      )}
      
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Policy"
        message={`Are you sure you want to delete "${currentPolicy?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeletePolicy}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};

export default PoliciesTab;