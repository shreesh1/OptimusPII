import React from 'react';
import RegexToggleSwitch from './RegexToggleSwitch';
import './RegexList.css';

const DefaultRegexList = ({ patterns, defaultPatterns, onChange }) => {
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
        <div className="default-regex-row" key={name}>
          <RegexToggleSwitch 
            enabled={details.enabled} 
            onChange={(isEnabled) => handleToggleChange(name, isEnabled)} 
          />
          
          <div className="regex-name">{name}</div>
          
          <button 
            type="button" 
            className="view-pattern-btn"
            onClick={() => showPatternDetails(name, details.pattern)}
          >
            View Pattern
          </button>
          
          <div className="sample-container">
            <label>Sample replacement:</label>
            <input
              type="text"
              className="regex-sample"
              value={details.sampleData || ''}
              placeholder="Sample replacement data"
              onChange={(e) => handleSampleChange(name, e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DefaultRegexList;