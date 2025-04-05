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

// Initialize color indicator
function initializeIndicator() {
  // First, try direct DOM manipulation for Jupyter notebooks and other CSP-restricted environments
  if (window.location.href.includes('jupyter') || document.querySelector('.jp-Notebook')) {
    // We'll handle Jupyter differently - no need for test indicator
    return;
  }
  
  // For regular environments, inject the script file
  if (!document.getElementById('gemini-indicator-script')) {
    const script = document.createElement('script');
    script.id = 'gemini-indicator-script';
    script.src = chrome.runtime.getURL('toast.js');
    document.head.appendChild(script);
  }
}

// Direct indicator creation function (text-free version)
function showDirectIndicator(type = 'info', duration = 2000) {
  // Create or get the indicator
  let indicator = document.querySelector('.gemini-direct-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'gemini-direct-indicator';
    
    // Apply styles to make it a small square
    Object.assign(indicator.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '10px',
      height: '10px',
      borderRadius: '2px',
      backgroundColor: '#4285f4', // default blue
      opacity: '0',
      zIndex: '2147483647', // Highest possible z-index
      transition: 'opacity 0.2s ease, background-color 0.2s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      pointerEvents: 'none' // Make it non-interactive
    });
    
    document.body.appendChild(indicator);
  }
  
  // Clear any existing timeout
  if (indicator.timeoutId) {
    clearTimeout(indicator.timeoutId);
  }
  
  // Set color based on type
  switch (type) {
    case 'success':
      indicator.style.backgroundColor = '#34a853'; // green
      break;
    case 'error':
      indicator.style.backgroundColor = '#ea4335'; // red
      break;
    case 'processing':
      indicator.style.backgroundColor = '#fbbc05'; // yellow
      break;
    default:
      indicator.style.backgroundColor = '#4285f4'; // blue
  }
  
  // Show the indicator
  indicator.style.opacity = '1';
  
  // Set timeout to hide
  indicator.timeoutId = setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.timeoutId = null;
  }, duration);
  
  return indicator;
}

// Show notification based on user preference
async function showNotification(status, type = 'info', duration = 3000) {
  try {
    // Get user preference
    const result = await chrome.storage.local.get(['minimalistMode']);
    console.log("Minimalist mode setting:", result.minimalistMode);
    
    // Note: If minimalistMode is undefined, default to true
    // But if it's explicitly set to false, use detailed mode
    const minimalistMode = result.minimalistMode !== false; 
    
    // Special messaging based on type
    let message;
    switch (type) {
      case 'success':
        message = status || 'Success';
        break;
      case 'error':
        message = status || 'Error occurred';
        break;
      case 'processing':
        message = status || 'Processing request';
        break;
      default:
        message = status || 'Information';
    }
    
    // Check if we're in Jupyter notebook environment
    const isJupyter = window.location.href.includes('jupyter') || 
                     document.querySelector('.jp-Notebook') || 
                     document.querySelector('.notebook_app');
    
    console.log("Is Jupyter environment:", isJupyter);
    console.log("Using notification style:", minimalistMode ? "minimalist" : "detailed");
    
    // Use the appropriate notification style based on user preference
    if (minimalistMode) {
      // If minimalist mode is on, always use color square
      return showDirectIndicator(type, 2000);
    } else {
      // In detail mode, use appropriate method based on environment
      if (isJupyter) {
        // In Jupyter, use a special detailed notification that works in that environment
        return showJupyterDetailedToast(message, type, duration);
      } else {
        // In regular environments, use standard detailed toast
        return showDetailedToast(message, type, duration);
      }
    }
  } catch (err) {
    console.error("Error determining notification style:", err);
    // Fallback to minimalist as default in case of error
    return showDirectIndicator(type, 2000);
  }
}

