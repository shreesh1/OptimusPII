import React, { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

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
      <div className="extension-list mb-3">
        {fileExtensions.map((ext, index) => (
          <InputGroup className="mb-2" key={index}>
            <Form.Control
              type="text"
              value={ext}
              placeholder="File extension (e.g., pdf)"
              onChange={(e) => updateExtension(index, e.target.value)}
            />
            <Button 
              variant="outline-danger"
              onClick={() => removeExtension(index)}
            >
              X
            </Button>
          </InputGroup>
        ))}
      </div>
      <Button 
        variant="outline-primary"
        onClick={addExtension}
      >
        + Add Extension
      </Button>
    </div>
  );
}