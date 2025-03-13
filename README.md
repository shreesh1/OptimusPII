# OptimusPII
Extension to block pasting PII (Personally Identifiable Information) in ChatGPT, Claude, and other web applications.

## Features

- Detects and blocks email addresses in pasted content
- Detects and blocks credit card numbers in pasted content
- Detects and blocks phone numbers in various international formats
- Detects and blocks Social Security Numbers (SSNs) in pasted content
- Multiple operational modes:
  - Interactive: Shows a popup with highlighted sensitive information and asks for confirmation
  - Block and Alert: Automatically blocks and shows a notification
  - Alert Only: Allows paste but shows a warning
  - Silent Block: Blocks paste without notifications
  - Disabled: Turns off all detection

## How it works

The extension monitors paste events on web pages and checks for patterns that match known PII formats. When detected, it can block the paste operation and/or notify the user based on the selected operational mode.

## PII Detection Types

- **Email Addresses**: Standard email format detection
- **Credit Card Numbers**: Major card formats (Visa, Mastercard, Amex, etc.) with or without spaces/dashes
- **Phone Numbers**: Various international formats with different separators and country codes
- **Social Security Numbers**: US SSN formats (XXX-XX-XXXX, XXX XX XXXX, or XXXXXXXXX) with validation rules

## Installation

Load the extension in your browser:

1. Chrome/Edge: Go to Extensions > Load unpacked > Select the extension folder
2. Firefox: Go to about:debugging > This Firefox > Load Temporary Add-on > Select manifest.json
