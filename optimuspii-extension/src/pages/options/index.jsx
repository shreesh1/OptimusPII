import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

// Make sure the DOM is fully loaded before attempting to render
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  // Check if the container exists
  if (!container) {
    console.error('Cannot find #app element to mount React application');
    return;
  }
  
  // Create root and render
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});