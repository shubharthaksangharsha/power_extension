document.addEventListener('DOMContentLoaded', function() {
  // Load saved API key
  chrome.storage.sync.get('geminiApiKey', function(data) {
    if (data.geminiApiKey) {
      document.getElementById('apiKey').value = data.geminiApiKey;
      document.getElementById('status').textContent = 'Status: API Key Set';
    }
  });
  
  // Save API key
  document.getElementById('saveKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      document.getElementById('status').textContent = 'Status: Please enter an API key';
      return;
    }
    
    chrome.storage.sync.set({
      'geminiApiKey': apiKey
    }, function() {
      document.getElementById('status').textContent = 'Status: API Key Saved';
      
      // Notify background script about the updated API key
      chrome.runtime.sendMessage({
        action: 'updateApiKey',
        apiKey: apiKey
      });
    });
  });
}); 