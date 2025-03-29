import React from 'react';

const CustomRegexList = ({ patterns, onChange, onDeletePattern }) => {
  const handleAddPattern = () => {
    const name = `Custom_${Date.now()}`;
    onChange({
      [name]: {
        pattern: '',
        enabled: true,
        isDefault: false,
        sampleData: 'REDACTED'
      }
    });
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
        <div key={name} className="pattern-row">
          <div className="pattern-toggle">
            <input
              type="checkbox"
              id={`toggle-${name}`}
              checked={details.enabled}
              onChange={(e) => handleTogglePattern(name, e.target.checked)}
            />
            <label htmlFor={`toggle-${name}`}></label>
          </div>
          
          <div className="pattern-name">
            <input
              type="text"
              value={name}
              onChange={(e) => handlePatternNameChange(name, e.target.value)}
              placeholder="Pattern Name"
            />
          </div>
          
          <div className="pattern-regex">
            <input
              type="text"
              value={details.pattern}
              onChange={(e) => handlePatternChange(name, e.target.value)}
              placeholder="Regular Expression Pattern"
            />
          </div>
          
          <div className="pattern-sample">
            <input
              type="text"
              value={details.sampleData || ''}
              onChange={(e) => handleSampleDataChange(name, e.target.value)}
              placeholder="REDACTED"
            />
          </div>
          
          <button
            type="button"
            className="delete-pattern"
            onClick={() => onDeletePattern(name)}
          >
            X
          </button>
        </div>
      ))}
      
      <button
        type="button"
        className="add-pattern"
        onClick={handleAddPattern}
      >
        + Add Custom Pattern
      </button>
    </div>
  );
};

export default CustomRegexList;