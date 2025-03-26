# OptimusPII

<p align="center">
  <img src="assets/icons/icon.png" alt="OptimusPII Logo" width="150" />
</p>

Extension to block pasting PII (Personally Identifiable Information) in ChatGPT, Claude, and other web applications.

## Features

- **Real-time Detection**: Automatically scans clipboard content when pasting to detect PII
- Detects and blocks email addresses in pasted content
- Detects and blocks credit card numbers in pasted content
- Detects and blocks phone numbers in various international formats
- Detects and blocks Social Security Numbers (SSNs) in pasted content
- Detects and blocks passport numbers in standard formats
- Detects and blocks Aadhaar numbers (Indian ID)
- Detects and blocks PAN card numbers (Indian tax ID)
- Detects and blocks passwords with common security requirements
- Support for custom regex patterns to detect additional types of sensitive information
- Paste Redacted option - replace sensitive information with sample/redacted values
- Customizable URL monitoring - specify which websites to monitor
- Toggle individual detection patterns on/off
- Customizable sample replacement text for each pattern
- Multiple operational modes:
  - Interactive: Shows a popup with highlighted sensitive information and asks for confirmation
  - Block and Alert: Automatically blocks and shows a notification
  - Alert Only: Allows paste but shows a warning
  - Silent Block: Blocks paste without notifications
  - Disabled: Turns off all detection

## Screenshots

1. Interactive Module for Blocking or Allowing

![image](https://github.com/user-attachments/assets/9da20097-a21c-44dc-b913-1d1f238ca1aa)

2. Notifications for other modes if paste is directly blocked or detected in alert mode

Block Mode

![image](https://github.com/user-attachments/assets/e6937119-f2b9-4c91-9db8-a9aaad2112be)

Alert Mode

![image](https://github.com/user-attachments/assets/228d4ac7-3526-4782-a4f2-b9169d670e20)

3. Configuration changes from the options mode for blocking or interactive mode

![image](https://github.com/user-attachments/assets/31507e7c-449c-4871-bd29-0fdfe39419bb)

![image](https://github.com/user-attachments/assets/370c8cd9-5d9d-4a90-8d30-272fe5bb14d9)

![image](https://github.com/user-attachments/assets/f6300c2a-946f-4e91-b874-1f6fe88ba0b0)

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
- **Passwords**: Common password patterns with symbols, numbers, and mixed case
- **Custom Patterns**: User-defined regex patterns for detecting specific types of sensitive information

## Developer Installation

### Chrome/
1. Download the source code
2. Go to `chrome://extensions/` (Chrome)
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder ( If issues rename manifest_chrome.json to manifest.json )

### Firefox
1. Download the source code
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the manifest_firefox.json file ( If issues rename manifest_firefox.json to manifest.json )

## Supported Websites

By default, the extension monitors:
- ChatGPT (https://chatgpt.com/*)
- Claude AI (https://claude.ai/*)

You can add or remove website patterns through the options page.

> Note : Tested it on google also, it works. Don't give them everything.

## Configuration Options

Access the extension options to customize how OptimusPII works:

1. **Operation Mode**: Select how the extension should respond to detected PII
   - Interactive mode provides a detailed popup showing detected information
   - Other modes provide varying levels of blocking and notifications

2. **Websites to Monitor**: Customize which websites the extension should monitor
   - Add new websites using URL patterns like "https://example.com/*"
   - Use wildcard patterns like "*://*.example.com/*" to match all protocols and subdomains

3. **Built-in Detection Patterns**: Toggle and customize default patterns
   - Enable/disable specific types of detection
   - Customize sample replacement text for each pattern
   - View the regex pattern being used for detection

4. **Custom Detection Patterns**: Add your own regex patterns to detect specific types of sensitive information
   - Name your pattern (e.g., "API Key", "Database Password")
   - Provide a regex pattern to match the sensitive information
   - Set sample replacement text for when using "Paste Redacted" option
   - Enable/disable patterns as needed
