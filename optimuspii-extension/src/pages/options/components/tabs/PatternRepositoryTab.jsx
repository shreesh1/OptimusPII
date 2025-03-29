import React, { useState, useEffect } from 'react';
import DefaultRegexList from '../patterns/DefaultRegexList';
import CustomRegexList from '../patterns/CustomRegexList';
import ConfirmModal from '../ConfirmModal';
import './PatternRepositoryTab.css';

const PatternRepositoryTab = ({ patternRepository, setPatternRepository, onChange, onSaved }) => {
  const [defaultPatterns, setDefaultPatterns] = useState({});
  const [customPatterns, setCustomPatterns] = useState({});
  const [OptimusPII, setOptimusPII] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmModalProps, setConfirmModalProps] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  
  // Get OptimusPII from window on mount
  useEffect(() => {
    if (window.OptimusPII) {
      setOptimusPII(window.OptimusPII);
    }
  }, []);
  
  // Split repository into default and custom patterns
  useEffect(() => {
    const defaultPats = {};
    const customPats = {};
    
    Object.entries(patternRepository).forEach(([name, details]) => {
      if (details.isDefault) {
        defaultPats[name] = details;
      } else {
        customPats[name] = details;
      }
    });
    
    setDefaultPatterns(defaultPats);
    setCustomPatterns(customPats);
  }, [patternRepository]);
  
  const handleDefaultPatternsChange = (updatedPatterns) => {
    setPatternRepository(prev => ({
      ...prev,
      ...updatedPatterns
    }));
    onChange();
  };
  
  const handleCustomPatternsChange = (updatedPatterns) => {
    setPatternRepository(prev => ({
      ...prev,
      ...updatedPatterns
    }));
    onChange();
  };

  // New functions from the vanilla JS implementation
  const handleSavePatternRepository = async () => {
    setIsSaving(true);
    try {
      // Save patterns using StorageService
      await window.chrome.storage.local.set({ patternRepository });
      
      // Notify parent component of successful save
      if (onSaved) {
        onSaved('Pattern repository saved successfully');
      }
    } catch (err) {
      console.error('Error saving pattern repository:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePattern = (name) => {
    setConfirmModalProps({
      isOpen: true,
      title: 'Delete Pattern',
      message: `Are you sure you want to delete the "${name}" pattern?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    
    // Store the action to execute if confirmed
    setConfirmAction(() => () => {
      // Remove pattern from repository
      const newRepository = { ...patternRepository };
      delete newRepository[name];
      setPatternRepository(newRepository);
      onChange();
    });
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    
    setConfirmModalProps({ ...confirmModalProps, isOpen: false });
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setConfirmModalProps({ ...confirmModalProps, isOpen: false });
    setConfirmAction(null);
  };

  const handleAddDefaultPatterns = () => {
    if (!OptimusPII) return;
    
    // Get all available default patterns that aren't already in the repository
    const missingDefaults = {};
    Object.entries(OptimusPII.DEFAULT_REGEX_PATTERNS).forEach(([name, pattern]) => {
      if (!defaultPatterns[name]) {
        missingDefaults[name] = {
          pattern,
          enabled: true,
          isDefault: true,
          sampleData: 'REDACTED'
        };
      }
    });
    
    if (Object.keys(missingDefaults).length === 0) {
      alert('All default patterns are already added.');
      return;
    }
    
    setPatternRepository(prev => ({
      ...prev,
      ...missingDefaults
    }));
    onChange();
  };

  return (
    <div className="pattern-repository-tab">
      <h2>Pattern Repository</h2>
      <p className="tab-description">
        Configure regex patterns used for detecting and redacting sensitive information.
      </p>
      
      <div className="patterns-section">
        <h3>Default Patterns</h3>
        <p>These patterns are included with OptimusPII. You can enable/disable them and customize the replacement text.</p>
        
        {OptimusPII && (
          <DefaultRegexList 
            patterns={defaultPatterns} 
            defaultPatterns={OptimusPII.DEFAULT_REGEX_PATTERNS}
            onChange={handleDefaultPatternsChange}
          />
        )}
        
        {/* Add button to restore any missing default patterns */}
        <button 
          type="button"
          className="restore-defaults-btn"
          onClick={handleAddDefaultPatterns}
        >
          Restore Missing Default Patterns
        </button>
      </div>
      
      <div className="patterns-section">
        <h3>Custom Patterns</h3>
        <p>Create your own regex patterns to detect additional types of sensitive information.</p>
        
        <CustomRegexList 
          patterns={customPatterns} 
          onChange={handleCustomPatternsChange}
          onDeletePattern={confirmDeletePattern}
        />
      </div>
      
      <div className="actions-container">
        <button 
          type="button" 
          className="save-btn primary-btn"
          onClick={handleSavePatternRepository}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Patterns'}
        </button>
      </div>
      
      <ConfirmModal 
        {...confirmModalProps}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default PatternRepositoryTab;