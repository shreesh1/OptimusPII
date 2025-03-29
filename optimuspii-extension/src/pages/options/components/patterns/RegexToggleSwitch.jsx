import React, { useState, useEffect } from 'react';
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
    <label className="switch">
      <input 
        type="checkbox" 
        className="toggle-regex" 
        checked={isEnabled} 
        onChange={handleChange}
      />
      <span className="slider">
        <span className="handle"></span>
      </span>
    </label>
  );
};

export default RegexToggleSwitch;