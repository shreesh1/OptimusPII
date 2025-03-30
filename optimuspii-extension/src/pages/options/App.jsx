import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
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
  const [fileExtensions, setFileExtensions] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [theme, setTheme] = useState('light');

  // Load data only once when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await StorageService.loadOptions();
        console.log("Loaded data:", data);
        setPolicies(data.policies);
        setDomainMappings(data.domainMappings);
        setPatterns(data.patterns);
        setTheme(data.themePreference || 'light');
        setFileExtensions(data.fileExtensions || []);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [theme]);

  const handleDataChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    console.log("handleSave Called");
    try {
      await StorageService.saveAllOptions({
        policies,
        domainMappings,
        patterns,
        themePreference: theme
      });

      setHasUnsavedChanges(false);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setHasUnsavedChanges(true);
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
            handleDataChange={handleDataChange}
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
      case 'filetype':
        return (
          <FileExtensionRepositoryTab
            extensions={fileExtensions}
            setExtensions={setFileExtensions}
            onChange={handleDataChange}
          />
        )
      default:
        return null;
    }
  };

  return (
    <Container fluid className={`options-page ${theme}-theme`}>
      <Row className="header">
        <Col xs={8}>
          <h1>OptimusPII Privacy Settings</h1>
        </Col>
        <Col xs={4} className="d-flex justify-content-end align-items-center">
          <Form.Check
            type="switch"
            id="theme-switch"
            label={theme === 'dark' ? "Dark Mode" : "Light Mode"}
            checked={theme === 'dark'}
            onChange={toggleTheme}
            className="theme-toggle"
          />
        </Col>
      </Row>

      <Row className="main-content">
        <Col>
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} theme={theme} />

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
            variant={theme === 'dark' ? "outline-light" : "primary"}
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            Apply Changes
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default App;