import React from 'react';
import { Nav } from 'react-bootstrap';
import './TabNavigation.css'; // You may still keep some custom styling

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <Nav variant="tabs" className="tab-navigation">
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
          Pattern Repository
        </Nav.Link>
      </Nav.Item>
    </Nav>
  );
};

export default TabNavigation;