import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

export default function FileExtensionManager({ extensions = [], onChange }) {
  const [fileExtensions, setFileExtensions] = useState(extensions);

  useEffect(() => {
    console.log("FileExtensionManager mounted with extensions:", extensions);
    if (extensions) {
      setFileExtensions(extensions);
    }
  }, [extensions]);

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
      <div className="extension-list mb-3">
        {fileExtensions.map((ext, index) => (
          <div key={index} className="extension-row">
            <Form.Control
              type="text"
              value={ext}
              onChange={(e) => updateExtension(index, e.target.value)}
              placeholder="File extension (without dot)"
            />
            <Button 
              variant="outline-secondary" 
              className="remove-extension" 
              onClick={() => removeExtension(index)}
            >
              X
            </Button>
          </div>
        ))}
      </div>
      
      <Button 
        variant="success" 
        className="add-extension" 
        onClick={addExtension}
      >
        + Add Extension
      </Button>
    </div>
  );
}