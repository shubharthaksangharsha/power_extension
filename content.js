// Initialize toast notification system
function initializeToastSystem() {
  // Inject the toast script as a file (more CSP-friendly)
  if (!document.getElementById('gemini-toast-script')) {
    const script = document.createElement('script');
    script.id = 'gemini-toast-script';
    script.src = chrome.runtime.getURL('toast.js');
    document.head.appendChild(script);
  }
}

// Show minimalist toast notification
function showToast(status, type = 'info', duration = 3000) {
  // Use a fallback for Jupyter notebooks
  if (window.location.href.includes('jupyter') || document.querySelector('.jp-Notebook')) {
    return showFallbackToast(status, type, duration);
  }
  
  // Create a custom element to communicate with the page
  const toastEvent = document.createElement('div');
  toastEvent.id = 'gemini-toast-trigger-' + Date.now();
  toastEvent.setAttribute('data-status', status);
  toastEvent.setAttribute('data-type', type);
  toastEvent.setAttribute('data-duration', duration);
  toastEvent.style.display = 'none';
  
  // Add to page and dispatch event
  document.body.appendChild(toastEvent);
  
  // Create and dispatch a custom event
  const customEvent = new CustomEvent('gemini-toast-show', {
    detail: {
      status: status,
      type: type,
      duration: duration
    }
  });
  document.dispatchEvent(customEvent);
  
  // Cleanup
  setTimeout(() => {
    if (toastEvent.parentNode) {
      toastEvent.parentNode.removeChild(toastEvent);
    }
  }, 100);
}

// Fallback for restricted environments
function showFallbackToast(status, type = 'info', duration = 3000) {
  // Create a floating indicator that doesn't require scripts
  const indicator = document.createElement('div');
  
  // Set color based on type
  let bgColor = '#4285f4'; // info (blue)
  switch (type) {
    case 'success':
      bgColor = '#34a853'; // green
      break;
    case 'error':
      bgColor = '#ea4335'; // red
      break;
    case 'processing':
      bgColor = '#fbbc05'; // yellow
      break;
  }
  
  // Apply styles directly
  Object.assign(indicator.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: bgColor,
    color: 'white',
    padding: '10px 16px',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease'
  });
  
  // Set content
  indicator.textContent = status;
  
  // Add indicator to the page
  document.body.appendChild(indicator);
  
  // Trigger animation
  setTimeout(() => {
    indicator.style.opacity = '1';
    indicator.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 300);
  }, duration);
  
  return indicator;
}

// Add listener to document for toast communication
document.addEventListener('DOMContentLoaded', function() {
  const script = document.createElement('script');
  script.textContent = `
    document.addEventListener('gemini-toast-show', function(e) {
      if (window.geminiToastNotifier && e.detail) {
        window.geminiToastNotifier.showToast(
          e.detail.status, 
          e.detail.type, 
          e.detail.duration
        );
      }
    });
  `;
  document.head.appendChild(script);
  script.remove();
  
  // Initialize toast system
  initializeToastSystem();
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Initialize toast system if it hasn't been already
  initializeToastSystem();
  
  // Handle notification request
  if (message.action === "showToast") {
    showToast(
      message.status,
      message.type || 'info', 
      message.duration || 3000
    );
    sendResponse({success: true});
    return true;
  }
  
  // Handle request to get clipboard content
  if (message.action === "getClipboardContent") {
    navigator.clipboard.readText()
      .then(text => {
        showToast("SENDING", "processing");
        sendResponse({success: true, content: text});
      })
      .catch(error => {
        console.error("Error reading clipboard:", error);
        
        // Fallback method for environments where direct clipboard access fails
        const textArea = document.createElement("textarea");
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.opacity = "0";
        
        document.body.appendChild(textArea);
        textArea.focus();
        document.execCommand("paste");
        
        const clipboardText = textArea.value;
        document.body.removeChild(textArea);
        
        if (clipboardText) {
          showToast("SENDING", "processing");
          sendResponse({success: true, content: clipboardText});
        } else {
          showToast("ERROR", "error");
          sendResponse({success: false, error: "Could not read clipboard content"});
        }
      });
    
    return true; // Required for async sendResponse
  }
  
  // Handle paste request
  if (message.action === "pasteResponse" && message.response) {
    // Get the active element
    const activeElement = document.activeElement;
    
    // Check if the active element is an input or textarea
    if (activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'INPUT' || 
        activeElement.isContentEditable) {
      
      // Handle input and textarea elements
      if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        // Get the current selection positions
        const startPos = activeElement.selectionStart;
        const endPos = activeElement.selectionEnd;
        
        // Get the current value
        const currentValue = activeElement.value;
        
        // Create the new value with the response inserted
        const newValue = currentValue.substring(0, startPos) + 
                        message.response + 
                        currentValue.substring(endPos);
        
        // Set the new value
        activeElement.value = newValue;
        
        // Move the cursor to the end of the inserted text
        activeElement.selectionStart = startPos + message.response.length;
        activeElement.selectionEnd = startPos + message.response.length;
        
        showToast("PASTED", "success");
      } 
      // Handle contentEditable elements
      else if (activeElement.isContentEditable) {
        // Execute command to paste text
        document.execCommand('insertText', false, message.response);
        showToast("PASTED", "success");
      }
      
      sendResponse({success: true});
    } else {
      // If we're not in an editable field, try to use clipboard API
      navigator.clipboard.writeText(message.response)
        .then(() => {
          showToast("COPIED", "success");
          sendResponse({success: true});
        })
        .catch(err => {
          console.error("Could not copy text: ", err);
          showToast("ERROR", "error");
          sendResponse({success: false, error: err.message});
        });
    }
    
    return true; // Required for async sendResponse
  }
}); 