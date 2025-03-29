import React, { useState } from 'react';
import { StorageService } from '../../services/StorageService';
import DomainMappingEditor from '../forms/DomainMappingEditor';
import ConfirmModal from '../ConfirmModal';
import './DomainMappingsTab.css';

const DomainMappingsTab = ({ domainMappings, setDomainMappings, policies, onChange }) => {
  const [currentMapping, setCurrentMapping] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const handleCreateMapping = () => {
    setCurrentMapping({ domainPattern: '', appliedPolicies: [] });
    setShowEditor(true);
  };

  const handleEditMapping = (mapping) => {
    setCurrentMapping({...mapping});
    setShowEditor(true);
  };

  const handleSaveMapping = async (mapping) => {
    try {
      const updatedMappings = await StorageService.saveDomainMapping(mapping, domainMappings);
      setDomainMappings(updatedMappings);
      setShowEditor(false);
      setCurrentMapping(null);
      onChange();
    } catch (error) {
      console.error('Failed to save domain mapping:', error);
      // Add error handling UI here
    }
  };

  const handleDeleteMapping = async () => {
    if (!currentMapping?.domainPattern) return;
    
    try {
      const updatedMappings = await StorageService.deleteDomainMapping(
        currentMapping.domainPattern, 
        domainMappings
      );
      
      setDomainMappings(updatedMappings);
      setShowEditor(false);
      setShowConfirmDelete(false);
      setCurrentMapping(null);
      onChange();
    } catch (error) {
      console.error('Failed to delete domain mapping:', error);
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
    setShowEditor(false);
    setCurrentMapping(null);
  };

  return (
    <div className="domain-mappings-tab">
      <h2>Domain Policy Mappings</h2>
      
      <div className="domain-mapping-container">
        {domainMappings.length === 0 ? (
          <div className="empty-list-message">
            No domain mappings defined. Click "Add Domain Mapping" below to create one.
          </div>
        ) : (
          <div className="mapping-list">
            {domainMappings.map((mapping, index) => (
              <div 
                key={index} 
                className="domain-mapping-item"
              >
                <div className="domain-pattern">{mapping.domainPattern}</div>
                <div className="domain-policies">
                  {mapping.appliedPolicies.map(id => 
                    policies[id]?.policyName || id
                  ).join(', ') || 'No policies applied'}
                </div>
                <button 
                  className="edit-button button-secondary"
                  onClick={() => handleEditMapping(mapping)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button 
          className="create-mapping-button"
          onClick={handleCreateMapping}
        >
          Add Domain Mapping
        </button>
      </div>

      {showEditor && currentMapping && (
        <DomainMappingEditor
          mapping={currentMapping}
          policies={policies}
          onSave={handleSaveMapping}
          onDelete={confirmDelete}
          onCancel={handleCancelEdit}
        />
      )}

      {showConfirmDelete && (
        <ConfirmModal
          message="Are you sure you want to delete this domain mapping? This action cannot be undone."
          onConfirm={handleDeleteMapping}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
};

export default DomainMappingsTab;