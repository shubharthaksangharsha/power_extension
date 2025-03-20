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
      showToast("Error", "No active tab found", "error");
      return;
    }
    
    // Send message to content script to get clipboard content
    chrome.tabs.sendMessage(tabs[0].id, {action: "getClipboardContent"}, async (response) => {
      if (chrome.runtime.lastError) {
        showToast("Error", "Failed to communicate with page: " + chrome.runtime.lastError.message, "error");
        return;
      }
      
      if (!response || !response.success) {
        showToast("Error", "Failed to read clipboard: " + (response?.error || "Unknown error"), "error");
        return;
      }
      
      const clipboardContent = response.content;
      if (!clipboardContent) {
        showToast("Empty Clipboard", "Nothing to send to Gemini", "error");
        return;
      }
      
      // Now process the clipboard content with Gemini
      await processContentWithGemini(clipboardContent);
    });
  } catch (error) {
    console.error("Error getting clipboard:", error);
    showToast("Error", "Failed to get clipboard content: " + error.message, "error");
  }
}

// Process content with Gemini API
async function processContentWithGemini(content) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    
    if (!apiKey) {
      showToast("API Key Missing", "Please set your Gemini API key in the extension popup", "error");
      return;
    }
    
    // Show toast that request is being processed
    showToast("Processing", "Sending your request to Gemini...", "processing");
    
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
      showToast("Error", data.error.message || "Failed to get response from Gemini", "error");
      return;
    }
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      geminiResponse = data.candidates[0].content.parts[0].text;
      
      // Store the response in extension storage for persistence
      await chrome.storage.local.set({latestGeminiResponse: geminiResponse});
      
      showToast("Success", "Response from Gemini is ready! Press Ctrl+M to paste it", "success");
    } else {
      showToast("Error", "Received an empty response from Gemini", "error");
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    showToast("Error", "Failed to process your request: " + error.message, "error");
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
      showToast("No Response", "No Gemini response available to paste", "error");
      return;
    }
    
    // Send message to content script to handle pasting
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "pasteResponse", response: response});
      } else {
        showToast("Error", "Cannot paste response in the current context", "error");
      }
    });
    
  } catch (error) {
    console.error("Error pasting response:", error);
    showToast("Error", "Failed to paste response: " + error.message, "error");
  }
}

// Function to show toast via content script
function showToast(title, message, type = 'info', duration = 5000) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showToast",
        title: title,
        message: message,
        type: type,
        duration: duration
      });
    }
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
    showToast("API Key Saved", "Your Gemini API key has been saved successfully!", "success");
    sendResponse({success: true});
    return true;
  }
  
  return false;
}); 