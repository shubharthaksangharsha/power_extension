// Initialize Gemini API
let GEMINI_API_KEY = ''; // Will be loaded from storage
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let lastProcessedText = '';
let lastResponse = '';

// Load API key from storage
chrome.storage.sync.get('geminiApiKey', function(data) {
  if (data.geminiApiKey) {
    GEMINI_API_KEY = data.geminiApiKey;
  }
});

// Listen for API key updates from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateApiKey') {
    GEMINI_API_KEY = request.apiKey;
  }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'process-clipboard') {
    try {
      if (!GEMINI_API_KEY) {
        throw new Error('API key not set');
      }
      
      // Get clipboard content
      const text = await navigator.clipboard.readText();
      lastProcessedText = text;
      
      // Process with Gemini
      const response = await processWithGemini(text);
      lastResponse = response;
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'myicon.png',
        title: 'Gemini Assistant',
        message: 'Content processed successfully! Press Ctrl+[ to paste response.'
      });
    } catch (error) {
      console.error('Error processing clipboard:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'myicon.png',
        title: 'Error',
        message: error.message === 'API key not set' 
          ? 'Please set your Gemini API key in the extension popup'
          : 'Failed to process clipboard content'
      });
    }
  } else if (command === 'paste-response') {
    try {
      // Write response to clipboard and directly paste it
      await navigator.clipboard.writeText(lastResponse);
      
      // Instead of trying to simulate Ctrl+V, directly insert text into active element
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "directPaste",
          text: lastResponse
        });
      });
    } catch (error) {
      console.error('Error pasting response:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'myicon.png',
        title: 'Error',
        message: 'Failed to paste response'
      });
    }
  }
});

async function processWithGemini(text) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: text
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
} 