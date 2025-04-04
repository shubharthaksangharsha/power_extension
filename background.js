// Store the latest Gemini response
let geminiResponse = "";

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-to-gemini") {
    getClipboardAndSendToGemini();
  } else if (command === "paste-response") {
    pasteGeminiResponse();
  }
});

// Function to get clipboard content via content script and send to Gemini
async function getClipboardAndSendToGemini() {
  try {
    // Get active tab to request clipboard content from it
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) {
      showNotification("No active tab found", "error");
      return;
    }
    
    // Send message to content script to get clipboard content
    chrome.tabs.sendMessage(tabs[0].id, {action: "getClipboardContent"}, async (response) => {
      if (chrome.runtime.lastError) {
        showNotification("Failed to communicate with page", "error");
        return;
      }
      
      if (!response || !response.success) {
        showNotification("Failed to read clipboard", "error");
        return;
      }
      
      const clipboardContent = response.content;
      if (!clipboardContent) {
        showNotification("Empty clipboard", "error");
        return;
      }
      
      // Now process the clipboard content with Gemini
      await processContentWithGemini(clipboardContent);
    });
  } catch (error) {
    console.error("Error getting clipboard:", error);
    showNotification("Failed to get clipboard content", "error");
  }
}

// Process content with Gemini API
async function processContentWithGemini(content) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    
    if (!apiKey) {
      showNotification("API key missing", "error");
      return;
    }
    
    // Show indicator that request is being processed
    showNotification("Processing request", "processing");
    
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
      showNotification("API error: " + data.error.message, "error");
      return;
    }
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      geminiResponse = data.candidates[0].content.parts[0].text;
      
      // Store the response in extension storage for persistence
      await chrome.storage.local.set({latestGeminiResponse: geminiResponse});
      
      showNotification("Response ready (Ctrl+M to paste)", "success");
    } else {
      showNotification("Empty response from Gemini", "error");
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    showNotification("Failed to process request", "error");
  }
}

// Function to paste Gemini response
async function pasteGeminiResponse() {
  try {
    // Get the stored response
    const response = await chrome.storage.local.get('lastGeminiResponse');
    if (!response.lastGeminiResponse) {
      showNotification("No response to paste", "error");
      return;
    }

    // Get active tab
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) {
      showNotification("No active tab found", "error");
      return;
    }

    // Send paste message to content script
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "pasteContent",
      content: response.lastGeminiResponse
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        showNotification("Failed to paste content", "error");
      }
    });
  } catch (error) {
    console.error("Error pasting response:", error);
    showNotification("Failed to paste response", "error");
  }
}

// Function to show notification via content script
function showNotification(status, type = 'info', duration = 3000) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showNotification",
        status: status,
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
    showNotification("API key saved", "success");
    sendResponse({success: true});
    return true;
  }
  
  if (message.action === "testNotification") {
    console.log("Testing notification with minimalist mode:", message.minimalistMode);
    // Force storage update first to ensure the new setting is used
    chrome.storage.local.set({minimalistMode: message.minimalistMode}, function() {
      // Then show a test notification
      if (message.minimalistMode) {
        showNotification("Test notification", "info");
      } else {
        showNotification("Display mode changed to detailed", "info");
      }
    });
    return true;
  }
  
  return false;
}); 
