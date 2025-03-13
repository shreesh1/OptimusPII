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

## Screenshots

1. Interactive Module for Blocking or Allowing
![image](https://github.com/user-attachments/assets/d10f8632-8487-4bbc-9091-998edb5c74db)

2. Notifications for other modes if paste is directly blocked or detected in alert mode
Block Mode
![image](https://github.com/user-attachments/assets/e6937119-f2b9-4c91-9db8-a9aaad2112be)

Alert Mode
![image](https://github.com/user-attachments/assets/228d4ac7-3526-4782-a4f2-b9169d670e20)

3. Configuration changes from the options mode for blocking or interactive mode
![image](https://github.com/user-attachments/assets/c3bab661-6d06-4b20-b2d1-69769e5677f6)

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

## Supported Websites

- ChatGPT (https://chatgpt.com/*)
- Claude AI (https://claude.ai/*)

