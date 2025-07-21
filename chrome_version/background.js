// Store the latest Gemini response
let geminiResponse = "";

// Screenshot debounce control
let isCapturingScreenshot = false;
let screenshotDebounceTimer = null;
const SCREENSHOT_DEBOUNCE_TIME = 1000; // 1 second between screenshot attempts

// Default settings
const MODEL_TYPES = {
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_2_5_FLASH: "gemini-2.5-flash"
};

const JSON_MODES = {
  NONE: "none",
  SINGLE: "single",
  MULTI: "multi"
};

// Initialize settings on first load
chrome.runtime.onInstalled.addListener(async () => {
  // Set default model and JSON mode
  const settings = await chrome.storage.local.get(['modelType', 'jsonMode']);
  
  if (!settings.modelType) {
    await chrome.storage.local.set({
      modelType: MODEL_TYPES.GEMINI_2_0_FLASH
    });
  }
  
  if (!settings.jsonMode) {
    await chrome.storage.local.set({
      jsonMode: JSON_MODES.NONE
    });
  }
  
  // Create context menu
  chrome.contextMenus.create({
    id: "sendSelectionToGemini",
    title: "Send to Gemini",
    contexts: ["selection"]
  });
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-to-gemini") {
    await getClipboardAndSendToGemini();
  } else if (command === "paste-response") {
    await pasteGeminiResponse();
  } else if (command === "switch-model") {
    await toggleModelType();
  } else if (command === "toggle-json-mode") {
    await toggleJsonMode();
  }
});

// Toggle between model types
async function toggleModelType() {
  try {
    const settings = await chrome.storage.local.get(['modelType']);
    const currentModel = settings.modelType || MODEL_TYPES.GEMINI_2_0_FLASH;
    
    const newModel = currentModel === MODEL_TYPES.GEMINI_2_0_FLASH ? 
      MODEL_TYPES.GEMINI_2_5_FLASH : MODEL_TYPES.GEMINI_2_0_FLASH;
    
    await chrome.storage.local.set({ modelType: newModel });
    
    const modelName = newModel === MODEL_TYPES.GEMINI_2_0_FLASH ? "Gemini 2.0 Flash" : "Gemini 2.5 Flash";
    showNotification(`Switched to ${modelName}`, "success");
  } catch (error) {
    console.error("Error toggling model type:", error);
    showNotification("Failed to switch models", "error");
  }
}

// Toggle between JSON modes (none -> single -> multi -> none)
async function toggleJsonMode() {
  try {
    const settings = await chrome.storage.local.get(['jsonMode']);
    const currentMode = settings.jsonMode || JSON_MODES.NONE;
    
    let newMode = JSON_MODES.NONE;
    let modeName = "Standard Mode";
    
    switch (currentMode) {
      case JSON_MODES.NONE:
        newMode = JSON_MODES.SINGLE;
        modeName = "JSON Single-Select Mode";
        break;
      case JSON_MODES.SINGLE:
        newMode = JSON_MODES.MULTI;
        modeName = "JSON Multi-Select Mode";
        break;
      default:
        newMode = JSON_MODES.NONE;
        modeName = "Standard Mode";
    }
    
    await chrome.storage.local.set({ jsonMode: newMode });
    showNotification(`Switched to ${modeName}`, "success");
  } catch (error) {
    console.error("Error toggling JSON mode:", error);
    showNotification("Failed to switch JSON mode", "error");
  }
}

