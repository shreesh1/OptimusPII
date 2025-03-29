import React from 'react';
import './UnsavedChangesAlert.css';

/**
 * Alert component that shows when user attempts to navigate away with unsaved changes
 */
const UnsavedChangesAlert = ({ 
  isOpen, 
  onStay, 
  onLeave, 
  message = "You have unsaved changes. Are you sure you want to leave?"
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content unsaved-changes-alert">
        <div className="modal-header">
          <h3 className="modal-title">Unsaved Changes</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="button-secondary" onClick={onStay}>Stay on Page</button>
          <button className="button-danger" onClick={onLeave}>Discard Changes</button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesAlert;