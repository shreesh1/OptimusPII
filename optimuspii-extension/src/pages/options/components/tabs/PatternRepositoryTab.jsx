import React, { useState, useEffect } from 'react';
import { Card, Alert } from 'react-bootstrap';
import { StorageService } from '../../services/StorageService';
import RegexPatternManager from '../utils/RegexPatternManager';
import ConfirmModal from '../ConfirmModal';
import './PatternRepositoryTab.css';

const PatternRepositoryTab = ({ patterns, setPatterns, onChange }) => {
  const [patternArray, setPatternArray] = useState([]);
  const [patternToDelete, setPatternToDelete] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Transform the patterns object to array format expected by RegexPatternManager
  useEffect(() => {
    if (patterns) {
      const patternsArray = Object.entries(patterns).map(([name, details]) => ({
        id: name,
        name: name,
        pattern: details.pattern,
        enabled: details.enabled !== false,
        isDefault: details.isDefault || false,
        isGlobal: details.isGlobal !== false,
        sampleData: details.sampleData || ''
      }));
      setPatternArray(patternsArray);
    }
  }, [patterns]);
  
  const handlePatternChange = async (updatedPatternsArray) => {
    try {
      // Convert array back to object format for storage
      const patternObject = {};
      for (const pattern of updatedPatternsArray) {
        patternObject[pattern.name] = {
          name: pattern.name,
          id: pattern.id,
          pattern: pattern.pattern,
          enabled: pattern.enabled,
          isDefault: false,
          isGlobal: true,
          sampleData: pattern.sampleData
        };
      }
      
      await StorageService.savePatternRepository({ ...patternObject }, patterns);
      setPatterns(patternObject);
      onChange();
    } catch (error) {
      console.error('Error updating patterns:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDeletePattern = (pattern) => {
    setPatternToDelete(pattern);
    setShowConfirmDelete(true);
  };
  
  const confirmDeletePattern = async () => {
    if (!patternToDelete) return;
    
    try {
      const updatedPatterns = await StorageService.deletePattern(patternToDelete.name);
      setPatterns(updatedPatterns);
      setShowConfirmDelete(false);
      setPatternToDelete(null);
      onChange();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="pattern-repository-tab">
      <h3>Global Pattern Repository</h3>
      <p className="text-muted">
        Manage the patterns used to detect sensitive information globally across all policies.
      </p>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Pattern Management</Card.Title>
          <Alert variant="info">
            Patterns marked as global will be available in all policies. Custom patterns can be created 
            specifically for individual policies.
          </Alert>
          
          <RegexPatternManager 
            patterns={patternArray} 
            onChange={handlePatternChange}
            onDelete={handleDeletePattern}
          />
        </Card.Body>
      </Card>
      
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Pattern"
        message={`Are you sure you want to delete the pattern "${patternToDelete?.name}"? This action cannot be undone.`}
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