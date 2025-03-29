import React from 'react';
import './TabNavigation.css'; // Assuming you have some CSS for styling
const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <nav className="tab-navigation">
      <button 
        className={activeTab === 'policies' ? 'active' : ''}
        onClick={() => onTabChange('policies')}
      >
        Policies
      </button>
      <button 
        className={activeTab === 'domain' ? 'active' : ''}
        onClick={() => onTabChange('domain')}
      >
        Domain Mappings
      </button>
      <button 
        className={activeTab === 'pattern' ? 'active' : ''}
        onClick={() => onTabChange('pattern')}
      >
        Pattern Repository
      </button>
    </nav>
  );
};

export default TabNavigation;