document.addEventListener('DOMContentLoaded', function() {
  // Define constants for model types and JSON modes
  const MODEL_TYPES = {
    GEMINI_2_0_FLASH: "gemini-2.0-flash",
    GEMINI_2_5_FLASH: "gemini-2.5-flash"
  };

  const JSON_MODES = {
    NONE: "none",
    SINGLE: "single",
    MULTI: "multi"
  };
  
  // Load saved API key, minimalist mode, model type and JSON mode
  chrome.storage.local.get(['geminiApiKey', 'minimalistMode', 'modelType', 'jsonMode'], function(result) {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
    
    // Log the actual stored value
    console.log("Loaded minimalistMode from storage:", result.minimalistMode);
    
    // Set minimalist mode checkbox correctly
    // Note: explicitly check against false to handle undefined case
    const minimalistMode = result.minimalistMode !== false;
    console.log("Setting checkbox to:", minimalistMode);
    document.getElementById('minimalistMode').checked = minimalistMode;
    
    // Update model type display
    updateModelTypeDisplay(result.modelType || MODEL_TYPES.GEMINI_2_0_FLASH);
    
    // Update JSON mode display
    updateJsonModeDisplay(result.jsonMode || JSON_MODES.NONE);
  });

  // Save API key button
  document.getElementById('saveApiKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      showStatus('Please enter a valid API key', 'error');
      return;
    }
    
    chrome.storage.local.set({geminiApiKey: apiKey}, function() {
      showStatus('API key saved!', 'success');
      console.log('API key saved');
      
      // Send a message to background script to confirm the API key is saved
      chrome.runtime.sendMessage({
        action: "apiKeySaved",
        apiKey: apiKey
      });
    });
  });
  
  // Handle minimalist mode toggle
  document.getElementById('minimalistMode').addEventListener('change', function() {
    const minimalistMode = this.checked;
    
    console.log("Setting minimalist mode to:", minimalistMode);
    
    chrome.storage.local.set({minimalistMode: minimalistMode}, function() {
      showStatus(`Display mode set to ${minimalistMode ? 'minimalist' : 'detailed'}`, 'success');
      
      // Test the notification immediately so user sees the change
      chrome.runtime.sendMessage({
        action: "testNotification",
        minimalistMode: minimalistMode
      });
    });
  });
  
  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.modelType) {
      updateModelTypeDisplay(changes.modelType.newValue);
    }
    
    if (changes.jsonMode) {
      updateJsonModeDisplay(changes.jsonMode.newValue);
    }
  });
  
  // Update model type display in UI
  function updateModelTypeDisplay(modelType) {
    const modelTypeElement = document.getElementById('modelType');
    const modelBadgeElement = document.getElementById('modelBadge');
    
    if (modelType === MODEL_TYPES.GEMINI_2_5_FLASH) {
      modelTypeElement.textContent = 'Gemini 2.5 Flash';
      modelBadgeElement.textContent = '2.5';
      modelBadgeElement.className = 'badge badge-green';
    } else {
      modelTypeElement.textContent = 'Gemini 2.0 Flash';
      modelBadgeElement.textContent = '2.0';
      modelBadgeElement.className = 'badge badge-blue';
    }
  }
  
  // Update JSON mode display in UI
  function updateJsonModeDisplay(jsonMode) {
    const jsonModeElement = document.getElementById('jsonMode');
    const jsonBadgeElement = document.getElementById('jsonBadge');
    
    switch (jsonMode) {
      case JSON_MODES.SINGLE:
        jsonModeElement.textContent = 'JSON Single-Select';
        jsonBadgeElement.textContent = 'SINGLE';
        jsonBadgeElement.className = 'badge badge-orange';
        break;
      case JSON_MODES.MULTI:
        jsonModeElement.textContent = 'JSON Multi-Select';
        jsonBadgeElement.textContent = 'MULTI';
        jsonBadgeElement.className = 'badge badge-green';
        break;
      default:
        jsonModeElement.textContent = 'Standard';
        jsonBadgeElement.textContent = 'STD';
        jsonBadgeElement.className = 'badge badge-blue';
    }
  }

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.className = 'status';
      statusElement.style.display = 'none';
    }, 3000);
  }
}); 