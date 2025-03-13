# OptimusPII
Extension to block pasting PII (Personally Identifiable Information) in ChatGPT, Claude, and other web applications.

## Features

-  **Real-time Detection**: Automatically scans clipboard content when pasting to detect PII
- Detects and blocks email addresses in pasted content
- Detects and blocks credit card numbers in pasted content
- Detects and blocks phone numbers in various international formats
- Detects and blocks Social Security Numbers (SSNs) in pasted content
- Passport numbers
- Aadhaar numbers (Indian ID)
- PAN card numbers (Indian tax ID)
- Support for custom regex patterns to detect additional types of sensitive information
- Enable Disable Detection for specific user preference
- Multiple operational modes:
  - Interactive: Shows a popup with highlighted sensitive information and asks for confirmation
  - Block and Alert: Automatically blocks and shows a notification
  - Alert Only: Allows paste but shows a warning
  - Silent Block: Blocks paste without notifications
  - Disabled: Turns off all detection

## Screenshots

1. Interactive Module for Blocking or Allowing
![image](https://github.com/user-attachments/assets/8032b8a1-97bd-4ec4-ba93-ecf35391bb10)

2. Notifications for other modes if paste is directly blocked or detected in alert mode
Block Mode
![image](https://github.com/user-attachments/assets/e6937119-f2b9-4c91-9db8-a9aaad2112be)

Alert Mode
![image](https://github.com/user-attachments/assets/228d4ac7-3526-4782-a4f2-b9169d670e20)

3. Configuration changes from the options mode for blocking or interactive mode
![image](https://github.com/user-attachments/assets/58c0d2cd-337c-4e48-b3c0-77ccc031ae29)

## How it works

The extension monitors paste events on web pages and checks for patterns that match known PII formats. When detected, it can block the paste operation and/or notify the user based on the selected operational mode.

## PII Detection Types

- **Email Addresses**: Standard email format detection
- **Credit Card Numbers**: Major card formats (Visa, Mastercard, Amex, etc.) with or without spaces/dashes
- **Phone Numbers**: Various international formats with different separators and country codes
- **Social Security Numbers**: US SSN formats (XXX-XX-XXXX, XXX XX XXXX, or XXXXXXXXX) with validation rules
- **Passport Number**: Common international passport number formats
- **Aadhaar Number**: Indian national ID number format
- **PAN Card**: Indian tax ID format
- **Custom Patterns**: User-defined regex patterns for detecting specific types of sensitive information

## Installation

Load the extension in your browser:

1. Chrome/Edge: Go to Extensions > Load unpacked > Select the extension folder
2. Firefox: Go to about:debugging > This Firefox > Load Temporary Add-on > Select manifest.json

## Supported Websites

- ChatGPT (https://chatgpt.com/*)
- Claude AI (https://claude.ai/*)

## Configuration Options

Access the extension options to customize how OptimusPII works:

1. **Operation Mode**: Select how the extension should respond to detected PII
   - Interactive mode provides a detailed popup showing detected information
   - Other modes provide varying levels of blocking and notifications

2. **Custom Detection Patterns**: Add your own regex patterns to detect specific types of sensitive information
   - Name your pattern (e.g., "API Key", "Database Password")
   - Provide a regex pattern to match the sensitive information
   - Patterns can be added, edited, or removed through the options page

> NOTE : You can modify the manifest.json file to extend support to other websites. ( It will be on you 😁 )

