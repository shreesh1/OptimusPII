import React, { useEffect } from 'react';
import './SaveSuccessMessage.css';

/**
 * Component that shows a temporary success message after saving changes
 */
const SaveSuccessMessage = ({ 
  show, 
  onHide, 
  message = "Changes saved successfully", 
  duration = 3000 
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, onHide, duration]);
  
  if (!show) return null;
  
  return (
    <div className={`success-message ${show ? 'show' : 'hide'}`}>
      <div className="success-icon">✓</div>
      <div className="success-text">{message}</div>
    </div>
  );
};

export default SaveSuccessMessage;