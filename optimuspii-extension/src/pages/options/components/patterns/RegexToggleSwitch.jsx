import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import './RegexToggleSwitch.css';

const RegexToggleSwitch = ({ enabled, onChange }) => {
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);
  
  const handleChange = (e) => {
    setIsEnabled(e.target.checked);
    onChange(e.target.checked);
  };
  
  return (
    <Form.Check 
      type="switch"
      id={`regex-switch-${Math.random().toString(36).substring(7)}`}
      checked={isEnabled}
      onChange={handleChange}
      className="regex-toggle-switch"
    />
  );
};

export default RegexToggleSwitch;