// Function to get clipboard content via content script and send to Gemini
async function getClipboardAndSendToGemini() {
  try {
    // Get active tab to request clipboard content from it
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) {
      showNotification("No active tab found", "error");
      return;
    }
    
    // Get current JSON mode
    const settings = await chrome.storage.local.get(['jsonMode']);
    const jsonMode = settings.jsonMode || JSON_MODES.NONE;
    
    // If in JSON mode, take a screenshot instead of using clipboard
    if (jsonMode !== JSON_MODES.NONE) {
      // Use debounced screenshot capture
      debouncedCaptureScreenshot(tabs[0].id);
      return;
    }
    
    // Otherwise, proceed with clipboard content
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

// Debounced screenshot capture function
function debouncedCaptureScreenshot(tabId) {
  // If already capturing, don't trigger another capture
  if (isCapturingScreenshot) {
    showNotification("Screenshot capture in progress...", "info");
    return;
  }
  
  // Clear any existing timer
  if (screenshotDebounceTimer) {
    clearTimeout(screenshotDebounceTimer);
  }
  
  // Set flag and show processing indicator
  isCapturingScreenshot = true;
  showNotification("Processing request", "processing");
  
  // Capture screenshot after short delay to ensure UI updates
  screenshotDebounceTimer = setTimeout(() => {
    captureScreenshotAndProcess(tabId)
      .finally(() => {
        // Reset flag when done (success or failure)
        isCapturingScreenshot = false;
        screenshotDebounceTimer = null;
      });
  }, 100);
}

// Capture screenshot and process it with Gemini
async function captureScreenshotAndProcess(tabId) {
  try {
    // Capture the screenshot of the visible area
    const screenshot = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
    
    // Create a data URL for the image
    const imageBase64 = screenshot.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
    
    // Get prompt based on the current JSON mode
    const settings = await chrome.storage.local.get(['jsonMode']);
    const jsonMode = settings.jsonMode || JSON_MODES.NONE;
    
    // Prepare prompt based on JSON mode
    let prompt = "";
    if (jsonMode === JSON_MODES.SINGLE) {
      prompt = "Look at this screenshot containing multiple choice question or options. Select ONE best option. Answer only with the number or letter of the option (like 1, 2, 3, A, B, C). Format as {\"answer\": \"X\"} where X is just the option number or letter. Use your own knowledge to select the best option. Do not choose wrong/already selected option.";
    } else {
      prompt = "Look at this screenshot containing multiple choice question or options. Select ALL applicable options. Answer only with the numbers or letters of the options separated by spaces (like \"1 2 3\" or \"A B C\"). Format as {\"answers\": \"X Y Z\"} where X Y Z are just the option numbers or letters. Use your own knowledge to select the best options. Do not choose wrong/already selected options.";
    }
    
    // Process the screenshot with Gemini
    await processContentWithGemini(prompt, imageBase64);
    
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    showNotification("Failed to capture screenshot", "error");
  }
}

// Process content with Gemini API
async function processContentWithGemini(content, imageBase64 = null) {
  try {
    // Get settings from storage
    const result = await chrome.storage.local.get(['geminiApiKey', 'modelType', 'jsonMode']);
    const apiKey = result.geminiApiKey;
    const modelType = result.modelType || MODEL_TYPES.GEMINI_2_0_FLASH;
    const jsonMode = result.jsonMode || JSON_MODES.NONE;
    
    if (!apiKey) {
      showNotification("API key missing", "error");
      return;
    }
    
    // Show indicator that request is being processed if not already shown
    showNotification("Processing request", "processing");
    
    // Prepare the request body based on JSON mode
    const requestBody = {
      contents: [
        {
          parts: []
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };
    
    // Add text part
    requestBody.contents[0].parts.push({
      text: formatPromptForJsonMode(content, jsonMode)
    });
    
    // Add image part if provided
    if (imageBase64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: "image/png",
          data: imageBase64
        }
      });
    }
    
    // Add thinking configuration for Gemini 2.5
    if (modelType === MODEL_TYPES.GEMINI_2_5_FLASH) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingBudget: -1  // Dynamic thinking
      };
    }
    
    // Add response schema for JSON modes
    if (jsonMode !== JSON_MODES.NONE) {
      requestBody.generationConfig.responseMimeType = "application/json";
      
      if (jsonMode === JSON_MODES.SINGLE) {
        requestBody.generationConfig.responseSchema = {
          type: "OBJECT",
          properties: {
            answer: {
              type: "STRING"
            }
          },
          required: ["answer"]
        };
      } else {
        requestBody.generationConfig.responseSchema = {
          type: "OBJECT",
          properties: {
            answers: {
              type: "STRING"
            }
          },
          required: ["answers"]
        };
      }
    }
    
    // Make the API request
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelType}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
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
      
      const rawResponse = data.candidates[0].content.parts[0].text;
      
      // Process JSON response if in JSON mode
      if (jsonMode !== JSON_MODES.NONE) {
        try {
          const jsonResponse = JSON.parse(rawResponse);
          
          // Extract answer(s) from JSON
          if (jsonMode === JSON_MODES.SINGLE && jsonResponse.answer) {
            geminiResponse = jsonResponse.answer;
            // Show special JSON answer notification
            showNotification(`JSON Answer: ${geminiResponse}`, "success");
          } else if (jsonMode === JSON_MODES.MULTI && jsonResponse.answers) {
            geminiResponse = jsonResponse.answers;
            // Show special JSON answers notification
            showNotification(`JSON Answers: ${geminiResponse}`, "success");
          } else {
            // Fallback to raw response if JSON structure is unexpected
            geminiResponse = rawResponse;
            showNotification("Response ready (Alt+M to paste)", "success");
          }
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError);
          geminiResponse = rawResponse; // Fallback to raw response
          showNotification("Response ready (Alt+M to paste)", "success");
        }
      } else {
        geminiResponse = rawResponse;
        showNotification("Response ready (Alt+M to paste)", "success");
      }
      
      // Store the response in extension storage for persistence
      await chrome.storage.local.set({latestGeminiResponse: geminiResponse});
    } else {
      showNotification("Empty response from Gemini", "error");
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    showNotification("Failed to process request", "error");
  }
}

// Format prompt based on JSON mode
function formatPromptForJsonMode(content, jsonMode) {
  if (jsonMode === JSON_MODES.NONE) {
    return content;
  }
  
  if (jsonMode === JSON_MODES.MULTI) {
    return `${content}\n\nYou can select multiple options. Present your answer in JSON format as {"answers": "X Y Z"} where X Y Z are just the option numbers like 1, 2, 3, without any additional text. Do not include any other text or explanation and also dont include option description. just the number of the options. If options as 1, 2, 3 not given assume the first one is 1 and the second one is 2 and the third one is 3.`;
  }
  
  // Single select mode (like 1, 2, 3)
  return `${content}\n\nSelect only ONE option. Present your answer in JSON format as {"answer": "X"} where X is just the option number like 1, 2, 3, without any additional text. Do not include any other text or explanation and also dont include option description. just the number of the option. If options as 1, 2, 3 not given assume the first one is 1 and the second one is 2 and the third one is 3.`;
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
      showNotification("No response available", "error");
      return;
    }
    
    // Send message to content script to handle pasting
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "pasteResponse", response: response});
      } else {
        showNotification("Cannot paste in current context", "error");
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
  
  // Handle position change test
  if (message.action === "testPositionChange") {
    console.log("Testing notification with new position:", message.position, message.positionX, message.positionY);
    
    // Show a test notification
    showNotification("Position updated", "success");
    return true;
  }
  
  // Handle clockwise mode test
  if (message.action === "testClockwiseIndicator") {
    console.log("Testing clockwise indicator");
    
    // Show a test notification
    showNotification("Clockwise mode enabled", "success");
    return true;
  }
  
  // Handle middle mouse click paste request
  if (message.action === "pasteResponseRequest") {
    pasteGeminiResponse();
    return true;
  }
  
  return false;
}); 
