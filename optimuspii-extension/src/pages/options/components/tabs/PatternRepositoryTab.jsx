import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, Button } from 'react-bootstrap';
import { StorageService } from '../../services/StorageService';
import DefaultRegexList from '../patterns/DefaultRegexList';
import CustomRegexList from '../patterns/CustomRegexList';
import ConfirmModal from '../ConfirmModal';
import './PatternRepositoryTab.css';

const PatternRepositoryTab = ({ patterns, setPatterns, onChange }) => {
  const [defaultPatterns, setDefaultPatterns] = useState({});
  const [customPatterns, setCustomPatterns] = useState({});
  const [patternToDelete, setPatternToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [tabKey, setTabKey] = useState('default');
  
  useEffect(() => {
    console.log('PatternRepositoryTab patterns:', patterns);
    if (patterns) {
      const defaults = {};
      const customs = {};
      
      Object.entries(patterns).forEach(([name, pattern]) => {
        if (pattern.isDefault) {
          defaults[name] = pattern;
        } else {
          customs[name] = pattern;
        }
      });
      
      setDefaultPatterns(defaults);
      setCustomPatterns(customs);
    }
  }, [patterns]);
  
  const handleDefaultPatternChange = async (updatedPattern) => {
    try {
      const patternName = Object.keys(updatedPattern)[0];
      const newPattern = updatedPattern[patternName];
      
      const updatedPatterns = await StorageService.savePattern(patternName, newPattern);
      setPatterns(updatedPatterns);
      onChange();
    } catch (error) {
      console.error('Error updating default pattern:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleCustomPatternChange = async (updatedPattern) => {
    try {
      const patternName = Object.keys(updatedPattern)[0];
      const newPattern = updatedPattern[patternName];
      
      if (newPattern === null || newPattern === undefined) {
        // This is a pattern rename operation
        const oldPatternKey = patternName;
        const newPatternKey = Object.keys(updatedPattern)[1];
        
        // Delete old key and add new one
        const updatedPatterns = await StorageService.renamePattern(oldPatternKey, newPatternKey, updatedPattern[newPatternKey]);
        setPatterns(updatedPatterns);
      } else {
        // This is a normal pattern update
        const updatedPatterns = await StorageService.savePattern(patternName, newPattern);
        setPatterns(updatedPatterns);
      }
      onChange();
    } catch (error) {
      console.error('Error updating custom pattern:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDeletePattern = (name) => {
    setPatternToDelete(name);
    setShowConfirmDelete(true);
  };
  
  const confirmDeletePattern = async () => {
    if (!patternToDelete) return;
    
    try {
      const updatedPatterns = await StorageService.deletePattern(patternToDelete);
      setPatterns(updatedPatterns);
      setShowConfirmDelete(false);
      setPatternToDelete(null);
      onChange();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const resetDefaultPatterns = async () => {
    if (window.confirm('Are you sure you want to reset all default patterns to their original state? Any customizations will be lost.')) {
      try {
        const updatedPatterns = await StorageService.resetDefaultPatterns();
        setPatterns(updatedPatterns);
        onChange();
      } catch (error) {
        console.error('Error resetting default patterns:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };
  
  return (
    <div className="pattern-repository-tab">
      <h3>Pattern Repository</h3>
      <p className="text-muted">
        Manage the patterns used to detect sensitive information.
      </p>
      
      <Tabs
        activeKey={tabKey}
        onSelect={k => setTabKey(k)}
        className="mb-3"
      >
        <Tab eventKey="default" title="Default Patterns">
          <div className="default-patterns-tab">
            <div className="d-flex justify-content-end mb-3">
              <Button 
                variant="outline-secondary"
                onClick={resetDefaultPatterns}
              >
                Reset to Default
              </Button>
            </div>
            
            <DefaultRegexList
              patterns={defaultPatterns}
              defaultPatterns={defaultPatterns}
              onChange={handleDefaultPatternChange}
            />
          </div>
        </Tab>
        
        <Tab eventKey="custom" title="Custom Patterns">
          <div className="custom-patterns-tab">
            <CustomRegexList
              patterns={customPatterns}
              onChange={handleCustomPatternChange}
              onDeletePattern={handleDeletePattern}
            />
          </div>
        </Tab>
      </Tabs>
      
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Pattern"
        message={`Are you sure you want to delete the pattern "${patternToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeletePattern}
        onCancel={() => {
          setShowConfirmDelete(false);
          setPatternToDelete(null);
        }}
      />
    </div>
  );
};

export default PatternRepositoryTab;