/**
 * phishingurldetection.js - Advanced phishing URL detection module for OptimusPII
 * 
 * This module provides enterprise-grade phishing URL detection capabilities
 * using advanced NLP techniques and machine learning-derived heuristics.
 */

import { LoggingService } from '../../pages/options/services/LoggingService';
import { AlertService } from '../../pages/options/services/AlertService';

/**
 * PhishingURLDetection - Main class implementing phishing URL detection capabilities
 * for the OptimusPII extension. Provides real-time analysis of URLs to detect potential
 * phishing attempts using multiple detection strategies.
 */
export class PhishingURLDetection {

  /**
   * Initialize the PhishingURLDetection module
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Default configuration

    this.browser = this._getBrowserApi();

    this.config = {
      enabled: false,
      mode: 'disabled',  // 'disabled', 'warn', 'block'
      sensitivity: 60,   // 0-100: higher means more aggressive detection
      threshold: 0.6,    // Detection threshold (0-1)
      logSuccessfulDetections: true,
      ...options
    };

    // Initialize the core detector engine
    this.detector = new PhishingURLDetector();

    // Track listener registration status
    this.listenerRegistered = false;

    // Bind navigation handler to this instance (important for removing listener)
    this.boundNavigationHandler = this.navigationHandler.bind(this);

    LoggingService.info('phishing', 'PhishingURLDetection module initialized',
      `Mode: ${this.config.mode}, Sensitivity: ${this.config.sensitivity}`);

    // Set up initial listeners based on configuration
    this.updateListeners(this.config.mode);

    // Add temporary whitelist for user-approved URLs
    this.temporaryWhitelist = new Map();
    
    // Set up message listener for warning page responses
    this.browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  /**
     * Get the appropriate browser API
     * @returns {Object} Browser API object
     * @private
     */
  _getBrowserApi() {
    try {
      return browser || chrome;
    } catch (e) {
      return chrome;
    }
  }

  /**
   * Update configuration settings
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    const oldMode = this.config.mode;

    // Update configuration
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Adjust threshold based on sensitivity
    if (newConfig.sensitivity !== undefined) {
      // Adjust the scaling to be less aggressive
      this.detector.threshold = Math.max(0.4, Math.min(0.9, 1 - (this.config.sensitivity / 100 * 0.4 + 0.3)));
    }

    // Log configuration change
    LoggingService.info('phishing', 'PhishingURLDetection configuration updated',
      `Mode: ${this.config.mode}, Sensitivity: ${this.config.sensitivity}`);

    // Log mode changes specifically
    if (oldMode !== this.config.mode) {
      LoggingService.info('phishing', `Detection mode changed from '${oldMode}' to '${this.config.mode}'`);

      // Update listeners if mode changed
      this.updateListeners(this.config.mode);
    }

    return this.config;
  }

  /**
   * Update navigation listeners based on mode
   * @param {string} mode - The detection mode ('disabled', 'warn', 'block')
   */
  updateListeners(mode) {
    // Remove existing listener if registered
    if (this.listenerRegistered) {
      this.browser.webNavigation.onCommitted.removeListener(this.boundNavigationHandler);
      this.listenerRegistered = false;
      LoggingService.debug('phishing', 'Navigation listener removed');
    }

    // Add listener if mode is block or warn
    if (mode === 'block' || mode === 'warn') {
      this.browser.webNavigation.onCommitted.addListener(this.boundNavigationHandler, {
        url: [{ schemes: ['http', 'https'] }]
      });
      this.listenerRegistered = true;
      LoggingService.debug('phishing', `Navigation listener added for mode: ${mode}`);
    }
  }

  /**
   * Handle navigation events for phishing detection
   * @param {Object} details - Navigation details from Chrome API
   */
  navigationHandler(details) {
    // Skip sub-frames
    if (details.frameId !== 0) return;

    // Skip internal browser pages
    if (details.url.startsWith('chrome://') ||
      details.url.startsWith('about:') ||
      details.url.startsWith('chrome-extension://') ||
      details.url.startsWith('moz-extension://')) {
      return;
    }

    // Skip URLs that are known to be safe (e.g. warning page)
    if (details.url.includes('warning.html')) {
      return;
    }

    // Process the navigation
    const result = this.handleNavigation(details.url, {
      tabId: details.tabId,
      frameId: details.frameId,
      transitionType: details.transitionType
    });

    // Handle actions based on detection result
    if (result.action === 'block') {
      this.browser.tabs.update(details.tabId, {
        url: this.browser.runtime.getURL(result.redirectUrl)
      });
    }
  }

  /**
   * Handle messages from the warning page
   * @param {Object} message - Message data
   * @param {Object} sender - Message sender information
   * @param {Function} sendResponse - Function to send a response
   */
  handleMessage(message, sender, sendResponse) {
    if (message.action === 'allowPhishingUrl' && message.url) {
        // Add URL to temporary whitelist (expires in 30 seconds)
        this.temporaryWhitelist.set(message.url, Date.now() + 30000);
        LoggingService.info('phishing', `User approved navigation to flagged URL: ${message.url}`);
        
        // Send response to confirm action
        sendResponse({ success: true });
        return true;
    }
  }

