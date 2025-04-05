import React from 'react';
import { Nav } from 'react-bootstrap';
import './TabNavigation.css';

const TabNavigation = ({ activeTab, onTabChange, theme }) => {
  return (
    <Nav variant="tabs" className={`tab-navigation ${theme}-theme`}>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'policies'}
          onClick={() => onTabChange('policies')}
        >
          Policies
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'domain'}
          onClick={() => onTabChange('domain')}
        >
          Domain Mappings
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'pattern'}
          onClick={() => onTabChange('pattern')}
        >
          Global Pattern Repository
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'global'}
          onClick={() => onTabChange('global')}
        >
          Global Settings
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'alerts'}
          onClick={() => onTabChange('alerts')}
        >
          Alerts
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link
          active={activeTab === 'logs'}
          onClick={() => onTabChange('logs')}
        >
          Logs
        </Nav.Link>
      </Nav.Item>
    </Nav>
  );
};

export default TabNavigation;