


/**
 * Detect sensitive information in text
 * @param {string} text - Text to analyze
 * @param {Object} customPatterns - Custom regex patterns
 * @returns {Object} Detection results
 */
export function detectSensitiveInformation(text, customPatterns = {}) {
  const patternMatches = {};
  const patternObjects = {};

  // Process all enabled regex patterns
  for (const [name, details] of Object.entries(customPatterns)) {
    // Skip disabled patterns
    if (!details.enabled) continue;

    try {
      // Create RegExp object from pattern string
      const patternMatch = details.pattern.match(/^\/(.*)\/([gimuy]*)$/);
      if (patternMatch) {
        patternObjects[name] = new RegExp(patternMatch[1], patternMatch[2] + 'g'); // Add 'g' flag if missing
      } else {
        patternObjects[name] = new RegExp(details.pattern, 'g');
      }

      // Find matches
      const foundMatches = text.match(patternObjects[name]) || [];
      if (foundMatches.length > 0) {
        patternMatches[name] = foundMatches;
      }
    } catch (error) {
      console.error(`Error with regex pattern ${name}:`, error);
    }
  }

  return { patternMatches, patternObjects };
}

/**
 * Create redacted version of text by replacing sensitive data with samples
 * @param {string} text - Original text
 * @param {Object} patternMatches - Detected pattern matches
 * @param {Object} samples - Sample replacements
 * @returns {string} Redacted text
 */
export function createRedactedText(text, patternMatches, samples) {
  if (!text) return '';

  // Create a copy of the original text
  let redactedText = text;

  // For each matched pattern type, replace all matches with the sample data
  for (const [patternName, matches] of Object.entries(patternMatches)) {
    const sampleValue = samples[patternName] || "REDACTED";

    // Sort matches by start position in descending order to replace from end to beginning
    const sortedMatches = [...matches].sort((a, b) => {
      const indexA = text.indexOf(a);
      const indexB = text.indexOf(b);
      return indexB - indexA;
    });

    // Replace each match with the sample data
    for (const match of sortedMatches) {
      const index = redactedText.indexOf(match);
      if (index !== -1) {
        redactedText = redactedText.substring(0, index) +
          sampleValue +
          redactedText.substring(index + match.length);
      }
    }
  }

  return redactedText;
}