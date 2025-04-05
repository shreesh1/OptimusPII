import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ListGroup } from 'react-bootstrap';
import './GlobalSettingsTab.css';
import { StorageService } from '../../services/StorageService';
import { NotificationService } from '../../services/NotificationService';

const GlobalSettingsTab = ({ globalSettings, setGlobalSettings, onChange }) => {
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleChange = async (feature, value) => {
    // Special case for notification permission
    if (feature === 'enableNotifications' && value === true) {
      // Call canNotify properly with await in an async function
      NotificationService.canNotify().then(canNotify => {
      });
    }
    const updatedSettings = {
      ...globalSettings,
      [feature]: value
    };
    setGlobalSettings(updatedSettings);
    onChange(); // Notify parent component of changes
  };

  const featureDescriptions = {
    phishingUrlDetection: "Detect and warn about potentially malicious phishing URLs",
    logLevel: "Control the verbosity of extension logging (higher levels include all lower levels)",
    enableNotifications: "Show browser notifications for important security events",
    notifyPhishing: "Show notifications for detected phishing attempts",
    notifyNetwork: "Show notifications for suspicious network activity",
    notifyPII: "Show notifications when PII data is protected",
    notifyFile: "Show notifications for blocked file operations"
  };

  return (
    <div className="global-settings-tab">
      <div className="mb-4">
        <h3>Global Settings</h3>
        <p className="text-muted">
          Configure global security settings that apply across all domains and policies.
        </p>
      </div>

      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Network Security</h4>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>Phishing URL Detection</h5>
                  <p className="text-muted mb-0">{featureDescriptions.phishingUrlDetection}</p>
                </div>
                <Form.Select 
                  style={{ width: '150px' }}
                  value={globalSettings.phishingUrlDetection || 'disabled'} 
                  onChange={(e) => handleChange('phishingUrlDetection', e.target.value)}
                >
                  <option value="disabled">Disabled</option>
                  <option value="block">Block</option>
                  <option value="warn">Warn Only</option>
                </Form.Select>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Notification Settings</h4>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>Browser Notifications</h5>
                  <p className="text-muted mb-0">{featureDescriptions.enableNotifications}</p>
                </div>
                <Form.Check 
                  type="switch"
                  id="enable-notifications-switch"
                  checked={globalSettings.enableNotifications || false}
                  onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                />
              </div>
            </ListGroup.Item>
            
            {globalSettings.enableNotifications && (
              <>
                <ListGroup.Item>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5>Phishing Alerts</h5>
                      <p className="text-muted mb-0">{featureDescriptions.notifyPhishing}</p>
                    </div>
                    <Form.Check 
                      type="switch"
                      id="notify-phishing-switch"
                      checked={globalSettings.notifyPhishing !== false}
                      onChange={(e) => handleChange('notifyPhishing', e.target.checked)}
                    />
                  </div>
                </ListGroup.Item>
                {/* <ListGroup.Item>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5>Network Alerts</h5>
                      <p className="text-muted mb-0">{featureDescriptions.notifyNetwork}</p>
                    </div>
                    <Form.Check 
                      type="switch"
                      id="notify-network-switch"
                      checked={globalSettings.notifyNetwork !== false}
                      onChange={(e) => handleChange('notifyNetwork', e.target.checked)}
                    />
                  </div>
                </ListGroup.Item>
                <ListGroup.Item>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5>PII Protection Alerts</h5>
                      <p className="text-muted mb-0">{featureDescriptions.notifyPII}</p>
                    </div>
                    <Form.Check 
                      type="switch"
                      id="notify-pii-switch"
                      checked={globalSettings.notifyPII !== false}
                      onChange={(e) => handleChange('notifyPII', e.target.checked)}
                    />
                  </div>
                </ListGroup.Item>
                <ListGroup.Item>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5>File Operation Alerts</h5>
                      <p className="text-muted mb-0">{featureDescriptions.notifyFile}</p>
                    </div>
                    <Form.Check 
                      type="switch"
                      id="notify-file-switch"
                      checked={globalSettings.notifyFile !== false}
                      onChange={(e) => handleChange('notifyFile', e.target.checked)}
                    />
                  </div>
                </ListGroup.Item> */}
              </>
            )}
          </ListGroup>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Logging Settings</h4>
        </Card.Header>
        <Card.Body>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>Log Level</h5>
                  <p className="text-muted mb-0">{featureDescriptions.logLevel}</p>
                </div>
                <Form.Select 
                  style={{ width: '150px' }}
                  value={globalSettings.logLevel || 'info'} 
                  onChange={(e) => handleChange('logLevel', e.target.value)}
                >
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </Form.Select>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>
      
      {showSaveSuccess && (
        <Alert variant="success" onClose={() => setShowSaveSuccess(false)} dismissible>
          Global settings saved successfully!
        </Alert>
      )}
    </div>
  );
};

export default GlobalSettingsTab;