  /**
   * Clean temporary whitelist entries that have expired
   */
  cleanupWhitelist() {
    const now = Date.now();
    for (const [url, expiry] of this.temporaryWhitelist.entries()) {
        if (now > expiry) {
            this.temporaryWhitelist.delete(url);
        }
    }
  }

  /**
   * Check if a URL is potentially a phishing site
   * @param {string} url - The URL to analyze
   * @param {Object} context - Additional context (tab ID, etc.)
   * @returns {Object} Detection result
   */
  analyzeUrl(url, context = {}) {
    const startTime = performance.now();
    // Skip analysis if disabled
    if (this.config.mode === 'disabled') {
      return {
        isPhishing: false,
        confidence: 0,
        action: 'none',
        message: 'Phishing detection disabled'
      };
    }

    try {
      // Call the detector engine
      const result = this.detector.detectPhishing(url);
      const analysisTime = performance.now() - startTime;

      // Build result object with action
      const detectionResult = {
        isPhishing: result.isPhishing,
        confidence: result.confidence,
        phishingScore: result.phishingScore,
        url: url,
        features: result.features,
        segments: result.segments,
        timestamp: Date.now(),
        tabId: context.tabId || null,
        action: 'none'
      };

      // Determine action based on result and configuration
      if (result.isPhishing) {
        if (this.config.mode === 'block') {
          detectionResult.action = 'block';
          detectionResult.message = 'Phishing URL blocked';
        } else if (this.config.mode === 'warn') {
          detectionResult.action = 'warn';
          detectionResult.message = 'Phishing URL warning';
        }

        // Log and create an alert for detected phishing sites
        this.logDetection(detectionResult);
      }

      return detectionResult;
    } catch (error) {
      LoggingService.error('phishing', `Error analyzing URL: ${url}`, error.message);

      return {
        isPhishing: false,
        confidence: 0,
        error: error.message,
        action: 'none',
        message: 'Analysis error'
      };
    }
  }

