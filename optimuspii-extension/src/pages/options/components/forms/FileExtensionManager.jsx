import React, { useState } from 'react';

export default function FileExtensionManager({ extensions = [], onChange }) {
  const [fileExtensions, setFileExtensions] = useState(extensions);

  const addExtension = () => {
    setFileExtensions([...fileExtensions, '']);
    if (onChange) onChange([...fileExtensions, '']);
  };

  const removeExtension = (index) => {
    const newExtensions = fileExtensions.filter((_, i) => i !== index);
    setFileExtensions(newExtensions);
    if (onChange) onChange(newExtensions);
  };

  const updateExtension = (index, value) => {
    const newExtensions = [...fileExtensions];
    newExtensions[index] = value.trim().toLowerCase();
    setFileExtensions(newExtensions);
    if (onChange) onChange(newExtensions);
  };

  return (
    <div className="extension-manager">
      <h4>Blocked File Extensions</h4>
      <div className="extension-list">
        {fileExtensions.map((ext, index) => (
          <div key={index} className="extension-row">
            <input
              type="text"
              className="extension-input"
              value={ext}
              placeholder="File extension (e.g., pdf)"
              onChange={(e) => updateExtension(index, e.target.value)}
            />
            <button 
              type="button" 
              className="remove-extension"
              onClick={() => removeExtension(index)}
            >
              X
            </button>
          </div>
        ))}
      </div>
      <button 
        type="button" 
        className="add-extension"
        onClick={addExtension}
      >
        + Add Extension
      </button>
    </div>
  );
}