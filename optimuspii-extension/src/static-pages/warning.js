document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const blockedUrl = params.get('url');
    const riskScore = params.get('risk');
    
    // Display the blocked URL
    const urlElement = document.getElementById('dangerous-url');
    urlElement.textContent = blockedUrl || 'Unknown URL';
    
    // Display confidence level
    const confidenceElement = document.getElementById('confidence-level');
    const confidenceNum = parseInt(riskScore, 10);
    let confidenceText = '';
    let confidenceClass = '';
    
    if (confidenceNum >= 80) {
      confidenceText = `High Risk (${riskScore}%)`;
      confidenceClass = 'confidence-high';
    } else if (confidenceNum >= 60) {
      confidenceText = `Medium Risk (${riskScore}%)`;
      confidenceClass = 'confidence-medium';
    } else {
      confidenceText = `Low Risk (${riskScore}%)`;
      confidenceClass = 'confidence-low';
    }
    
    confidenceElement.textContent = confidenceText;
    confidenceElement.classList.add(confidenceClass);
    
    // Button event listeners
    document.getElementById('proceed-btn').addEventListener('click', function() {
      // Send message to background script before proceeding
      const browser = chrome || browser;
      browser.runtime.sendMessage({
        action: 'allowPhishingUrl',
        url: blockedUrl,
        tempWhitelist: true
      }).then(() => {
        // Proceed to the original URL after the background script confirms
        if (blockedUrl) {
          window.location.href = blockedUrl;
        }
      }).catch(error => {
        console.error('Error communicating with background script:', error);
        // Fallback - try to proceed anyway
        if (blockedUrl) {
          window.location.href = blockedUrl;
        }
      });
    });
    
    document.getElementById('block-btn').addEventListener('click', function() {
      // Redirect to Google
      window.location.href = 'https://www.google.com';
    });
});