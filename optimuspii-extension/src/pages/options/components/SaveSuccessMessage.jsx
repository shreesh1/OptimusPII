import React from 'react';
import { Alert } from 'react-bootstrap';

export default function SaveSuccessMessage() {
  return (
    <Alert variant="success" className="save-success-message">
      Changes saved successfully!
    </Alert>
  );
}