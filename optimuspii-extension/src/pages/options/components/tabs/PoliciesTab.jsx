import React, { useState } from 'react';
import { Button, ListGroup, Card, Badge } from 'react-bootstrap';
import { StorageService } from '../../services/StorageService';
import PolicyEditor from '../forms/PolicyEditor';
import ConfirmModal from '../ConfirmModal';
import './PoliciesTab.css';

const PoliciesTab = ({ policies, setPolicies, domainMappings, setDomainMappings, handleDataChange }) => {
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const handleCreatePolicy = () => {
    setShowTypeSelector(true);
  };

  // Add these helper functions inside the component
  const GetPolicyTypeColor = (type) => {
    switch (type) {
      case 'pasteProtection': return 'primary';
      case 'fileUploadProtection': return 'info';
      case 'fileDownloadProtection': return 'warning';
      default: return 'secondary';
    }
  };

  const GetModeColor = (mode) => {
    switch (mode) {
      case 'block': return 'danger';
      case 'interactive': return 'info';
      case 'log': return 'dark';
      default: return 'secondary';
    }
  };

  const FormatPolicyType = (type) => {
    switch (type) {
      case 'pasteProtection': return 'Paste';
      case 'fileUploadProtection': return 'Upload';
      case 'fileDownloadProtection': return 'Download';
      default: return type;
    }
  };

  const handleSelectPolicyType = async (policyType) => {
    const newPolicy = await StorageService.createNewPolicy(policyType);
    setCurrentPolicy(newPolicy);
    setShowPolicyEditor(true);
    setShowTypeSelector(false);
  };

  const handleEditPolicy = (policy) => {
    setCurrentPolicy({ ...policy });
    setShowPolicyEditor(true);
  };

  const handleSavePolicy = async (policy) => {
    console.log('handleSavePolicy called with policy:', policy);
    try {
      const updatedPolicies = await StorageService.savePolicy(policy, policies);
      setPolicies(updatedPolicies);
      setShowPolicyEditor(false);
      setCurrentPolicy(null);
      handleDataChange();
    } catch (error) {
      console.error('Error saving policy:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePolicy = async (policyId) => {
    setShowConfirmDelete(true);
  };

  const confirmDeletePolicy = async () => {
    console.log('confirmDeletePolicy called with policyId:', currentPolicy?.policyId);
    if (!currentPolicy?.policyId) return;
    if (currentPolicy.policyId === 'default-file-upload-policy' || currentPolicy.policyId === 'default-paste-policy') {
      alert('Cannot delete default policies. Please create a new policy first.');
      setShowConfirmDelete(false);
      return;
    }

    try {
      const updatedData = await StorageService.deletePolicy(
        currentPolicy.policyId,
        policies,
        domainMappings
      );

      setPolicies(updatedData.policies);
      setDomainMappings(updatedData.domainMappings);
      setShowConfirmDelete(false);
      setShowPolicyEditor(false);
      setCurrentPolicy(null);
      handleDataChange();
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
                      <h5>{policy.policyName}</h5>
                      <div className="policy-details">
                        <Badge
                          pill
                          bg={GetPolicyTypeColor(policy.policyType)}
                          className="me-2"
                        >
                          {FormatPolicyType(policy.policyType)}
                        </Badge>
                        <Badge
                          pill
                          bg={GetModeColor(policy.policyConfig?.mode || 'interactive')}
                        >
                          {policy.policyConfig?.mode || 'interactive'}
                        </Badge>
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
              <Card.Title>File Download Protection (In Working)</Card.Title>
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
          onChange={handleDataChange}
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