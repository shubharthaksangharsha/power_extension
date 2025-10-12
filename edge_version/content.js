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
function showDirectIndicator(type = 'info', duration = 2000, position = 'top-right', offsetX = 10, offsetY = 10) {
  // Create or get the indicator
  let indicator = document.querySelector('.gemini-direct-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'gemini-direct-indicator';
    
    // Apply styles to make it a small square
    Object.assign(indicator.style, {
      position: 'fixed',
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
  
  // Apply position
  applyPositionToElement(indicator, position, offsetX, offsetY);
  
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

// New function to display JSON answer indicator
function showJsonAnswerIndicator(answers, isMulti, position = 'top-right', offsetX = 10, offsetY = 10) {
  // Get saved text color
  chrome.storage.local.get(['answerTextColor'], function(result) {
    const textColor = result.answerTextColor || '#000000';
    
    // Create main indicator container
    let container = document.querySelector('.gemini-answer-container');
    
    if (!container) {
      container = document.createElement('div');
      container.className = 'gemini-answer-container';
      
      // Position the container
      Object.assign(container.style, {
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: '2147483647',
        pointerEvents: 'none', // Make it non-interactive
        gap: '3px'
      });
      
      document.body.appendChild(container);
    }
    
    // Apply position to container
    applyPositionToElement(container, position, offsetX, offsetY);
    
    // Create or get text display for the answer
    let textDisplay = container.querySelector('.gemini-answer-text');
    if (!textDisplay) {
      textDisplay = document.createElement('div');
      textDisplay.className = 'gemini-answer-text';
      
      // Style the text - only text color is customizable
      Object.assign(textDisplay.style, {
        color: textColor, // Use custom text color
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fixed background
        padding: '1px 3px',
        borderRadius: '2px',
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1',
        textAlign: 'center',
        opacity: '0',
        transition: 'opacity 0.3s ease',
        userSelect: 'none'
      });
      
      container.appendChild(textDisplay);
    } else {
      // Update text color if display already exists
      textDisplay.style.color = textColor;
    }
    
    // Create or get the color indicator
    let indicator = container.querySelector('.gemini-answer-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'gemini-answer-indicator';
      
      // Apply styles for indicator - always green, matching minimalistic indicators
      Object.assign(indicator.style, {
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        backgroundColor: '#34a853', // Always green - not affected by color picker
        opacity: '0',
        transition: 'opacity 0.3s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
      });
      
      container.appendChild(indicator);
    }
    
    // Update the text display
    textDisplay.textContent = answers;
    
    // Clear any existing timeout
    if (container.timeoutId) {
      clearTimeout(container.timeoutId);
    }
    
    // Show both components
    textDisplay.style.opacity = '1';
    // indicator.style.opacity = '1';
    
    // Set timeout to hide after 3 seconds
    container.timeoutId = setTimeout(() => {
      textDisplay.style.opacity = '0';
      // indicator.style.opacity = '0';
      
      // Remove the container after fade out
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300);
      
      container.timeoutId = null;
    }, 3000);
  });
}

// Cache for the current interaction position
let currentInteractionPosition = null;
let currentInteractionOffsetX = 10;
let currentInteractionOffsetY = 10;
let lastUsedClockwiseIndex = null;

// Reset position cache when the page loads
document.addEventListener('DOMContentLoaded', function() {
  currentInteractionPosition = null;
  lastUsedClockwiseIndex = null;
});

// Show notification based on user preference
async function showNotification(status, type = 'info', duration = 3000) {
  try {
    // Get user preference
    const result = await chrome.storage.local.get([
      'minimalistMode', 
      'jsonMode', 
      'indicatorPosition', 
      'positionX', 
      'positionY', 
      'clockwiseMode',
      'currentClockwiseIndex'
    ]);
    console.log("Minimalist mode setting:", result.minimalistMode);
    
    let position, posX, posY;
    
    // If this is a "processing" notification, it's the start of a new interaction
    if (type === 'processing') {
      // Reset position cache for a new interaction
      currentInteractionPosition = null;
    }
    
    // Check if we already have a position for this interaction
    if (currentInteractionPosition) {
      console.log("Using cached position for current interaction:", currentInteractionPosition);
      position = currentInteractionPosition;
      posX = currentInteractionOffsetX;
      posY = currentInteractionOffsetY;
    } else {
      // Handle clockwise positioning if enabled
      if (result.clockwiseMode) {
        // Define the clockwise positions (corners only)
        const CLOCKWISE_POSITIONS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
        
        // Get current index (default to 0 if not set)
        let currentIndex = result.currentClockwiseIndex !== undefined ? result.currentClockwiseIndex : 0;
        lastUsedClockwiseIndex = currentIndex;
        
        // Use the current position
        position = CLOCKWISE_POSITIONS[currentIndex];
        
        // Calculate next index for next time (only update when we start a new interaction)
        if (type === 'processing') {
          const nextIndex = (currentIndex + 1) % CLOCKWISE_POSITIONS.length;
          
          // Save the new index for next time
          await chrome.storage.local.set({currentClockwiseIndex: nextIndex});
          
          console.log(`Clockwise mode: using position ${position} (index ${currentIndex}), next will be ${CLOCKWISE_POSITIONS[nextIndex]}`);
        }
        
        // Use saved offsets
        posX = result.positionX !== undefined ? result.positionX : 10;
        posY = result.positionY !== undefined ? result.positionY : 10;
      } else {
        // Use fixed position as set in options
        position = result.indicatorPosition || 'top-right';
        posX = result.positionX !== undefined ? result.positionX : 10;
        posY = result.positionY !== undefined ? result.positionY : 10;
      }
      
      // Cache the position for this interaction
      currentInteractionPosition = position;
      currentInteractionOffsetX = posX;
      currentInteractionOffsetY = posY;
      
      console.log("Setting new position for interaction:", position);
    }
    
    // Check if this is a JSON answer notification
    const isJsonAnswer = status && (status.startsWith("JSON Answer:") || status.startsWith("JSON Answers:"));
    
    // If it's a JSON answer notification, handle it specially
    if (isJsonAnswer && type === 'success') {
      // Extract the answer(s) from the notification text
      let answers = '';
      let isMulti = false;
      
      if (status.startsWith("JSON Answer:")) {
        answers = status.replace("JSON Answer:", "").trim();
      } else {
        answers = status.replace("JSON Answers:", "").trim();
        isMulti = true;
      }
      
      // Show a special indicator for JSON answers
      return showJsonAnswerIndicator(answers, isMulti, position, posX, posY);
    }
    
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
      return showDirectIndicator(type, 2000, position, posX, posY);
    } else {
      // In detail mode, use appropriate method based on environment
      if (isJupyter) {
        // In Jupyter, use a special detailed notification that works in that environment
        return showJupyterDetailedToast(message, type, duration, position, posX, posY);
      } else {
        // In regular environments, use standard detailed toast
        return showDetailedToast(message, type, duration, position, posX, posY);
      }
    }
  } catch (err) {
    console.error("Error determining notification style:", err);
    // Fallback to minimalist as default in case of error
    return showDirectIndicator(type, 2000, 'top-right', 10, 10);
  }
}

// Create a Jupyter-specific detailed toast notification
function showJupyterDetailedToast(message, type = 'info', duration = 3000, position = 'top-right', offsetX = 10, offsetY = 10) {
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
  
  // Apply position
  applyPositionToElement(toast, position, offsetX, offsetY);
  
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
function showDetailedToast(message, type = 'info', duration = 3000, position = 'top-right', offsetX = 10, offsetY = 10) {
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
  
  // Apply position
  applyPositionToElement(toast, position, offsetX, offsetY);
  
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

// Apply position settings to an element
function applyPositionToElement(element, position, offsetX, offsetY) {
  // Reset any previously set position properties
  element.style.top = 'auto';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  element.style.left = 'auto';
  element.style.transform = 'none';
  
  // Apply position based on the position value
  switch (position) {
    case 'top-left':
      element.style.top = `${offsetY}px`;
      element.style.left = `${offsetX}px`;
      break;
      
    case 'top-center':
      element.style.top = `${offsetY}px`;
      element.style.left = '50%';
      element.style.transform = 'translateX(-50%)';
      break;
      
    case 'top-right':
      element.style.top = `${offsetY}px`;
      element.style.right = `${offsetX}px`;
      break;
      
    case 'middle-left':
      element.style.top = '50%';
      element.style.left = `${offsetX}px`;
      element.style.transform = 'translateY(-50%)';
      break;
      
    case 'middle-center':
      element.style.top = '50%';
      element.style.left = '50%';
      element.style.transform = 'translate(-50%, -50%)';
      break;
      
    case 'middle-right':
      element.style.top = '50%';
      element.style.right = `${offsetX}px`;
      element.style.transform = 'translateY(-50%)';
      break;
      
    case 'bottom-left':
      element.style.bottom = `${offsetY}px`;
      element.style.left = `${offsetX}px`;
      break;
      
    case 'bottom-center':
      element.style.bottom = `${offsetY}px`;
      element.style.left = '50%';
      element.style.transform = 'translateX(-50%)';
      break;
      
    case 'bottom-right':
      element.style.bottom = `${offsetY}px`;
      element.style.right = `${offsetX}px`;
      break;
      
    default:
      // Default to top-right
      element.style.top = `${offsetY}px`;
      element.style.right = `${offsetX}px`;
  }
}

// Clean up any existing notification elements
function cleanupNotifications() {
  // Find and remove any text-based notification elements
  const notificationElements = document.querySelectorAll('.sending-notification, .gemini-toast, .toast-notification, .notification-text, .gemini-answer-indicator, .gemini-answer-container, .gemini-answer-text, .gemini-answer-tooltip');
  notificationElements.forEach(element => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

// Add middle mouse click event listener
document.addEventListener('mouseup', async (e) => {
  // Check if it's middle mouse button (button 1)
  if (e.button === 1) {
    // Send message to background script to paste response
    chrome.runtime.sendMessage({action: "pasteResponseRequest"});
  }
});

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