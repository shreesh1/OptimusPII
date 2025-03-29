import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import './App.css';

import TabNavigation from './components/TabNavigation';
import PoliciesTab from './components/tabs/PoliciesTab';
import DomainMappingsTab from './components/tabs/DomainMappingsTab';
import PatternRepositoryTab from './components/tabs/PatternRepositoryTab';
import { StorageService } from './services/StorageService';

const App = () => {
  const [activeTab, setActiveTab] = useState('policies');
  const [policies, setPolicies] = useState({});
  const [domainMappings, setDomainMappings] = useState({});
  const [patterns, setPatterns] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await StorageService.loadOptions();
      console.log(data);
      setPolicies(data.policies || {});
      setDomainMappings(data.domainMappings || {});
      setPatterns(data.patterns);
      console.log(data.patterns);
    } catch (error) {
      console.error('Error loading options:', error);
      alert('Error loading options. Please try again.');
    }
  };

  useEffect(() => {
    console.log('Current state:', { policies, domainMappings, patterns });
  }, [policies, domainMappings, patterns]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleDataChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      await StorageService.saveAllOptions({
        policies,
        domainMappings,
        patterns
      });
      setHasUnsavedChanges(false);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    } catch (error) {
      console.error('Error saving options:', error);
      alert(`Error saving options: ${error.message}`);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'policies':
        return (
          <PoliciesTab
            policies={policies}
            setPolicies={setPolicies}
            domainMappings={domainMappings}
            setDomainMappings={setDomainMappings}
            onChange={handleDataChange}
          />
        );
      case 'domain':
        return (
          <DomainMappingsTab
            domainMappings={domainMappings}
            setDomainMappings={setDomainMappings}
            policies={policies}
            onChange={handleDataChange}
          />
        );
      case 'pattern':
        return (
          <PatternRepositoryTab
            patterns={patterns}
            setPatterns={setPatterns}
            onChange={handleDataChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container fluid className="options-page">
      <Row className="header">
        <Col>
          <h1>OptimusPII Privacy Settings</h1>
        </Col>
      </Row>

      <Row className="main-content">
        <Col>
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="tab-content active">
            {renderActiveTab()}
          </div>
        </Col>
      </Row>

      <Row className="footer">
        <Col className="d-flex justify-content-between align-items-center">
          <div>
            {hasUnsavedChanges && (
              <span className="unsaved-changes-alert">
                You have unsaved changes
              </span>
            )}
            {showSavedMessage && (
              <span className="save-success-message">
                Changes saved successfully!
              </span>
            )}
          </div>
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default App;