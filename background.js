// Store the latest Gemini response
let geminiResponse = "";

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-to-gemini") {
    await getClipboardAndSendToGemini();
  } else if (command === "paste-response") {
    await pasteGeminiResponse();
  }
});

// Function to get clipboard content via content script and send to Gemini
async function getClipboardAndSendToGemini() {
  try {
    // Get active tab to request clipboard content from it
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) {
      showNotification("Error", "No active tab found");
      return;
    }
    
    // Send message to content script to get clipboard content
    chrome.tabs.sendMessage(tabs[0].id, {action: "getClipboardContent"}, async (response) => {
      if (chrome.runtime.lastError) {
        showNotification("Error", "Failed to communicate with page: " + chrome.runtime.lastError.message);
        return;
      }
      
      if (!response || !response.success) {
        showNotification("Error", "Failed to read clipboard: " + (response?.error || "Unknown error"));
        return;
      }
      
      const clipboardContent = response.content;
      if (!clipboardContent) {
        showNotification("Empty Clipboard", "Nothing to send to Gemini.");
        return;
      }
      
      // Now process the clipboard content with Gemini
      await processContentWithGemini(clipboardContent);
    });
  } catch (error) {
    console.error("Error getting clipboard:", error);
    showNotification("Error", "Failed to get clipboard content: " + error.message);
  }
}

// Process content with Gemini API
async function processContentWithGemini(content) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    
    if (!apiKey) {
      showNotification("API Key Missing", "Please set your Gemini API key in the extension popup.");
      return;
    }
    
    // Show notification that request is being processed
    showNotification("Processing", "Sending your request to Gemini...");
    
    // Prepare the request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: content
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      showNotification("Error", data.error.message || "Failed to get response from Gemini");
      return;
    }
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      geminiResponse = data.candidates[0].content.parts[0].text;
      
      // Store the response in extension storage for persistence
      await chrome.storage.local.set({latestGeminiResponse: geminiResponse});
      
      showNotification("Success", "Response from Gemini is ready! Press Ctrl+M to paste it.");
    } else {
      showNotification("Error", "Received an empty response from Gemini.");
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    showNotification("Error", "Failed to process your request: " + error.message);
  }
}

// Function to paste Gemini response
async function pasteGeminiResponse() {
  try {
    // Try to get response from memory first
    let response = geminiResponse;
    
    // If not in memory, try to get from storage
    if (!response) {
      const result = await chrome.storage.local.get(['latestGeminiResponse']);
      response = result.latestGeminiResponse;
    }
    
    if (!response) {
      showNotification("No Response", "No Gemini response available to paste.");
      return;
    }
    
    // Send message to content script to handle pasting
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "pasteResponse", response: response});
      } else {
        showNotification("Error", "Cannot paste response in the current context.");
      }
    });
    
  } catch (error) {
    console.error("Error pasting response:", error);
    showNotification("Error", "Failed to paste response: " + error.message);
  }
}

// Function to show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'myicon.png',
    title: title,
    message: message
  });
}

// Add context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendSelectionToGemini",
    title: "Send to Gemini",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendSelectionToGemini" && info.selectionText) {
    // Process the selected text directly
    processContentWithGemini(info.selectionText);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "apiKeySaved") {
    console.log("API key was saved successfully");
    showNotification("API Key Saved", "Your Gemini API key has been saved successfully!");
    sendResponse({success: true});
    return true;
  }
  
  if (message.action === "showNotification") {
    showNotification(message.title, message.message);
    sendResponse({success: true});
    return true;
  }
  
  return false;
}); 