import React, { useState, useEffect } from 'react';
import useChangeTracker from './components/UseChangeTracker';
import ConfirmModal from './components/ConfirmModal';
import SaveSuccessMessage from './components/SaveSuccessMessage';
import { StorageService } from './services/StorageService';
import TabNavigation from './components/TabNavigation';
import PoliciesTab from './components/tabs/PoliciesTab';
import DomainMappingsTab from './components/tabs/DomainMappingsTab';
import PatternRepositoryTab from './components/tabs/PatternRepositoryTab';
import UnsavedChangesAlert from './components/UnsavedChangesAlert';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('policies');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [policies, setPolicies] = useState({});
  const [domainMappings, setDomainMappings] = useState([]);
  const [patternRepository, setPatternRepository] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  
  // Use our change tracker hook
  const { hasUnsavedChanges, markAsChanged, resetChangeState } = useChangeTracker();
  
  // Load all data on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [policiesData, mappingsData, patternsData] = await Promise.all([
          StorageService.getAllPolicies(),
          StorageService.getAllDomainMappings(),
          StorageService.getPatternRepository()
        ]);
        
        setPolicies(policiesData);
        setDomainMappings(mappingsData);
        setPatternRepository(patternsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Implement error handling UI here
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, []);

  // Handle unsaved changes warning on page leave
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Listen for domain mapping changes to register content scripts
  useEffect(() => {
    const handleStorageChanges = (changes, area) => {
      if (area === 'local' && changes.domainMappings) {
        const newMappings = changes.domainMappings.newValue || [];
        if (newMappings.length > 0) {
          const contentUrls = newMappings.map(mapping => mapping.domainPattern);
          window.OptimusPII.registerContentScriptsForUrls(contentUrls);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanges);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanges);
    };
  }, []);

  const handleTabChange = (tab) => {
    if (hasUnsavedChanges) {
      // Set pending action to change tab
      setPendingAction(() => () => setActiveTab(tab));
      setShowConfirmModal(true);
    } else {
      setActiveTab(tab);
    }
  };
  
  const handleConfirmNavigation = () => {
    // Execute pending action
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    resetChangeState();
    setShowConfirmModal(false);
  };
  
  const handleCancelNavigation = () => {
    setPendingAction(null);
    setShowConfirmModal(false);
  };
  
  const handleSaveSuccess = (message) => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    resetChangeState();
  };
  
  const handleChange = () => {
    markAsChanged();
  };

  // Add this function to handle saving all changes
  const handleSaveChanges = async () => {
    try {
      // Show saving indicator if needed
      
      // Save all data
      const savePromises = [
        StorageService.savePolicies(policies),
        StorageService.saveDomainMappings(domainMappings),
        StorageService.savePatternRepository(patternRepository)
      ];
      
      await Promise.all(savePromises);
      
      // Show success message
      handleSaveSuccess('All changes saved successfully');
      
      // If domain mappings changed, ensure content scripts are registered
      if (window.OptimusPII && typeof window.OptimusPII.registerContentScriptsForUrls === 'function') {
        const contentUrls = domainMappings.map(mapping => mapping.domainPattern);
        window.OptimusPII.registerContentScriptsForUrls(contentUrls);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setErrorMessage(`Failed to save changes: ${error.message}`);
    }
  };

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>OptimusPII Options</h1>
        <div className="header-actions">
          {hasUnsavedChanges && <span className="unsaved-indicator">Unsaved changes</span>}
          <button 
            className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </button>
        </div>
      </header>

      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <div className="tab-content-container">
        {loadingData ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className={`tab-content ${activeTab === 'policies' ? 'active' : ''}`}>
              <PoliciesTab 
                policies={policies}
                setPolicies={setPolicies}
                domainMappings={domainMappings}
                setDomainMappings={setDomainMappings}
                onChange={handleChange}
              />
            </div>
            
            <div className={`tab-content ${activeTab === 'domain' ? 'active' : ''}`}>
              <DomainMappingsTab 
                domainMappings={domainMappings}
                setDomainMappings={setDomainMappings}
                policies={policies}
                onChange={handleChange}
              />
            </div>
            
            <div className={`tab-content ${activeTab === 'pattern' ? 'active' : ''}`}>
              <PatternRepositoryTab 
                patternRepository={patternRepository}
                setPatternRepository={setPatternRepository}
                onChange={handleChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Confirmation modal for unsaved changes */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave this tab?"
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
      
      {/* Save success message */}
      {saveSuccess && <SaveSuccessMessage />}
      
      {/* Error message display */}
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
          <button onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}
    </div>
  );
}