document.addEventListener('DOMContentLoaded', function() {
  // Load saved API key
  chrome.storage.local.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
  });

  // Save API key button
  document.getElementById('saveApiKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      showStatus('Please enter a valid API key', 'error');
      return;
    }
    
    chrome.storage.local.set({geminiApiKey: apiKey}, function() {
      showStatus('API key saved successfully!', 'success');
      
      // Additional console log for debugging
      console.log('API key saved:', apiKey);
      
      // Send a message to background script to confirm the API key is saved
      chrome.runtime.sendMessage({
        action: "apiKeySaved",
        apiKey: apiKey
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error communicating with background script:', chrome.runtime.lastError);
        }
      });
    });
  });

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    
    // Make sure the status is visible
    statusElement.style.display = 'block';
    
    // Keep the status visible for longer (5 seconds)
    setTimeout(() => {
      statusElement.className = 'status';
      statusElement.style.display = 'none';
    }, 5000);
  }
}); 