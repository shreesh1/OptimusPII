import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="policy-editor">
      <h3>{policy.policyId ? 'Edit Policy' : 'Create New Policy'}</h3>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="policyName">Policy Name</Form.Label>
          <Form.Control
            type="text"
            id="policyName"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label htmlFor="policyType">Type</Form.Label>
          <Form.Select
            id="policyType"
            name="policyType"
            value={formData.policyType}
            onChange={handleChange}
            disabled={!!policy.policyId}  // Disable changing type for existing policies
          >
            <option value="pasteProtection">Paste Protection</option>
            <option value="fileUploadProtection">File Upload Protection</option>
            <option value="fileDownloadProtection">File Download Protection</option>
          </Form.Select>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label htmlFor="policyMode">Mode</Form.Label>
          <Form.Select
            id="policyMode"
            name="mode"
            value={formData.policyConfig?.mode || 'interactive'}
            onChange={handleConfigChange}
          >
            <option value="interactive">Interactive</option>
            <option value="block">Block</option>
            <option value="log">Log Only</option>
          </Form.Select>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            id="policyEnabled"
            name="enabled"
            label="Enabled"
            checked={formData.enabled}
            onChange={handleChange}
          />
        </Form.Group>
        
        <div className="form-actions">
          <Button 
            variant="primary" 
            type="submit"
          >
            Save
          </Button>
          
          {policy.policyId && (
            <Button 
              variant="danger"
              type="button" 
              onClick={() => onDelete(policy.policyId)}
            >
              Delete
            </Button>
          )}
          
          <Button 
            variant="secondary" 
            type="button" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default PolicyEditor;