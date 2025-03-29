import React from 'react';
import { Alert } from 'react-bootstrap';

export default function UnsavedChangesAlert() {
  return (
    <Alert variant="warning">
      You have unsaved changes
    </Alert>
  );
}