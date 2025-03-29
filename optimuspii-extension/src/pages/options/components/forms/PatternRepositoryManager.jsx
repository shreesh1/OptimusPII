import React, { useState, useEffect } from 'react';

export default function PatternRepositoryManager({ repository, onChange }) {
  const [defaultPatterns, setDefaultPatterns] = useState({});
  const [customPatterns, setCustomPatterns] = useState({});

  useEffect(() => {
    // Split repository into default and custom patterns
    const defaults = {};
    const customs = {};
    
    Object.entries(repository).forEach(([name, details]) => {
      if (details.isDefault) {
        defaults[name] = details;
      } else {
        customs[name] = details;
      }
    });
    
    setDefaultPatterns(defaults);
    setCustomPatterns(customs);
  }, [repository]);

  const handleTogglePattern = (name, isDefault, enabled) => {
    if (isDefault) {
      const newDefaults = { ...defaultPatterns };
      newDefaults[name].enabled = enabled;
      setDefaultPatterns(newDefaults);
      
      if (onChange) {
        onChange({ ...newDefaults, ...customPatterns });
      }
    } else {
      const newCustoms = { ...customPatterns };
      newCustoms[name].enabled = enabled;
      setCustomPatterns(newCustoms);
      
      if (onChange) {
        onChange({ ...defaultPatterns, ...newCustoms });
      }
    }
  };

  const handleSampleDataChange = (name, isDefault, sampleData) => {
    if (isDefault) {
      const newDefaults = { ...defaultPatterns };
      newDefaults[name].sampleData = sampleData;
      setDefaultPatterns(newDefaults);
      
      if (onChange) {
        onChange({ ...newDefaults, ...customPatterns });
      }
    } else {
      const newCustoms = { ...customPatterns };
      newCustoms[name].sampleData = sampleData;
      setCustomPatterns(newCustoms);
      
      if (onChange) {
        onChange({ ...defaultPatterns, ...newCustoms });
      }
    }
  };

  const handleAddCustomPattern = () => {
    const newCustoms = { ...customPatterns };
    const name = `Custom_${Date.now()}`;
    newCustoms[name] = {
      pattern: '',
      enabled: true,
      isDefault: false,
      sampleData: 'REDACTED'
    };
    setCustomPatterns(newCustoms);
    
    if (onChange) {
      onChange({ ...defaultPatterns, ...newCustoms });
    }
  };

  const handleUpdateCustomPattern = (oldName, newName, pattern) => {
    const newCustoms = { ...customPatterns };
    const details = newCustoms[oldName];
    
    // If name changed, remove old entry and create new one
    if (oldName !== newName && newName.trim()) {
      delete newCustoms[oldName];
      newCustoms[newName] = {
        ...details,
        pattern: pattern
      };
    } else if (newName.trim()) {
      // Just update existing entry
      newCustoms[oldName].pattern = pattern;
    }
    
    setCustomPatterns(newCustoms);
    
    if (onChange) {
      onChange({ ...defaultPatterns, ...newCustoms });
    }
  };

  const handleRemoveCustomPattern = (name) => {
    const newCustoms = { ...customPatterns };
    delete newCustoms[name];
    setCustomPatterns(newCustoms);
    
    if (onChange) {
      onChange({ ...defaultPatterns, ...newCustoms });
    }
  };

  return (
    <div className="pattern-repository">
      <section className="default-patterns">
        <h3>Default Patterns</h3>
        <p>These patterns are built-in and cannot be modified, but can be enabled/disabled.</p>
        
        {Object.entries(defaultPatterns).map(([name, details]) => (
          <div key={name} className="pattern-row default-pattern">
            <div className="pattern-toggle">
              <input
                type="checkbox"
                id={`toggle-${name}`}
                checked={details.enabled}
                onChange={(e) => handleTogglePattern(name, true, e.target.checked)}
              />
              <label htmlFor={`toggle-${name}`} className="toggle-label"></label>
            </div>
            
            <div className="pattern-info">
              <div className="pattern-name">{name}</div>
              <button 
                className="view-pattern-btn"
                onClick={() => alert(`Pattern for ${name}:\n\n${details.pattern}`)}
              >
                View Pattern
              </button>
            </div>
            
            <div className="pattern-sample">
              <label>Sample replacement:</label>
              <input
                type="text"
                value={details.sampleData || ''}
                placeholder="REDACTED"
                onChange={(e) => handleSampleDataChange(name, true, e.target.value)}
              />
            </div>
          </div>
        ))}
      </section>
      
      <section className="custom-patterns">
        <h3>Custom Patterns</h3>
        <p>Add your own custom regex patterns for PII detection.</p>
        
        {Object.entries(customPatterns).map(([name, details]) => (
          <div key={name} className="pattern-row custom-pattern">
            <div className="pattern-toggle">
              <input
                type="checkbox"
                id={`toggle-${name}`}
                checked={details.enabled}
                onChange={(e) => handleTogglePattern(name, false, e.target.checked)}
              />
              <label htmlFor={`toggle-${name}`} className="toggle-label"></label>
            </div>
            
            <div className="pattern-name-input">
              <input
                type="text"
                value={name}
                placeholder="Pattern Name"
                onChange={(e) => handleUpdateCustomPattern(name, e.target.value, details.pattern)}
              />
            </div>
            
            <div className="pattern-regex-input">
              <input
                type="text"
                value={details.pattern}
                placeholder="Regular Expression"
                onChange={(e) => handleUpdateCustomPattern(name, name, e.target.value)}
              />
            </div>
            
            <div className="pattern-sample">
              <input
                type="text"
                value={details.sampleData || ''}
                placeholder="REDACTED"
                onChange={(e) => handleSampleDataChange(name, false, e.target.value)}
              />
            </div>
            
            <button 
              className="remove-pattern"
              onClick={() => handleRemoveCustomPattern(name)}
            >
              X
            </button>
          </div>
        ))}
        
        <button 
          className="add-custom-pattern"
          onClick={handleAddCustomPattern}
        >
          + Add Custom Pattern
        </button>
      </section>
    </div>
  );
}