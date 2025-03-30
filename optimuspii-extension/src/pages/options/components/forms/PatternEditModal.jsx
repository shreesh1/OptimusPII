import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const PatternEditModal = ({ show, onSave, onCancel, initialPattern = null }) => {
  const [pattern, setPattern] = useState({
    name: '',
    pattern: '',
    enabled: true,
    isDefault: false,
    sampleData: ''
  });

  useEffect(() => {
    if (initialPattern) {
      setPattern({
        name: initialPattern.name || '',
        pattern: initialPattern.pattern || '',
        enabled: initialPattern.enabled !== false,
        isDefault: initialPattern.isDefault || false,
        sampleData: initialPattern.sampleData || ''
      });
    }
  }, [initialPattern, show]);

  const handleChange = (field, value) => {
    setPattern(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Basic validation
    if (!pattern.name.trim()) {
      alert('Pattern name is required');
      return;
    }
    if (!pattern.pattern.trim()) {
      alert('Regular expression is required');
      return;
    }

    // Test if regex is valid
    try {
      new RegExp(pattern.pattern);
    } catch (e) {
      alert(`Invalid regular expression: ${e.message}`);
      return;
    }

    onSave(pattern);
  };

  return (
    <Modal show={show} onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>{initialPattern ? 'Edit Pattern' : 'Add New Pattern'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Pattern Name</Form.Label>
            <Form.Control
              type="text" 
              value={pattern.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Regular Expression</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={pattern.pattern}
              onChange={(e) => handleChange('pattern', e.target.value)}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Sample Data</Form.Label>
            <Form.Control
              type="text"
              value={pattern.sampleData}
              onChange={(e) => handleChange('sampleData', e.target.value)}
            />
            <Form.Text className="text-muted">
              Example text that matches this pattern
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Enabled" 
              checked={pattern.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Pattern</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PatternEditModal;