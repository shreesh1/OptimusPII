import React, { useState } from 'react';
import { Button, ListGroup, Card, Badge } from 'react-bootstrap';
import { StorageService } from '../../services/StorageService';
import DomainMappingEditor from '../forms/DomainMappingEditor';
import ConfirmModal from '../ConfirmModal';
import './DomainMappingsTab.css';

const DomainMappingsTab = ({ domainMappings, setDomainMappings, policies, onChange }) => {
  const [currentMapping, setCurrentMapping] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const handleCreateMapping = () => {
    setCurrentMapping({
      domainPattern: '',
      appliedPolicies: []
    });
    setShowEditor(true);
  };
  
  const handleEditMapping = (mapping) => {
    setCurrentMapping({...mapping});
    setShowEditor(true);
  };
  
  const handleSaveMapping = async (mapping) => {
    console.log('handleSaveMapping called with mapping:', mapping);
    try {
      const updatedMappings = await StorageService.saveDomainMapping(mapping,domainMappings);
      setDomainMappings(updatedMappings);
      setShowEditor(false);
      setCurrentMapping(null);
      onChange();
    } catch (error) {
      console.error('Error saving domain mapping:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDeleteMapping = async () => {
    setShowConfirmDelete(true);
  };
  
  const confirmDeleteMapping = async () => {
    if (!currentMapping?.domainPattern) return;
    
    try {
      const updatedMappings = await StorageService.deleteDomainMapping(currentMapping.domainPattern, domainMappings);
      setDomainMappings(updatedMappings);
      setShowConfirmDelete(false);
      setShowEditor(false);
      setCurrentMapping(null);
      onChange();
    } catch (error) {
      console.error('Error deleting domain mapping:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const cancelEditor = () => {
    setShowEditor(false);
    setCurrentMapping(null);
  };
  
  const getPolicyName = (policyId) => {
    return policies[policyId]?.policyName || policyId;
  };
  
  return (
    <div className="domain-mappings-tab">
      {!showEditor && (
        <>
          <div className="domain-mappings-header d-flex justify-content-between align-items-center mb-3">
            <h3>Domain Mappings</h3>
            <Button 
              variant="primary"
              onClick={handleCreateMapping}
            >
              + Add Domain Mapping
            </Button>
          </div>
          
          <div className="domain-mappings-list">
            {Object.keys(domainMappings).length === 0 ? (
              <Card body className="text-center bg-light">
                No domain mappings created yet. Click "Add Domain Mapping" to create one.
              </Card>
            ) : (
              <ListGroup>
                {Object.entries(domainMappings).map(([pattern, mapping]) => (
                  <ListGroup.Item 
                    key={pattern}
                    action
                    onClick={() => handleEditMapping(mapping)}
                  >
                    <div className="domain-pattern">
                      <strong>{mapping.domainPattern}</strong>
                    </div>
                    <div className="applied-policies mt-2">
                      {mapping.appliedPolicies.length === 0 ? (
                        <span className="text-muted">No policies applied</span>
                      ) : (
                        <div>
                          {mapping.appliedPolicies.map(policyId => (
                            <Badge 
                              key={policyId}
                              bg={policies[policyId]?.enabled ? "primary" : "secondary"}
                              className="me-1"
                            >
                              {getPolicyName(policyId)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
        </>
      )}
      
      {showEditor && currentMapping && (
        <DomainMappingEditor
          mapping={currentMapping}
          policies={policies}
          onSave={handleSaveMapping}
          onDelete={handleDeleteMapping}
          onCancel={cancelEditor}
        />
      )}
      
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Domain Mapping"
        message={`Are you sure you want to delete mapping for "${currentMapping?.domainPattern}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMapping}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
};

export default DomainMappingsTab;