  /**
   * Log and create alert for detected phishing URL
   * @param {Object} result - Detection result
   */
  logDetection(result) {
    // Create an alert
    AlertService.addPhishingAlert(
      'Potential Phishing URL Detected',
      `A phishing attempt was detected with ${result.confidence}% confidence.`,
      result.url,
      `Score: ${result.phishingScore.toFixed(3)}, Action: ${result.action}`
    );

    // Log the detection
    LoggingService.warning('phishing',
      `Detected phishing URL (${result.confidence}% confidence): ${result.url}`,
      `Score: ${result.phishingScore.toFixed(3)}, Action: ${result.action}`
    );

    // Add detailed debug log with features
    const featureDetails = Object.entries(result.features)
      .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(3) : value}`)
      .join(', ');


    LoggingService.debug('phishing',
      `Phishing detection features for ${result.url}`,
      featureDetails);
  }

  /**
   * Handle URL navigation to trigger analysis and protection
   * @param {string} url - URL being navigated to
   * @param {Object} details - Navigation details (tabId, etc.)
   * @returns {Object} Action to take (block, warn, or allow)
   */
  handleNavigation(url, details = {}) {
    // Clean up expired whitelist entries
    this.cleanupWhitelist();

    // Skip internal URLs
    if (url.startsWith('chrome-extension:') ||
        url.startsWith('moz-extension:') ||
        url.startsWith('chrome:') ||
        url.startsWith('about:')) {
        return { action: 'allow' };
    }

    // Skip URLs that are known to be safe (e.g. warning page)
    if (url.includes('warning.html')) {
        return { action: 'allow' };
    }
    
    // Check if URL is in temporary whitelist
    if (this.temporaryWhitelist.has(url)) {
        LoggingService.debug('phishing', `URL in temporary whitelist, allowing: ${url}`);
        return { action: 'allow' };
    }

    // Analyze the URL
    const result = this.analyzeUrl(url, details);

    // Return action based on result
    if (result.action === 'block') {
        return {
            action: 'block',
            redirectUrl: `${this.browser.runtime.getURL('warning.html')}?url=${encodeURIComponent(url)}&risk=${result.confidence}`
        };
    } else if (result.action === 'warn') {
        return {
            action: 'warn'
        };
    }

    return { action: 'allow' };
  }

  /**
   * Clean up resources when the module is being disabled
   */
  cleanup() {
    // Remove listener if registered
    if (this.listenerRegistered) {
        this.browser.webNavigation.onCommitted.removeListener(this.boundNavigationHandler);
        this.listenerRegistered = false;
        
        // Remove the message listener
        this.browser.runtime.onMessage.removeListener(this.handleMessage);
        
        LoggingService.info('phishing', 'PhishingURLDetection cleaned up and listeners removed');
    }
  }
}

/**
 * Enhanced Phishing URL Detector
 * Combines concepts from PhiSN model and SegURLizer algorithm
 * For efficient URL-based phishing detection using NLP techniques
 */
class PhishingURLDetector {
  constructor() {
    // Add trusted domains whitelist
    this.trustedDomains = [
      'google.com', 'google.co', 'microsoft.com', 'apple.com', 'amazon.com',
      'facebook.com', 'instagram.com', 'twitter.com', 'youtube.com', 'linkedin.com',
      'github.com', 'stackoverflow.com', 'netflix.com', 'spotify.com', 'yahoo.com',
      'bing.com', 'baidu.com', 'wikipedia.org', 'cloudflare.com', 'akamai.net'
    ];

    // Add suspicious keywords commonly found in phishing URLs
    this.suspiciousKeywords = [
      'login', 'signin', 'verify', 'secure', 'account', 'password', 'billing',
      'confirm', 'update', 'auth', 'authenticate', 'wallet', 'validation',
      'suspended', 'unusual', 'verify-account', 'secure-login', 'service',
      'customer', 'recover', 'unlock', 'helpdesk', 'authenticate', 'activity',
      'support', 'security', 'authentication', 'authorize', 'verification',
      'access', 'submit', 'form', 'limited', 'alert', 'protection', 'appleid',
      'paypal', 'payment', 'webscr', 'cardservice', 'resolve', 'limit',
      'notification', 'banking', 'privacy', 'identity', 'purchase', 'quick'
    ];

    // Add commonly targeted brands for phishing
    this.targetedBrands = [
      'paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'instagram',
      'netflix', 'bank', 'wells', 'fargo', 'chase', 'citi', 'amex', 'coinbase',
      'crypto', 'spotify', 'adobe', 'dropbox', 'linkedin', 'twitter', 'steam',
      'github', 'yahoo', 'outlook', 'office', 'proton', 'gmail', 'icloud'
    ];

    // Add risky TLDs often used in phishing
    this.riskTlds = [
      'xyz', 'top', 'club', 'live', 'online', 'site', 'store', 'info',
      'icu', 'vip', 'app', 'buzz', 'su', 'tk', 'ml', 'ga', 'cf', 'gq',
      'website'
    ];

    // Adjust feature weights with stronger emphasis on security indicators
    this.featureWeights = {
      urlLength: 0.01,
      domainLength: 0.05,
      pathLength: 0.00,
      hasSubdomain: 0.06,
      tldIsRisky: 0.15,
      domainHasDash: 0.10,        // Increase from 0.07 to 0.10
      specialCharCount: 0.04,
      digitCount: 0.15,
      hasIPAddress: 0.30,           // Increased from 0.22 to 0.30
      hasSuspiciousKeywords: 0.15, // Increase from 0.10 to 0.15
      queryParamCount: 0.005,
      domainEntropyScore: 0.03,
      urlEntropyScore: 0.005,
      domainTokenCount: 0.04,
      pathTokenCount: 0.005,
      avgTokenLength: 0.03,
      hexPatternCount: 0.09,
      nonAsciiCharCount: 0.20,
      consecutiveSpecialChars: 0.04,
      trigramSuspiciousness: 0.07,
      brandSimilarity: 0.25,      // Increase from 0.10 to 0.25
      isDomainTrusted: 0.15,
      isHttp: 0.20,                 // New feature for non-HTTPS URLs
      hasSuspiciousPath: 0.20       // Increase from 0.15 to 0.20
    };

    // Classification threshold determined by model optimization
    this.threshold = 0.6;

    // Additional linguistic patterns from SegURLizer research
    this.suspiciousPatterns = {
      homoglyphs: ['à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è'],
      hexSequences: /%[0-9a-f]{2}/gi,
      repeatingChars: /(.)\1{3,}/g
    };

    // Enhanced tokenization parameters
    this.segmentationConfig = {
      minSegmentLength: 3,
      maxSegmentLength: 8,
      overlapWindow: 2
    };

    // Initialize the segment cache
    this.precomputeSegments();
  }

  /**
   * Main function to detect phishing URLs
   * @param {string} url - The URL to analyze
   * @return {object} Detection results with features and score
   */
  detectPhishing(url) {

    // Start overall timing
    const startTime = performance.now();
    let featureExtractTime = 0;
    let scoringTime = 0;

    try {
      // Extract features
      const features = this.extractFeatures(url);

      // Calculate phishing score
      const score = this.calculatePhishingScore(features);


      // Extract domain segments for reporting
      let domainSegments = [];
      let pathSegments = [];

      try {
        const urlObj = new URL(url);
        domainSegments = this.segmentWord(urlObj.hostname);
        pathSegments = this.segmentWord(urlObj.pathname);
      } catch (e) {
        // Segmentation failure shouldn't stop the overall process
      }

      // Calculate total time
      const totalTime = performance.now() - startTime;

      // Determine if URL is phishing based on threshold
      return {
        url: url,
        isPhishing: score > this.threshold,
        confidence: Math.round(score * 100),
        phishingScore: score,
        features: features,
        segments: {
          domain: domainSegments,
          path: pathSegments
        }
      };
    } catch (error) {
      console.error('Error in phishing detection:', error);
      return {
        url: url,
        isPhishing: false,
        confidence: 0,
        phishingScore: 0,
        error: error.message
      };
    }
  }

  /**
   * Extract all features from URL for analysis
   * @param {string} url - The URL to extract features from
   * @return {object} Feature set for detection
   */
  extractFeatures(url) {
    // Parse URL components
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      throw new Error('Invalid URL format');
    }

    const hostname = urlObj.hostname;
    const path = urlObj.pathname;
    const query = urlObj.search;

    // Extract domain parts
    const domainParts = hostname.split('.');
    const tld = domainParts.length >= 2 ? domainParts[domainParts.length - 1].toLowerCase() : '';
    const domain = domainParts.length >= 2 ? domainParts[domainParts.length - 2].toLowerCase() : hostname;

    // Check for suspicious path patterns
    const hasSuspiciousPath = this.checkSuspiciousPath(path);

    // Segment domain and path for token analysis
    const domainTokens = this.segmentWord(hostname);
    const pathTokens = path.split('/').filter(p => p.length > 0);
    const allTokens = [...domainTokens, ...pathTokens];

    // Advanced feature: brand targeting detection
    const brandSimilarityScore = this.calculateBrandSimilarity(domain);

    // Calculate features
    const features = {
      // Existing features...
      urlLength: url.length,
      domainLength: hostname.length,
      pathLength: path.length,

      // Domain features
      hasSubdomain: domainParts.length > 2 ? 1 : 0,
      tldIsRisky: this.riskTlds.includes(tld) ? 1 : 0,
      domainHasDash: hostname.includes('-') ? 1 : 0,

      // Character-based features
      specialCharCount: (url.match(/[^a-zA-Z0-9.:/]/g) || []).length,
      digitCount: (url.match(/\d/g) || []).length,

      // Advanced features
      hasIPAddress: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ? 1 : 0,
      hasSuspiciousKeywords: this.checkSuspiciousKeywords(url) ? 1 : 0,
      queryParamCount: query ? (query.match(/[?&][^?&]+/g) || []).length : 0,

      // Security features
      isHttp: urlObj.protocol === 'http:' ? 1 : 0,
      hasSuspiciousPath: hasSuspiciousPath ? 1 : 0,

      // Other NLP and existing features
      domainEntropyScore: this.calculateEntropy(hostname),
      urlEntropyScore: this.calculateEntropy(url),
      domainTokenCount: domainTokens.length,
      pathTokenCount: pathTokens.length,
      avgTokenLength: allTokens.length > 0 ?
        allTokens.reduce((sum, token) => sum + token.length, 0) / allTokens.length : 0,
      hexPatternCount: (url.match(this.suspiciousPatterns.hexSequences) || []).length,
      nonAsciiCharCount: (url.match(/[^\x00-\x7F]/g) || []).length,
      consecutiveSpecialChars: this.calculateConsecutiveSpecialChars(url),
      trigramSuspiciousness: this.calculateTrigramSuspicion(url),
      brandSimilarity: brandSimilarityScore
    };

    // Add trusted domain feature
    features.isDomainTrusted = this.isDomainTrusted(hostname) ? 1 : 0;

    return features;
  }

  /**
   * Check for suspicious path patterns often used in phishing
   * @param {string} path - URL path to analyze
   * @return {boolean} True if suspicious pattern found
   */
  checkSuspiciousPath(path) {
    // Check for tilde user directories (often compromised shared hosting)
    if (/\/~[^\/]+/.test(path)) {
      return true;
    }

    // Check for suspicious file extensions
    if (/\.(php|aspx|jsp|cgi|pl)\//.test(path)) {
      return true;
    }

    // Check for suspicious path segments
    const suspiciousSegments = [
      'admin', 'login', 'signin', 'secure', 'auth', 'account', 'update',
      'confirm', 'verify', 'password', 'credential', 'webscr'
    ];

    const pathSegments = path.toLowerCase().split('/');
    for (const segment of pathSegments) {
      if (suspiciousSegments.includes(segment)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate base phishing score without trust adjustments
   * @param {object} features - URL features
   * @return {number} Base phishing probability score (0-1)
   * @private
   */
  _calculateBasePhishingScore(features) {
    let score = 0;
    let totalWeight = 0;

    for (const [feature, weight] of Object.entries(this.featureWeights)) {
      if (feature in features) {
        // Normalize feature values
        let normalizedValue = features[feature];

        // Specific normalization for certain features
        if (feature === 'urlLength') normalizedValue = Math.min(1, features[feature] / 100);
        else if (feature === 'domainLength') normalizedValue = Math.min(1, features[feature] / 30);
        else if (feature === 'pathLength') normalizedValue = Math.min(1, features[feature] / 30);
        else if (feature === 'specialCharCount') normalizedValue = Math.min(1, features[feature] / 10);
        else if (feature === 'digitCount') normalizedValue = Math.min(1, features[feature] / 15);
        else if (feature === 'queryParamCount') normalizedValue = Math.min(1, features[feature] / 5);
        else if (feature === 'domainEntropyScore') normalizedValue = Math.min(1, features[feature] / 4);
        else if (feature === 'urlEntropyScore') normalizedValue = Math.min(1, features[feature] / 5);
        else if (feature === 'consecutiveSpecialChars') normalizedValue = Math.min(1, features[feature] / 4);
        else if (feature === 'avgTokenLength') normalizedValue = features[feature] > 10 ? 1 : (features[feature] / 10);
        else if (feature === 'hexPatternCount') normalizedValue = Math.min(1, features[feature] / 5);
        else if (feature === 'nonAsciiCharCount') normalizedValue = Math.min(1, features[feature] / 3);
        else if (feature === 'trigramSuspiciousness') normalizedValue = features[feature]; // Already 0-1
        else if (feature === 'hasIPAddress') normalizedValue = features[feature]; // Already binary 0-1
        else if (feature === 'domainHasDash') normalizedValue = features[feature]; // Already binary 0-1
        else if (feature === 'hasSubdomain') normalizedValue = features[feature]; // Already binary 0-1
        else if (feature === 'isHttp') normalizedValue = features[feature]; // Already binary 0-1
        else if (feature === 'hasSuspiciousPath') normalizedValue = features[feature]; // Already binary 0-1

        // Add weighted feature to score
        score += normalizedValue * weight;
        totalWeight += weight;
      }
    }

    // Special case for brand impersonation with suspicious elements (high confidence phishing)
    if (features.brandSimilarity > 0.5) {
      // Brand targeting is a strong signal alone
      score += 0.15;

      // Brand + suspicious keywords is even stronger
      if (features.hasSuspiciousKeywords) {
        score += 0.2;
      }

      // Brand + suspicious path + domain dash is a very strong signal
      if (features.hasSuspiciousPath && features.domainHasDash) {
        score += 0.25; // Increase this to detect examples like "appleid-verify.com/account/update"
      }
    }

    // Special pattern detection for high-confidence phishing patterns
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();

      // Check for brand-specific phishing patterns
      const brandPhishingPatterns = [
        { brand: 'apple', patterns: ['appleid', 'icloud'], paths: ['account', 'verify', 'signin'] },
        { brand: 'paypal', patterns: ['paypal'], paths: ['secure', 'confirm', 'login'] },
        { brand: 'microsoft', patterns: ['office', 'outlook'], paths: ['login', 'account', 'verify'] },
        { brand: 'amazon', patterns: ['amazon'], paths: ['signin', 'account', 'verify'] }
      ];

      for (const { brand, patterns, paths } of brandPhishingPatterns) {
        if (patterns.some(p => domain.includes(p)) &&
            paths.some(p => path.includes(p)) &&
            !domain.includes(brand + '.com')) {
          // This is almost certainly a phishing site targeting a specific brand
          score += 0.3;
          break;
        }
      }
    } catch (e) {
      // URL parsing error, ignore
    }

    // Special case: IP address-based URLs (high-risk indicator)
    if (features.hasIPAddress) {
      // IP addresses are very suspicious on their own
      score += 0.1;

      // IP + HTTP is an even stronger indicator
      if (features.isHttp) {
        score += 0.15;
      }

      // IP address with suspicious path or keywords is extremely suspicious
      if (features.hasSuspiciousPath || features.hasSuspiciousKeywords) {
        score += 0.2;
      }
    }

    // Other domain-specific rules
    if (features.tldIsRisky && features.hasSuspiciousKeywords) {
      score += 0.1;
    }

    // Non-ASCII homograph attacks
    if (features.nonAsciiCharCount > 0 && features.brandSimilarity > 0.5) {
      score += 0.2;
    }

    // Suspicious trigrams combined with dashes
    if (features.trigramSuspiciousness > 0.3 && features.domainHasDash) {
      score += 0.2;
    }

    // Brand targeting with suspicious elements
    if (features.brandSimilarity > 0.7 && features.hasSuspiciousKeywords) {
      score += 0.15;
    }

    // HTTP protocol with suspicious elements (stronger signal)
    if (features.isHttp && (features.hasSuspiciousKeywords || features.hasSuspiciousPath)) {
      score += 0.1;
    }

    // Normalize final score
    return Math.min(1, totalWeight > 0 ? score / totalWeight : 0);
  }

  /**
   * Calculate phishing score using weighted features
   * @param {object} features - URL features
   * @return {number} Phishing probability score (0-1)
   */
  calculatePhishingScore(features) {
    // Calculate the base score
    const baseScore = this._calculateBasePhishingScore(features);
    // Apply trusted domain adjustment if needed
    if (features.isDomainTrusted) {
      return Math.max(0, baseScore - 0.4); // Apply a significant reduction for trusted domains
    }

    return baseScore;
  }

  /**
   * Check if URL contains suspicious keywords
   * @param {string} url - URL to check
   * @return {boolean} True if suspicious keywords found
   */
  checkSuspiciousKeywords(url) {
    // Don't check trusted domains for suspicious keywords
    try {
      const urlObj = new URL(url);
      if (this.isDomainTrusted(urlObj.hostname)) {
        return false;
      }
    } catch (e) {
      // If URL parsing fails, continue with regular checks
    }

    const normalizedUrl = url.toLowerCase();

    // Direct keyword matching
    for (const keyword of this.suspiciousKeywords) {
      if (normalizedUrl.includes(keyword)) {
        return true;
      }
    }

    // Advanced NLP-inspired tokenization approach
    const tokens = normalizedUrl
      .replace(/https?:\/\//i, '')
      .replace(/[\/\-_.?=#&]/g, ' ')
      .split(' ')
      .filter(token => token.length > 0);

    // Check tokens against suspicious keywords
    for (const token of tokens) {
      // Segment longer tokens
      if (token.length > 8) {
        const segments = this.segmentWord(token);
        for (const segment of segments) {
          if (this.suspiciousKeywords.includes(segment) && segment.length >= 3) {
            return true;
          }
        }
      } else if (this.suspiciousKeywords.includes(token)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect if URL is from a search engine
   * @param {string} hostname - Hostname to check
   * @return {boolean} True if hostname belongs to a search engine
   */
  isSearchEngine(hostname) {
    const searchEngines = [
      'google.com', 'google.co', 'bing.com', 'yahoo.com', 'duckduckgo.com',
      'baidu.com', 'yandex.com', 'search.brave.com'
    ];

    return searchEngines.some(engine => {
      return hostname.endsWith(engine) || hostname === engine;
    });
  }

  /**
   * Add a method to check if domain is in trusted list
   * @param {string} hostname - Hostname to check
   * @return {boolean} True if domain is trusted
   */
  isDomainTrusted(hostname) {
    if (!hostname) return false;

    // Check for exact hostname match first
    if (this.trustedDomains.includes(hostname.toLowerCase())) {
      return true;
    }

    // Check if domain is a subdomain of a trusted domain
    return this.trustedDomains.some(trusted => {
      const domainPattern = new RegExp(`(^|\.)${trusted.replace('.', '\\.')}$`, 'i');
      return domainPattern.test(hostname);
    });
  }

  /**
   * Precompute segments for optimization
   */
  precomputeSegments() {
    // Cache common suspicious patterns
    this.segmentCache = new Map();

    for (const keyword of this.suspiciousKeywords) {
      for (let len = 3; len <= 8 && len <= keyword.length; len++) {
        for (let i = 0; i <= keyword.length - len; i++) {
          const segment = keyword.substr(i, len);
          if (!this.segmentCache.has(segment)) {
            this.segmentCache.set(segment, true);
          }
        }
      }
    }

    // Add brand names to cache
    for (const brand of this.targetedBrands) {
      if (!this.segmentCache.has(brand)) {
        this.segmentCache.set(brand, true);
      }
    }
  }

  /**
   * Enhanced word segmentation based on SegURLizer
   * @param {string} word - Word to segment
   * @return {Array} Array of segments
   */
  segmentWord(word) {
    if (!word || word.length === 0) return [];

    const segments = [];
    let currentPos = 0;
    const wordLength = word.length;

    while (currentPos < wordLength) {
      let found = false;

      // Look for known segments first (longest possible match)
      for (let len = Math.min(this.segmentationConfig.maxSegmentLength, wordLength - currentPos);
        len >= this.segmentationConfig.minSegmentLength;
        len--) {

        const candidateSegment = word.substr(currentPos, len).toLowerCase();

        // Check against precomputed cache
        if (this.segmentCache.has(candidateSegment) ||
          this.suspiciousKeywords.includes(candidateSegment) ||
          this.targetedBrands.includes(candidateSegment)) {
          segments.push(candidateSegment);
          currentPos += len;
          found = true;
          break;
        }
      }

      // If no known segment found, use sliding window with overlap
      if (!found) {
        // For short remaining words, just add the rest
        if (wordLength - currentPos <= 4) {
          segments.push(word.substr(currentPos));
          break;
        }

        // Check for numbers-only segments
        const nextChars = word.substr(currentPos, 3);
        if (/^\d+$/.test(nextChars)) {
          // Find the whole number segment
          const numberMatch = word.substr(currentPos).match(/^\d+/);
          if (numberMatch) {
            segments.push(numberMatch[0]);
            currentPos += numberMatch[0].length;
            continue;
          }
        }

        // Add single character and continue
        segments.push(word.substr(currentPos, 1));
        currentPos++;
      }
    }

    return segments;
  }

  /**
   * Calculate Shannon entropy (measure of randomness)
   * @param {string} text - Text to analyze
   * @return {number} Entropy score
   */
  calculateEntropy(text) {
    if (!text) return 0;

    const len = text.length;
    const frequencies = {};

    // Count character frequencies
    for (let i = 0; i < len; i++) {
      const char = text[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const char in frequencies) {
      const probability = frequencies[char] / len;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Analyze query parameters for suspicious patterns
   * @param {string} url - URL to analyze
   * @return {number} Suspicion score
   */
  analyzeQueryParameters(url) {
    try {
      const urlObj = new URL(url);
      // Ignore standard search params on trusted sites
      if (this.isSearchEngine(urlObj.hostname)) {
        const searchParams = ['q', 'query', 'search', 'text', 'p'];
        const params = new URLSearchParams(urlObj.search);
        // If only contains standard search params, return safe
        const hasOnlySearchParams = Array.from(params.keys())
          .every(key => searchParams.includes(key) || key.startsWith('utm_'));
        if (hasOnlySearchParams) {
          return 0; // Very low suspicion score
        }
      }
      return 0.5; // Neutral score if doesn't match patterns
    } catch (e) {
      return 0.7; // Higher suspicion for unparsable URLs
    }
  }

  /**
   * Calculate similarity between domain and known brand names to detect brand impersonation
   * @param {string} domain - Domain name to check
   * @return {number} Similarity score (0-1)
   */
  calculateBrandSimilarity(domain) {
    if (!domain || domain.length < 3) return 0;
    
    // Normalize domain
    const normalizedDomain = domain.toLowerCase();
    
    // Special handling for common brand variations
    const brandVariations = {
      'apple': ['appleid', 'apple-id', 'icloud', 'itunes'],
      'microsoft': ['msn', 'outlook', 'office365', 'ms-online'],
      'google': ['gmail', 'googlemail', 'googleaccount'],
      'paypal': ['paypal-secure', 'paypalverify'],
      'amazon': ['amazonaccount', 'aws-amazon', 'amazon-aws'],
      'facebook': ['fb-login', 'facebook-secure'],
      'instagram': ['ig-verify', 'insta-secure']
    };
    
    // Check for exact match (excluding TLD)
    for (const brand of this.targetedBrands) {
      if (normalizedDomain === brand) {
        return 1;
      }
    }
    
    // Check for brand variations
    for (const [baseBrand, variations] of Object.entries(brandVariations)) {
      if (variations.some(variation => normalizedDomain.includes(variation))) {
        return 0.95; // Very high confidence for known variations
      }
    }
    
    // Check for compound brand name (e.g. "appleid-verify")
    for (const brand of this.targetedBrands) {
      const brandPattern = new RegExp(`${brand}[^a-z0-9]?(verify|secure|login|auth|account|id|confirm)`, 'i');
      if (brandPattern.test(normalizedDomain)) {
        return 0.9; // Very high confidence for brand+suspicious word
      }
    }
    
    // Original brand similarity checks
    for (const brand of this.targetedBrands) {
      if (brand.length < 4) continue;
      
      if (normalizedDomain.includes(brand)) {
        const brandCoverage = brand.length / normalizedDomain.length;
        return Math.max(0.6, Math.min(0.95, brandCoverage * 1.2));
      }
      
      // Check for common typosquatting with Levenshtein distance
      const distance = this.levenshteinDistance(normalizedDomain, brand);
      if (distance <= 2 && brand.length > 5) {
        // Very close match - likely typosquatting
        return 0.8;
      } else if (distance <= 3 && normalizedDomain.length > 0.7 * brand.length) {
        // Potential typosquatting
        return 0.7;
      }

      // Check for homograph attacks (similar looking characters)
      const homographDistance = this.calculateHomographDistance(normalizedDomain, brand);
      if (homographDistance > 0.8) {
        return homographDistance;
      }
    }

    // If no significant matches, check for partial matches with longer brands
    for (const brand of this.targetedBrands.filter(b => b.length >= 6)) {
      // Check for brand containment with noise (e.g. "amaz0n-secure")
      const pattern = brand.split('').join('[^a-zA-Z0-9]?');
      if (new RegExp(pattern, 'i').test(normalizedDomain)) {
        return 0.65;
      }
    }
    
    return 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @return {number} Edit distance
   */
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calculate similarity accounting for homograph attacks
   * @param {string} domain - Domain to check 
   * @param {string} brand - Brand name to compare against
   * @return {number} Similarity score (0-1)
   */
  calculateHomographDistance(domain, brand) {
    // Common homograph replacements
    const homographs = {
      'a': ['а', 'ạ', 'ä', 'á', 'à', 'ą'],
      'b': ['ḅ', 'ḃ', 'ь', 'б'],
      'c': ['с', 'ċ', 'ç'],
      'd': ['ḍ', 'ḋ', 'ď'],
      'e': ['е', 'ē', 'ĕ', 'ė', 'ę', 'ё', 'è', 'é', 'ê', 'ë'],
      'g': ['ģ', 'ğ', 'ġ'],
      'h': ['ḥ', 'ḣ', 'ȟ'],
      'i': ['і', 'ї', 'ı', 'ī', 'ĭ', 'į', 'ì', 'í', 'î', 'ï'],
      'j': ['ĵ', 'ј'],
      'k': ['ķ', 'ḳ', 'ḱ', 'к'],
      'l': ['ļ', 'ḹ', 'ḷ', 'ḻ'],
      'm': ['м', 'ṃ', 'ṁ'],
      'n': ['ņ', 'ṇ', 'ṅ', 'ǹ', 'ñ'],
      'o': ['о', 'ō', 'ŏ', 'ȯ', 'ő', 'ọ', 'ỏ', 'ơ', 'ö', 'ô', 'ò', 'ó'],
      'p': ['р', 'ṗ', 'ṕ'],
      'r': ['ŕ', 'ř', 'ŗ', 'ṛ', 'ṟ'],
      's': ['ş', 'ŝ', 'ś', 'ṣ', 'ṡ', 'š'],
      't': ['ţ', 'ț', 'ṭ', 'ṫ'],
      'u': ['μ', 'υ', 'ū', 'ŭ', 'ů', 'ű', 'ų', 'ũ', 'ṳ', 'ú', 'ù', 'û', 'ü'],
      'v': ['ν', 'ṿ', 'ṽ'],
      'w': ['ŵ', 'ẁ', 'ẃ', 'ẅ', 'ω'],
      'x': ['х', 'ẋ', 'ẍ'],
      'y': ['у', 'ý', 'ÿ', 'ŷ', 'ẏ', 'ỵ', 'ỳ'],
      'z': ['ż', 'ẓ', 'ẕ', 'ź', 'ž']
    };

    // Normalize strings by replacing homographs with ASCII equivalents
    const normalizeString = (str) => {
      let normalized = str.toLowerCase();
      for (const [ascii, variants] of Object.entries(homographs)) {
        for (const variant of variants) {
          normalized = normalized.replace(new RegExp(variant, 'g'), ascii);
        }
      }
      return normalized;
    };

    const normalizedDomain = normalizeString(domain);
    const normalizedBrand = normalizeString(brand);

    // Check exact match after normalization
    if (normalizedDomain === normalizedBrand) {
      return 0.95;
    }

    // Check if brand is contained in domain after normalization
    if (normalizedDomain.includes(normalizedBrand)) {
      return 0.9;
    }

    // Calculate Levenshtein distance on normalized strings
    const distance = this.levenshteinDistance(normalizedDomain, normalizedBrand);
    if (distance <= 2 && brand.length > 4) {
      return 0.85;
    }

    return 0;
  }

  /**
   * Calculate the maximum number of consecutive special characters
   * @param {string} url - URL to analyze
   * @return {number} Maximum count of consecutive special characters
   */
  calculateConsecutiveSpecialChars(url) {
    if (!url) return 0;

    // Define special characters (non-alphanumeric excluding some common URL chars)
    const specialPattern = /[^a-zA-Z0-9./:_-]/g;

    let maxConsecutiveCount = 0;
    let currentCount = 0;
    let lastWasSpecial = false;

    // Analyze each character
    for (let i = 0; i < url.length; i++) {
      const char = url[i];
      const isSpecial = specialPattern.test(char);
      specialPattern.lastIndex = 0; // Reset regex

      if (isSpecial) {
        if (lastWasSpecial) {
          // Continue the sequence
          currentCount++;
        } else {
          // Start a new sequence
          currentCount = 1;
        }

        // Update max if needed
        if (currentCount > maxConsecutiveCount) {
          maxConsecutiveCount = currentCount;
        }
      } else {
        // Reset counter for non-special chars
        currentCount = 0;
      }

      lastWasSpecial = isSpecial;
    }

    return maxConsecutiveCount;
  }

  /**
   * Calculate suspiciousness score based on trigram analysis
   * @param {string} url - URL to analyze
   * @return {number} Suspicion score between 0-1
   */
  calculateTrigramSuspicion(url) {
    if (!url || url.length < 3) return 0;

    // Remove protocol and common parts
    const cleanUrl = url.replace(/^https?:\/\//i, '').toLowerCase();

    // Known suspicious trigrams (based on common phishing patterns)
    const suspiciousTrigrams = [
      'sec', 'log', 'sig', 'ver', 'acc', 'pwd', 'pay', 'upd',
      'con', 'cli', 'onl', 'inj', 'pep', 'cha', 'otp', 'pin',
      'ssn', 'ssw', 'scr', 'acn', 'lin', 'pro', 'uth', 'dat'
    ];

    // Known safe trigrams (common in legitimate URLs)
    const safeTrigrams = [
      'com', 'org', 'gov', 'edu', 'net', 'www', 'htm', 'app',
      'api', 'cdn', 'img', 'css', 'jsp', 'xml', 'rss', 'svg',
      'png', 'jpg', 'gif', 'pdf', 'doc', 'txt', 'zip'
    ];

    // Extract trigrams from the URL
    const trigrams = [];
    for (let i = 0; i <= cleanUrl.length - 3; i++) {
      trigrams.push(cleanUrl.substring(i, i + 3));
    }

    if (trigrams.length === 0) return 0;

    // Count suspicious and safe trigrams
    let suspiciousCount = 0;
    let safeCount = 0;
    let randomCount = 0;

    for (const trigram of trigrams) {
      // Skip numeric trigrams
      if (/^\d+$/.test(trigram)) continue;

      // Check for random looking trigram (mixed numbers and letters in unusual ways)
      if (/\d[a-z]\d/.test(trigram) || /[a-z]\d[a-z]/.test(trigram)) {
        randomCount++;
        continue;
      }

      if (suspiciousTrigrams.includes(trigram)) {
        suspiciousCount++;
      } else if (safeTrigrams.includes(trigram)) {
        safeCount++;
      }
    }

    // Calculate ratio of suspicious to total classifiable trigrams
    const totalClassified = suspiciousCount + safeCount;

    // Default medium-low score if no classified trigrams
    if (totalClassified === 0) {
      // If we have random trigrams, they are somewhat suspicious
      if (randomCount > 0) {
        return Math.min(0.6, randomCount / trigrams.length);
      }
      return 0.2; // Default low score
    }

    // Add weight for random-looking trigrams
    let randomFactor = 0;
    if (randomCount > 0) {
      randomFactor = Math.min(0.3, randomCount / trigrams.length * 0.5);
    }

    // Calculate suspicion score (0-1)
    const baseScore = suspiciousCount / totalClassified;

    // Combine base score with random factor
    return Math.min(1, baseScore + randomFactor);
  }
}

/**
 * Helper function to create a singleton instance of PhishingURLDetection
 * @param {Object} options - Configuration options
 * @returns {PhishingURLDetection} Singleton instance
 */
let phishingDetectionInstance = null;
export function getPhishingDetection(options = {}) {
  if (!phishingDetectionInstance) {
    phishingDetectionInstance = new PhishingURLDetection(options);
  } else if (Object.keys(options).length > 0) {
    phishingDetectionInstance.updateConfig(options);
  }
  return phishingDetectionInstance;
}