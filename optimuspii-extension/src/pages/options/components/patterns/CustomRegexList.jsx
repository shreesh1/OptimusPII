import React, { useState } from 'react';
import { Card, Button, Form, Row, Col } from 'react-bootstrap';
import RegexToggleSwitch from './RegexToggleSwitch';
import './RegexList.css';

const CustomRegexList = ({ patterns = {}, onChange, onDeletePattern, onAddPattern  }) => {
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [currentEditPattern, setCurrentEditPattern] = useState(null);

  const handleAddPattern = () => {
    if (onAddPattern) {
      onAddPattern();
    }
  };

  const handlePatternModalSave = (editedPattern) => {
    // Only save when pattern is confirmed in modal
    if (editedPattern) {
      const patternObj = {
        [editedPattern.name]: {
          pattern: editedPattern.pattern,
          enabled: editedPattern.enabled,
          isDefault: editedPattern.isDefault,
          sampleData: editedPattern.sampleData
        }
      };
      handleCustomPatternChange(patternObj);
    }
    setIsPatternModalOpen(false);
  };

  const handlePatternModalCancel = () => {
    setIsPatternModalOpen(false);
    setCurrentEditPattern(null);
  };

  const handleTogglePattern = (name, enabled) => {
    onChange({
      [name]: {
        ...patterns[name],
        enabled
      }
    });
  };
  
  const handlePatternNameChange = (oldName, newName) => {
    if (oldName === newName || !newName.trim()) return;
    
    // Check if the name already exists
    if (patterns[newName]) {
      alert(`A pattern with the name "${newName}" already exists.`);
      return;
    }
    
    // Create new pattern with updated name and remove old one
    const updatedPatterns = {};
    updatedPatterns[newName] = {
      ...patterns[oldName]
    };
    
    // To ensure deletion, we set oldName to null or undefined explicitly
    updatedPatterns[oldName] = null;
    
    onChange(updatedPatterns);
  };
  
  const handlePatternChange = (name, pattern) => {
    onChange({
      [name]: {
        ...patterns[name],
        pattern
      }
    });
  };
  
  const handleSampleDataChange = (name, sampleData) => {
    onChange({
      [name]: {
        ...patterns[name],
        sampleData
      }
    });
  };

  return (
    <div className="custom-patterns-list">
      {Object.entries(patterns).map(([name, details]) => (
        <Card className="mb-3 custom-regex-row" key={name}>
          <Card.Body>
            <Row className="align-items-center mb-2">
              <Col xs="auto">
                <RegexToggleSwitch
                  enabled={details.enabled}
                  onChange={(isEnabled) => handleTogglePattern(name, isEnabled)}
                />
              </Col>
              <Col>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => handlePatternNameChange(name, e.target.value)}
                  placeholder="Pattern Name"
                />
              </Col>
              <Col xs="auto">
                <Button 
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDeletePattern(name)}
                >
                  X
                </Button>
              </Col>
            </Row>
            
            <Form.Group className="mb-2">
              <Form.Label>Regular Expression:</Form.Label>
              <Form.Control
                type="text"
                value={details.pattern}
                onChange={(e) => handlePatternChange(name, e.target.value)}
                placeholder="Regular Expression Pattern"
              />
            </Form.Group>
            
            <Form.Group>
              <Form.Label>Sample Replacement:</Form.Label>
              <Form.Control
                type="text"
                value={details.sampleData || ''}
                onChange={(e) => handleSampleDataChange(name, e.target.value)}
                placeholder="REDACTED"
              />
            </Form.Group>
          </Card.Body>
        </Card>
      ))}
      
      <Button 
        variant="primary"
        onClick={handleAddPattern}
        className="mt-2"
      >
        + Add Custom Pattern
      </Button>
    </div>
  );
};

export default CustomRegexList;