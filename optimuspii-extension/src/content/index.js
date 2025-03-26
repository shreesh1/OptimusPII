/**
 * Main entry point for OptimusPII content script
 */

import { OptimusPIIContentController } from './controllers/main-controller.js';

// Initialize the content script
(function() {
  'use strict';
  
  const controller = new OptimusPIIContentController();
  controller.init();
})();