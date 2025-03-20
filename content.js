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

// Clean up any existing notification elements that might have text
function cleanupTextNotifications() {
  // Find and remove any text-based notification elements
  const notificationElements = document.querySelectorAll('.sending-notification, .gemini-toast, .toast-notification, .notification-text');
  notificationElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  
  // Check for any elements with "SENDING", "PROCESSING", etc. text
  const allElements = document.body.querySelectorAll('*');
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    if (element.textContent && 
        (element.textContent.includes('SENDING') || 
         element.textContent.includes('PROCESSING') || 
         element.textContent.includes('READY') ||
         element.textContent.includes('ERROR'))) {
      // Check if this is likely one of our notification elements
      const styles = window.getComputedStyle(element);
      if (styles.position === 'fixed' && 
          (styles.bottom === '0px' || parseInt(styles.bottom) < 50) &&
          element !== document.body) {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
  }
}

// Show indicator - works in all environments, no text
function showIndicator(type = 'info', duration = 2000) {
  // Clean up any existing notifications with text
  cleanupTextNotifications();
  
  // In Jupyter or CSP environments, always use direct DOM approach
  if (window.location.href.includes('jupyter') || 
      document.querySelector('.jp-Notebook') || 
      document.querySelector('.notebook_app')) {
    return showDirectIndicator(type, duration);
  }
  
  // For regular environments, try the script-based approach first
  try {
    // Dispatch event for the injected script
    const customEvent = new CustomEvent('gemini-indicator-show', {
      detail: {
        type: type,
        duration: duration
      }
    });
    document.dispatchEvent(customEvent);
    
    // If we don't see the indicator appear, fall back to direct approach
    setTimeout(() => {
      const injectedIndicator = document.querySelector('.gemini-color-indicator');
      if (!injectedIndicator || injectedIndicator.style.opacity !== '1') {
        showDirectIndicator(type, duration);
      }
    }, 50);
  } catch (e) {
    console.error('Failed to show indicator via event, using fallback:', e);
    return showDirectIndicator(type, duration);
  }
}

// Add listener for indicator communication with page scripts
function setupIndicatorListener() {
  try {
    if (!window.hasGeminiIndicatorListener) {
      document.addEventListener('gemini-indicator-show', function(e) {
        if (window.geminiColorIndicator && e.detail) {
          window.geminiColorIndicator.show(
            e.detail.type, 
            e.detail.duration
          );
        } else {
          // Fallback if the window object isn't available
          showDirectIndicator(e.detail.type, e.detail.duration);
        }
      });
      window.hasGeminiIndicatorListener = true;
    }
  } catch (e) {
    console.error('Error setting up indicator listener:', e);
  }
}

// MutationObserver to remove any text indicators that might appear
function setupObserver() {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Check if any added nodes might be our text notifications
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            
            // Check if this element has text like "SENDING", etc.
            if (element.textContent && 
                (element.textContent.includes('SENDING') || 
                 element.textContent.includes('PROCESSING') || 
                 element.textContent.includes('READY') ||
                 element.textContent.includes('ERROR'))) {
              
              // Check if this is likely one of our notification elements
              const styles = window.getComputedStyle(element);
              if (styles.position === 'fixed' && 
                  (styles.bottom === '0px' || parseInt(styles.bottom) < 50) &&
                  element !== document.body) {
                // Remove it
                if (element.parentNode) {
                  element.parentNode.removeChild(element);
                }
              }
            }
          }
        }
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeIndicator();
  setupIndicatorListener();
  setupObserver();
  cleanupTextNotifications();
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
        showIndicator("processing");
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
          showIndicator("processing");
          sendResponse({success: true, content: clipboardText});
        } else {
          showIndicator("error");
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
        
        showIndicator("success");
      } 
      // Handle contentEditable elements
      else if (activeElement.isContentEditable) {
        // Execute command to paste text
        document.execCommand('insertText', false, message.response);
        showIndicator("success");
      }
      
      sendResponse({success: true});
    } else {
      // If we're not in an editable field, try to use clipboard API
      navigator.clipboard.writeText(message.response)
        .then(() => {
          showIndicator("success");
          sendResponse({success: true});
        })
        .catch(err => {
          console.error("Could not copy text: ", err);
          showIndicator("error");
          sendResponse({success: false, error: err.message});
        });
    }
    
    return true; // Required for async sendResponse
  }
  
  // Handle indicator request
  if (message.action === "showIndicator") {
    showIndicator(
      message.type || 'info', 
      message.duration || 2000
    );
    sendResponse({success: true});
    return true;
  }
}); 