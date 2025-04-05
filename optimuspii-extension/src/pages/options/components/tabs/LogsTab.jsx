import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Badge, Dropdown } from 'react-bootstrap';
import './LogsTab.css';

const LogsTab = ({ globalSettings }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [logLevel, setLogLevel] = useState('all');

  // Load logs from storage
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const result = await chrome.storage.local.get(['piilogs']);
        setLogs(result.piilogs || []);
        setFilteredLogs(result.piilogs || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading logs:', error);
        setIsLoading(false);
      }
    };
    
    loadLogs();
    
    // Set up listener for new logs
    const handleStorageChange = (changes) => {
      if (changes.piilogs) {
        const newLogs = changes.piilogs.newValue || [];
        setLogs(newLogs);
        applyFilters(filter, logLevel, searchQuery, newLogs);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Apply filtering and search
  const applyFilters = (category = filter, level = logLevel, query = searchQuery, logsList = logs) => {
    let filtered = [...logsList];
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(log => log.category === category);
    }
    
    // Apply log level filter
    if (level !== 'all') {
      filtered = filtered.filter(log => log.level === level);
    }
    
    // Apply search query
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(lowercaseQuery) || 
        (log.details && log.details.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    setFilteredLogs(filtered);
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    applyFilters(newFilter, logLevel, searchQuery);
  };

  // Handle log level change
  const handleLogLevelChange = (newLevel) => {
    setLogLevel(newLevel);
    applyFilters(filter, newLevel, searchQuery);
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(filter, logLevel, query);
  };

  // Clear all logs
  const handleClearLogs = async () => {
    try {
      await chrome.storage.local.set({ piilogs: [] });
      setLogs([]);
      setFilteredLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  // Export logs to JSON
  const handleExportLogs = () => {
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger click
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimuspii-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Get log level badge variant
  const getLogLevelBadge = (level) => {
    switch (level) {
      case 'error':
        return <Badge bg="danger">ERROR</Badge>;
      case 'warning':
        return <Badge bg="warning" text="dark">WARNING</Badge>;
      case 'info':
        return <Badge bg="info" text="dark">INFO</Badge>;
      case 'debug':
        return <Badge bg="secondary">DEBUG</Badge>;
      default:
        return <Badge bg="light" text="dark">{level}</Badge>;
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="logs-tab">
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-4">
        <h3>System Logs</h3>
        
        <div className="d-flex gap-2 flex-wrap mt-2 mt-md-0">
          <Form.Control
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          
          <Form.Select 
            value={filter} 
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="network">Network</option>
            <option value="phishing">Phishing</option>
            <option value="pii">PII Detection</option>
            <option value="file">File Operations</option>
            <option value="system">System</option>
          </Form.Select>
          
          <Form.Select 
            value={logLevel} 
            onChange={(e) => handleLogLevelChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </Form.Select>
          
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" id="dropdown-logs-actions">
              Actions
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleExportLogs} disabled={logs.length === 0}>
                Export Logs
              </Dropdown.Item>
              <Dropdown.Item onClick={handleClearLogs} disabled={logs.length === 0}>
                Clear All Logs
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <Card body className="text-center bg-light">
          <p className="mb-0">No logs available. Activity logs will appear here as the extension runs.</p>
        </Card>
      ) : (
        <div className="logs-table-container">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '90px' }}>Level</th>
                <th style={{ width: '110px' }}>Category</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr key={index}>
                    <td className="log-timestamp">{formatDate(log.timestamp)}</td>
                    <td className="log-level">{getLogLevelBadge(log.level)}</td>
                    <td className="log-category">{log.category}</td>
                    <td className="log-message">
                      {log.message}
                      {log.details && (
                        <div className="log-details">
                          <small>{log.details}</small>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">
                    No logs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
      
      <div className="mt-3 text-end">
        <small className="text-muted">
          {filteredLogs.length} of {logs.length} logs displayed
        </small>
      </div>
    </div>
  );
};

export default LogsTab;