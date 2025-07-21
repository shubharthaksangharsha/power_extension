# Gemini Clipboard Assistant

A Chrome extension that sends clipboard content or screenshots to Google's Gemini API and allows you to paste or display responses with keyboard shortcuts.

![Gemini Clipboard Assistant](window-screen.png)

## Features

- **Multiple Gemini models**: Switch between Gemini 2.0 Flash and Gemini 2.5 Flash with dynamic thinking
- **JSON response modes**: Get structured answers for multiple-choice questions
  - Single-select mode: Returns one best answer
  - Multi-select mode: Returns multiple correct answers
- **Screenshot analysis**: Automatically captures and analyzes your screen in JSON modes
- **Send clipboard content to Gemini**: Press `Alt+N` to send your clipboard content to Gemini AI
- **Paste Gemini's response**: Press `Alt+M` to paste the generated response
- **Model switching**: Press `Alt+V` to toggle between Gemini model versions
- **JSON mode toggle**: Press `Alt+C` to cycle between standard, single-select and multi-select modes
- **Context menu integration**: Right-click on selected text and choose "Send to Gemini"
- **Customizable display**:
  - Choose text color with color picker or presets
  - Select from 9 different screen positions
  - Clockwise rotation option that cycles through corner positions
  - Fine-tune with X/Y offset controls
- **Two notification styles**:
  - Minimalist mode: Shows only a small colored square indicator
  - Detailed mode: Shows toast notifications with status messages
- **Visual feedback**:
  - Green: Success / Response ready
  - Yellow: Processing
  - Red: Error
- **Works everywhere**: Compatible with all websites, including Jupyter notebooks

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension is now installed and ready to use

> **Note**: Microsoft Edge support will be added soon.

## Setup

1. Click on the extension icon to open the popup
2. Enter your Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
3. Click "Save API Key"
4. Configure display options:
   - Choose notification style with the "Minimalist mode" toggle
   - Select your preferred text color
   - Choose where indicators appear on screen
   - Enable Clockwise Rotation for dynamic positioning
5. You're all set!

## How to Use

### Basic Usage
1. Copy text to your clipboard (`Ctrl+C`)
2. Press `Alt+N` to send the clipboard content to Gemini
3. Wait for visual confirmation (color indicator or notification)
4. Navigate to where you want to paste the response
5. Press `Alt+M` to paste Gemini's response

### JSON Mode for Multiple Choice
1. Press `Alt+C` to toggle to Single or Multi-select JSON mode
2. Press `Alt+N` to take a screenshot of your multiple-choice question
3. The extension automatically analyzes the image and displays the answer(s)
4. Answer appears in your selected position on screen

### Model Switching
1. Press `Alt+V` to toggle between Gemini 2.0 Flash and Gemini 2.5 Flash models
2. A notification confirms your selection

### Context Menu
1. Select text on any webpage
2. Right-click and select "Send to Gemini"
3. Wait for the response
4. Press `Alt+M` to paste the response

## Notification Styles

### Minimalist Mode
When enabled (default), the extension shows only a small colored square:
- Yellow: Processing the request
- Green: Response ready to paste
- Red: Error occurred

### Detailed Mode
When minimalist mode is disabled, the extension shows toast notifications with descriptive text:
- Processing notifications show the status of your request
- Success notifications confirm when responses are ready
- Error notifications provide information about what went wrong

## Position Options

The extension offers multiple ways to position indicators on your screen:

### Fixed Position
Select from 9 different screen positions:
- Top: Left, Center, Right
- Middle: Left, Center, Right
- Bottom: Left, Center, Right

### Clockwise Rotation
Enable "Use Clockwise Rotation" to cycle through corner positions:
- Top Left → Top Right → Bottom Right → Bottom Left → repeat

### Fine-Tuning
Adjust the X and Y offset values to fine-tune the exact position.

## Technical Details

- Built with Chrome's Manifest V3
- Uses the Gemini 2.0 Flash and 2.5 Flash API
- Securely stores your API key in Chrome's local storage
- Compatible with Content Security Policy (CSP) restrictions
- Works in standard websites and restrictive environments like Jupyter notebooks

## Files

- `manifest.json`: Extension configuration
- `popup.html` & `popup.js`: User interface for settings and API key management
- `background.js`: Background service worker for API communication
- `content.js`: Content script for clipboard operations and visual feedback
- `toast.js`: Visual notification system
- `myicon.png`: Extension icon

## Privacy

- Your API key is stored only in your browser's local storage
- Clipboard data and screenshots are only sent to Google's Gemini API when you explicitly trigger the extension
- Screenshots are not saved locally or remotely - they are processed and discarded
- No data is collected or stored by the extension developers

## License

MIT License

## Credits

- Built with Google's Gemini API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
