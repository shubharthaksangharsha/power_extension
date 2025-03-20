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

// Add this function near the top of content.js
function createFallbackIndicator() {
  // Create a floating indicator that doesn't require scripts
  const indicator = document.createElement('div');
  
  // Apply styles directly
  Object.assign(indicator.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#333',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    maxWidth: '300px',
    animation: 'fadeIn 0.3s ease forwards'
  });
  
  // Add indicator to the page
  document.body.appendChild(indicator);
  
  return indicator;
}

// Add this function above showToast in content.js
function showFallbackToast(title, message, type = 'info', duration = 5000) {
  const indicator = createFallbackIndicator();
  
  // Set color based on type
  let color = '#4285f4'; // info (blue)
  switch (type) {
    case 'success':
      color = '#34a853'; // green
      break;
    case 'error':
      color = '#ea4335'; // red
      break;
    case 'processing':
      color = '#fbbc05'; // yellow
      break;
  }
  
  indicator.style.borderLeft = `4px solid ${color}`;
  
  // Set content
  indicator.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
    <div>${message}</div>
  `;
  
  // Remove after duration
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(20px)';
    indicator.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 300);
  }, duration);
  
  return indicator;
}

// Update showToast function to use the fallback on CSP-restricted pages
function showToast(title, message, type = 'info', duration = 5000) {
  // Try to detect if we're in a restricted environment like Jupyter
  const inJupyter = window.location.href.includes('jupyter') || 
                   document.querySelector('.jp-Notebook') !== null;
  
  // Use fallback for Jupyter or if notification fails
  if (inJupyter) {
    return showFallbackToast(title, message, type, duration);
  }
  
  // Original toast implementation with a fallback
  try {
    // Create a custom element to communicate with the page
    const toastEvent = document.createElement('div');
    toastEvent.id = 'gemini-toast-trigger-' + Date.now();
    toastEvent.setAttribute('data-title', title);
    toastEvent.setAttribute('data-message', message);
    toastEvent.setAttribute('data-type', type);
    toastEvent.setAttribute('data-duration', duration);
    toastEvent.style.display = 'none';
    
    // Add custom event listener
    document.addEventListener('gemini-toast-trigger-ready', function handleToastTrigger(e) {
      if (e.target.id === toastEvent.id) {
        // Extract the data and show toast
        const toastData = {
          title: e.target.getAttribute('data-title'),
          message: e.target.getAttribute('data-message'),
          type: e.target.getAttribute('data-type'),
          duration: parseInt(e.target.getAttribute('data-duration'), 10)
        };
        
        // Add a script that will be executed in the page context
        const script = document.createElement('script');
        script.textContent = `
          if (window.geminiToastNotifier) {
            window.geminiToastNotifier.showToast(
              "${toastData.title.replace(/"/g, '\\"')}", 
              "${toastData.message.replace(/"/g, '\\"')}", 
              "${toastData.type}", 
              ${toastData.duration}
            );
          }
        `;
        
        // Create a new event to communicate without inline scripts
        const toastComm = new CustomEvent('gemini-toast-show', {
          detail: toastData
        });
        document.dispatchEvent(toastComm);
        
        // Cleanup
        document.removeEventListener('gemini-toast-trigger-ready', handleToastTrigger);
        if (e.target.parentNode) {
          e.target.parentNode.removeChild(e.target);
        }
      }
    });
    
    // Append to document to trigger the event
    document.body.appendChild(toastEvent);
    
    // Dispatch the ready event
    const readyEvent = new CustomEvent('gemini-toast-trigger-ready', {
      bubbles: true
    });
    toastEvent.dispatchEvent(readyEvent);
  } catch (error) {
    console.error('Toast error, using fallback:', error);
    return showFallbackToast(title, message, type, duration);
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Initialize toast system on page load
  if (document.readyState === 'complete') {
    initializeToastSystem();
  } else {
    window.addEventListener('load', initializeToastSystem);
  }
  
  // Handle notification request
  if (message.action === "showToast") {
    showToast(
      message.title, 
      message.message, 
      message.type || 'info', 
      message.duration || 5000
    );
    sendResponse({success: true});
    return true;
  }
  
  // Handle request to get clipboard content
  if (message.action === "getClipboardContent") {
    navigator.clipboard.readText()
      .then(text => {
        showToast("Clipboard Read", "Sending content to Gemini...", "processing");
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
          sendResponse({success: true, content: clipboardText});
        } else {
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
      } 
      // Handle contentEditable elements
      else if (activeElement.isContentEditable) {
        // Execute command to paste text
        document.execCommand('insertText', false, message.response);
      }
      
      sendResponse({success: true});
    } else {
      // If we're not in an editable field, try to use clipboard API
      navigator.clipboard.writeText(message.response)
        .then(() => {
          chrome.runtime.sendMessage({
            action: "showNotification", 
            title: "Copied to Clipboard",
            message: "The response has been copied to your clipboard."
          });
          sendResponse({success: true});
        })
        .catch(err => {
          console.error("Could not copy text: ", err);
          sendResponse({success: false, error: err.message});
        });
    }
    
    return true; // Required for async sendResponse
  }
}); 