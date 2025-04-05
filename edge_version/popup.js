document.addEventListener('DOMContentLoaded', function() {
  // Load saved API key and minimalist mode setting
  chrome.storage.local.get(['geminiApiKey', 'minimalistMode'], function(result) {
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