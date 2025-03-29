import {React, useEffect} from 'react';
import { Card, Button, Form, InputGroup } from 'react-bootstrap';
import RegexToggleSwitch from './RegexToggleSwitch';
import './RegexList.css';

const DefaultRegexList = ({ patterns, defaultPatterns, onChange }) => {
  useEffect(() => {
      console.log('Current state:', { patterns });
    }, [patterns]);

  const handleToggleChange = (name, isEnabled) => {
    const updatedPattern = {
      [name]: {
        ...patterns[name],
        enabled: isEnabled
      }
    };
    
    onChange(updatedPattern);
  };
  
  const handleSampleChange = (name, sample) => {
    const updatedPattern = {
      [name]: {
        ...patterns[name],
        sampleData: sample
      }
    };
    
    onChange(updatedPattern);
  };
  
  const showPatternDetails = (name, pattern) => {
    alert(`Pattern for ${name}:\n\n${pattern}`);
  };
  
  return (
    <div className="default-regex-list">
      {Object.entries(patterns).map(([name, details]) => (
        <Card className="mb-3 default-regex-row" key={name}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="d-flex align-items-center">
                <RegexToggleSwitch 
                  enabled={details.enabled} 
                  onChange={(isEnabled) => handleToggleChange(name, isEnabled)} 
                />
                <span className="ms-2 fw-bold">{name}</span>
              </div>
              
              <Button 
                variant="outline-secondary"
                size="sm"
                onClick={() => showPatternDetails(name, details.pattern)}
              >
                View Pattern
              </Button>
            </div>
            
            <Form.Group>
              <Form.Label>Sample replacement:</Form.Label>
              <Form.Control
                type="text"
                value={details.sampleData || ''}
                placeholder="Sample replacement data"
                onChange={(e) => handleSampleChange(name, e.target.value)}
              />
            </Form.Group>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default DefaultRegexList;