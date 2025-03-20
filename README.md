# Gemini Clipboard Assistant Chrome Extension

A Chrome extension that processes clipboard content using Google's Gemini AI and allows you to paste the response using keyboard shortcuts.

## Features

- Process clipboard content with Gemini AI using Ctrl+J (or Command+J on Mac)
- Paste the AI response using Ctrl+V (or Command+V on Mac)
- Simple and intuitive keyboard shortcuts
- Real-time notifications for processing status

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Add your Gemini API key in the `background.js` file

## Usage

1. Copy any text to your clipboard
2. Press Ctrl+J (or Command+J on Mac) to process the content with Gemini AI
3. Wait for the notification confirming successful processing
4. Press Ctrl+V (or Command+V on Mac) to paste the AI response

## Requirements

- Google Chrome browser
- Gemini API key
- Internet connection

## Note

Make sure to add your Gemini API key in the `background.js` file before using the extension. 