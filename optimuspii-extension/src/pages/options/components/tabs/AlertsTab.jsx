import React, { useState, useEffect } from 'react';
import { Card, Badge, ListGroup, Form, Button, Alert } from 'react-bootstrap';
import './AlertsTab.css';

const AlertsTab = ({ globalSettings }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load alerts from storage
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const result = await chrome.storage.local.get(['piialerts']);
        setAlerts(result.piialerts || []);
        setFilteredAlerts(result.piialerts || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading alerts:', error);
        setIsLoading(false);
      }
    };
    
    loadAlerts();
    
    // Set up listener for new alerts
    const handleStorageChange = (changes) => {
      if (changes.piialerts) {
        setAlerts(changes.piialerts.newValue || []);
        applyFilter(filter, changes.piialerts.newValue || []);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Apply filtering
  const applyFilter = (filterType, alertsList = alerts) => {
    setFilter(filterType);
    
    if (filterType === 'all') {
      setFilteredAlerts(alertsList);
      return;
    }
    
    const filtered = alertsList.filter(alert => alert.type === filterType);
    setFilteredAlerts(filtered);
  };

  // Clear all alerts
  const handleClearAlerts = async () => {
    try {
      await chrome.storage.local.set({ piialerts: [] });
      setAlerts([]);
      setFilteredAlerts([]);
    } catch (error) {
      console.error('Error clearing alerts:', error);
    }
  };

  // Get appropriate badge variant based on alert type
  const getBadgeVariant = (type) => {
    switch (type) {
      case 'phishing':
        return 'danger';
      case 'network':
        return 'warning';
      case 'pii':
        return 'info';
      case 'file':
        return 'dark';
      default:
        return 'secondary';
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="alerts-tab">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Security Alerts</h3>
        
        <div className="d-flex gap-2">
          <Form.Select 
            value={filter} 
            onChange={(e) => applyFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All Alerts</option>
            <option value="phishing">Phishing</option>
            <option value="network">Network</option>
            <option value="pii">PII</option>
            <option value="file">File</option>
          </Form.Select>
          
          <Button 
            variant="outline-danger" 
            onClick={handleClearAlerts}
            disabled={alerts.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <Card body className="text-center bg-light">
          <p className="mb-0">No alerts to display. Security events will appear here when detected.</p>
        </Card>
      ) : (
        <ListGroup className="alerts-list">
          {filteredAlerts.map((alert, index) => (
            <ListGroup.Item key={index} className="alert-item">
              <div className="alert-header">
                <div className="d-flex align-items-center">
                  <Badge bg={getBadgeVariant(alert.type)} className="me-2">
                    {alert.type.toUpperCase()}
                  </Badge>
                  <h5 className="mb-0">{alert.title}</h5>
                </div>
                <small className="text-muted">{formatDate(alert.timestamp)}</small>
              </div>
              
              <p className="alert-message mt-2 mb-1">{alert.message}</p>
              
              {alert.url && (
                <div className="alert-details">
                  <small>
                    <strong>URL:</strong> {alert.url}
                  </small>
                </div>
              )}
              
              {alert.details && (
                <div className="alert-details">
                  <small>
                    <strong>Details:</strong> {alert.details}
                  </small>
                </div>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      
      {filteredAlerts.length === 0 && alerts.length > 0 && (
        <Alert variant="info" className="mt-3">
          No alerts match the selected filter.
        </Alert>
      )}
    </div>
  );
};

export default AlertsTab;