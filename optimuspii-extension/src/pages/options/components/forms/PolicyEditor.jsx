import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, ListGroup } from 'react-bootstrap';
import FileExtensionManager from '../utils/FileExtensionManager';
import RegexPatternManager from '../utils/RegexPatternManager';
import './PolicyEditor.css';

const PolicyEditor = ({ policy, onSave, onDelete, onCancel, onChange }) => {
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

  const handlePatternsChange = (patternName) => {
    setSelectedPatterns(patternName);
    onChange();
  };

  const handleExtensionsChange = (newExtensions) => {
    setExtensions(newExtensions);
    onChange();
  };

  const handleSubmit = (e) => {
    console.log("handleSubmit called with formData:", formData);
    e.preventDefault();
    
    // Prepare final policy data
    const updatedPolicy = {
      ...formData,
      policyConfig: {
        ...formData.policyConfig,
        enabledPatterns: selectedPatterns,
        blockedExtensions: extensions
      }
    };
    
    onSave(updatedPolicy);
  };

  return (
    <div className="policy-editor">
      <h3>{policy.policyId ? 'Edit Policy' : 'Create New Policy'}</h3>
      <Form onSubmit={handleSubmit}>
        {/* Common fields like name, type, etc. */}
        <Form.Group className="mb-3">
          <Form.Label>Policy Name</Form.Label>
          <Form.Control
            type="text"
            name="policyName"
            value={formData.policyName || ''}
            onChange={handleChange}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Policy Type</Form.Label>
          <Form.Select 
            name="policyType" 
            value={formData.policyType || ''}
            onChange={handleChange}
            required
          >
            <option value="">Select Policy Type</option>
            <option value="pasteProtection">Paste Protection</option>
            <option value="fileUploadProtection">File Upload Protection</option>
            <option value="fileDownloadProtection">File Download Protection (In Working)</option>
          </Form.Select>
        </Form.Group>
        
        {/* Show the appropriate manager based on policy type */}
        {formData.policyType === 'pasteProtection' && (
          <RegexPatternManager
            patterns={selectedPatterns}
            onChange={handlePatternsChange}
          />
        )}
        
        {(formData.policyType === 'fileUploadProtection' || 
          formData.policyType === 'fileDownloadProtection') && (
          <FileExtensionManager
            extensions={extensions}
            onChange={handleExtensionsChange}
          />
        )}
        
        {/* Action buttons */}
        <div className="d-flex justify-content-end mt-4">
          {policy.policyId && (
            <Button 
              variant="danger" 
              className="me-2"
              onClick={(e) => {
                e.preventDefault();
                onDelete(policy.policyId);
              }}
              type="button"
            >
              Delete
            </Button>
          )}
          <Button 
            variant="secondary" 
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
          >
            {policy.policyId ? 'Update' : 'Create'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default PolicyEditor;