// Create a Jupyter-specific detailed toast notification
function showJupyterDetailedToast(message, type = 'info', duration = 3000) {
  // Create a floating notification that works in Jupyter's CSP environment
  const toast = document.createElement('div');
  
  // Set color based on type
  let bgColor = '#4285f4'; // info (blue)
  let statusText = 'Info';
  
  switch (type) {
    case 'success':
      bgColor = '#34a853'; // green
      statusText = 'Success';
      break;
    case 'error':
      bgColor = '#ea4335'; // red
      statusText = 'Error';
      break;
    case 'processing':
      bgColor = '#fbbc05'; // yellow
      statusText = 'Processing';
      break;
  }
  
  // Apply styles (avoid using innerHTML for better CSP compatibility)
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'white',
    color: '#333',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    maxWidth: '300px',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    borderLeft: `4px solid ${bgColor}`
  });
  
  // Create title element
  const titleEl = document.createElement('div');
  titleEl.textContent = statusText;
  titleEl.style.fontWeight = 'bold';
  titleEl.style.marginBottom = '4px';
  
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  
  // Append elements to toast
  toast.appendChild(titleEl);
  toast.appendChild(messageEl);
  
  // Add to page
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
  
  return toast;
}

// Create a detailed toast notification for regular environments
function showDetailedToast(message, type = 'info', duration = 3000) {
  // Create a floating notification
  const toast = document.createElement('div');
  
  // Set color based on type
  let bgColor = '#4285f4'; // info (blue)
  let statusText = 'Info';
  
  switch (type) {
    case 'success':
      bgColor = '#34a853'; // green
      statusText = 'Success';
      break;
    case 'error':
      bgColor = '#ea4335'; // red
      statusText = 'Error';
      break;
    case 'processing':
      bgColor = '#fbbc05'; // yellow
      statusText = 'Processing';
      break;
  }
  
  // Apply styles
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'white',
    color: '#333',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    maxWidth: '300px',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    borderLeft: `4px solid ${bgColor}`
  });
  
  // Set content
  toast.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${statusText}</div>
    <div>${message}</div>
  `;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
  
  return toast;
}

// Clean up any existing notification elements
function cleanupNotifications() {
  // Find and remove any text-based notification elements
  const notificationElements = document.querySelectorAll('.sending-notification, .gemini-toast, .toast-notification, .notification-text');
  notificationElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

// Add listener for notification events
document.addEventListener('DOMContentLoaded', function() {
  initializeIndicator();
  cleanupNotifications();
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Initialize toast system if it hasn't been already
  initializeToastSystem();
  
  // Handle notification request
  if (message.action === "showNotification") {
    showNotification(
      message.status,
      message.type || 'info', 
      message.duration || 3000
    ).then(() => {
      sendResponse({success: true});
    }).catch(err => {
      console.error("Error showing notification:", err);
      sendResponse({success: false, error: err.message});
    });
    return true;
  }
  
  // Handle request to get clipboard content
  if (message.action === "getClipboardContent") {
    navigator.clipboard.readText()
      .then(text => {
        showNotification("Sending to Gemini", "processing");
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
          showNotification("Sending to Gemini", "processing");
          sendResponse({success: true, content: clipboardText});
        } else {
          showNotification("Failed to read clipboard", "error");
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
        
        showNotification("Response pasted", "success");
      } 
      // Handle contentEditable elements
      else if (activeElement.isContentEditable) {
        // Execute command to paste text
        document.execCommand('insertText', false, message.response);
        showNotification("Response pasted", "success");
      }
      
      sendResponse({success: true});
    } else {
      // If we're not in an editable field, try to use clipboard API
      navigator.clipboard.writeText(message.response)
        .then(() => {
          showNotification("Copied to clipboard", "success");
          sendResponse({success: true});
        })
        .catch(err => {
          console.error("Could not copy text: ", err);
          showNotification("Failed to copy response", "error");
          sendResponse({success: false, error: err.message});
        });
    }
    
    return true; // Required for async sendResponse
  }
}); 