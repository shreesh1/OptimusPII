import { useState, useEffect } from 'react';

export default function useChangeTracker() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };
  
  const resetChangeState = () => {
    setHasUnsavedChanges(false);
  };
  
  // Setup beforeunload handler to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  return {
    hasUnsavedChanges,
    markAsChanged,
    resetChangeState
  };
}