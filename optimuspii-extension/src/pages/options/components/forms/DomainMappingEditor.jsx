import React, { useState } from 'react';
import { Form, Button, ListGroup } from 'react-bootstrap';
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

  return (
    <div className="domain-mapping-editor">
      <h3>{mapping.domainPattern ? 'Edit Domain Mapping' : 'Create New Domain Mapping'}</h3>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="domainPattern">Domain Pattern</Form.Label>
          <Form.Control
            type="text"
            id="domainPattern"
            value={formData.domainPattern}
            onChange={handleDomainChange}
            placeholder="Example: *.example.com"
            required
          />
          <Form.Text className="text-muted">
            Use * as a wildcard. For example, *.example.com will match subdomains of example.com
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Applied Policies</Form.Label>
          <ListGroup>
            {Object.entries(policies).map(([id, policy]) => (
              <ListGroup.Item key={id} className="policy-item">
                <Form.Check
                  type="checkbox"
                  id={`policy-${id}`}
                  label={policy.policyName}
                  checked={formData.appliedPolicies.includes(id)}
                  onChange={() => handlePolicyToggle(id)}
                />
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Form.Group>
        
        <div className="form-actions">
          <Button 
            variant="primary" 
            type="submit"
          >
            Save
          </Button>
          
          {mapping.domainPattern && (
            <Button 
              variant="danger"
              type="button" 
              onClick={onDelete}
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

export default DomainMappingEditor;