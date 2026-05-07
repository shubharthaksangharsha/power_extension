// Initialize toast notification system
function geminiExtensionCtxLive() {
  try {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
  } catch (_) {
    return false;
  }
}

let geminiStaleBannerShowing = false;
function showGeminiStaleBannerOnce() {
  if (geminiStaleBannerShowing || !document.body) {
    return;
  }
  geminiStaleBannerShowing = true;
  const hint = document.createElement('div');
  hint.setAttribute('data-gemini-stale', '1');
  hint.textContent =
    'Gemini extension was reloaded — refresh this tab (F5), then continue.';
  Object.assign(hint.style, {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    zIndex: '2147483647',
    fontFamily: 'system-ui, Segoe UI, Arial, sans-serif',
    fontSize: '13px',
    boxShadow: '0 4px 14px rgba(0,0,0,.35)',
    maxWidth: 'min(520px, 94vw)',
    textAlign: 'center',
    lineHeight: '1.35'
  });
  document.body.appendChild(hint);
  setTimeout(() => {
    hint.remove();
    geminiStaleBannerShowing = false;
  }, 14000);
}

/** Avoid uncaught rejects when chrome.runtime was torn down after extension reload. */
function geminiRuntimeSend(payload) {
  try {
    if (!geminiExtensionCtxLive()) {
      showGeminiStaleBannerOnce();
      showDirectIndicator('error', 3500, 'bottom-right', 28, 28);
      return false;
    }
    chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime.lastError;
    });
    return true;
  } catch (_) {
    showGeminiStaleBannerOnce();
    showDirectIndicator('error', 3500, 'bottom-right', 28, 28);
    return false;
  }
}

function initializeToastSystem() {
  if (!geminiExtensionCtxLive()) {
    return;
  }
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
  if (!geminiExtensionCtxLive()) {
    return;
  }
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
  if (!geminiExtensionCtxLive()) {
    showGeminiStaleBannerOnce();
    showDirectIndicator('success', 2500, position, offsetX, offsetY);
    return;
  }
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

// Remember the most recently focused editable element. This is used by the
// "Paste" button on the in-page expander: clicking the button itself moves
// `document.activeElement` to the button, so the paste handler would
// otherwise have no idea where the user actually wanted the text.
let lastEditableElement = null;
function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || el.isContentEditable === true;
}
document.addEventListener('focusin', (e) => {
  if (isEditableElement(e.target)) {
    lastEditableElement = e.target;
  }
}, true);

// Reset position cache when the page loads
document.addEventListener('DOMContentLoaded', function() {
  currentInteractionPosition = null;
  lastUsedClockwiseIndex = null;
});

function readLocalSelectionOrInputSlice() {
  try {
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT') &&
        typeof ae.value === 'string') {
      const start = ae.selectionStart ?? 0;
      const end = ae.selectionEnd ?? 0;
      if (start !== end) {
        return ae.value.substring(start, end).trim();
      }
    }
    const sel = window.getSelection && window.getSelection().toString();
    return (sel && sel.trim()) ? sel.trim() : '';
  } catch (_) {
    return '';
  }
}

// Best-effort copy of an error message to the user's clipboard. Used for
// every red/error notification so users can paste the actual error message
// somewhere (a bug report, a search engine, etc.) instead of just seeing
// a red square. Failures are swallowed: the user is already getting a
// red indicator either way.
function copyViaExecCommand(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    Object.assign(ta.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '2em',
      height: '2em',
      opacity: '0',
      pointerEvents: 'none'
    });
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function copyErrorToClipboard(status) {
  if (!status) return;
  const text = `[Gemini Extension Error] ${status}`;
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (clipErr) {
    // Fall through to the execCommand fallback for pages where the async
    // Clipboard API is blocked (e.g. some intranets / Jupyter / iframes).
  }
  if (!copyViaExecCommand(text)) {
    console.warn('Could not copy error to clipboard');
  }
}

// Show notification based on user preference
async function showNotification(status, type = 'info', duration = 3000) {
  if (type === 'error') {
    copyErrorToClipboard(status);
  }

  if (!geminiExtensionCtxLive()) {
    showGeminiStaleBannerOnce();
    showDirectIndicator(type, Math.min(duration, 5000), 'bottom-right', 28, 28);
    return;
  }

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
    geminiRuntimeSend({ action: "pasteResponseRequest" });
  }
});

// ===========================================================================
// Quick-action expander overlay (Alt+G)
// ---------------------------------------------------------------------------
// Tiny floating panel of square buttons (Send / Paste) that mirrors the
// keyboard shortcuts. Useful when the keyboard shortcut is ergonomically
// inconvenient (e.g. you're already mousing around in a long form).
// Toggled via Alt+G; pressing the same shortcut again closes it.
// ===========================================================================

const EXPANDER_CLASS = 'gemini-expander-panel';

function buildExpanderButton(label, title, bgColor, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = title;
  btn.textContent = label;
  Object.assign(btn.style, {
    width: '34px',
    height: '34px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: bgColor,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.1s ease, filter 0.1s ease',
    padding: '0',
    lineHeight: '1'
  });
  btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.1)'; });
  btn.addEventListener('mouseleave', () => { btn.style.filter = 'none'; });
  // CRITICAL: preventDefault on mousedown so the button never grabs focus.
  // Otherwise document.activeElement becomes the button and the paste flow
  // loses the user's text-field target. We still apply the press animation.
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    btn.style.transform = 'scale(0.95)';
  });
  btn.addEventListener('mouseup',   () => { btn.style.transform = 'scale(1.0)'; });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function closeExpander() {
  const existing = document.querySelector('.' + EXPANDER_CLASS);
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function toggleExpander() {
  if (document.querySelector('.' + EXPANDER_CLASS)) {
    closeExpander();
    return;
  }

  const panel = document.createElement('div');
  panel.className = EXPANDER_CLASS;
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    gap: '6px',
    padding: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    zIndex: '2147483647',
    pointerEvents: 'auto',
    fontFamily: 'Arial, sans-serif'
  });

  // Send: hide the panel first (so it doesn't appear in JSON-mode
  // screenshots), then either (a) for standard mode, read the clipboard
  // RIGHT HERE, while the click's transient user activation is still
  // valid, and ship the text directly to the background; or (b) for JSON
  // mode, ask the background to take a screenshot. Reading the clipboard
  // up front avoids a stale-clipboard race where the round-trip through
  // the background outlives the click's user activation and the content
  // script's clipboard read silently returns old/empty data.
  const sendBtn = buildExpanderButton('S', 'Send: clipboard text, or screenshot when quiz (JSON) mode is on', '#4285f4', async () => {
    closeExpander();

    if (!geminiExtensionCtxLive()) {
      showGeminiStaleBannerOnce();
      showDirectIndicator('error', 3500, 'bottom-right', 28, 28);
      return;
    }

    let jsonMode = 'none';
    try {
      const settings = await chrome.storage.local.get(['jsonMode']);
      jsonMode = settings.jsonMode || 'none';
    } catch (_) { /* default to standard mode */ }

    if (jsonMode !== 'none') {
      geminiRuntimeSend({ action: 'triggerScreenshotSend' });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        geminiRuntimeSend({ action: 'triggerSendToGemini' });
        return;
      }
      showNotification('Sending to Gemini', 'processing');
      geminiRuntimeSend({ action: 'processClipboardText', text });
    } catch (err) {
      console.warn('[Gemini] direct clipboard read failed, using background fallback:', err);
      geminiRuntimeSend({ action: 'triggerSendToGemini' });
    }
  });

  // Paste: leave the panel open so the user can paste multiple times.
  const pasteBtn = buildExpanderButton('P', 'Paste latest Gemini response', '#34a853', () => {
    if (!geminiExtensionCtxLive()) {
      showGeminiStaleBannerOnce();
      showDirectIndicator('error', 3500, 'bottom-right', 28, 28);
      return;
    }
    geminiRuntimeSend({ action: 'pasteResponseRequest' });
  });

  panel.appendChild(sendBtn);
  panel.appendChild(pasteBtn);

  if (document.body) {
    document.body.appendChild(panel);
  } else {
    // body may not exist yet on some early-loading pages
    document.documentElement.appendChild(panel);
  }
}

// Capture-phase keydown so the shortcut works even when an input/textarea
// has focus, and so we can preventDefault before the page sees the 'g' key.
document.addEventListener('keydown', (e) => {
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey &&
      (e.key === 'g' || e.key === 'G' || e.code === 'KeyG')) {
    e.preventDefault();
    toggleExpander();
  }
}, true);

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
    const localPick = readLocalSelectionOrInputSlice();
    if (localPick) {
      showNotification("Sending to Gemini", "processing");
      sendResponse({ success: true, content: localPick });
      return true;
    }

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
    // Pick a target. Prefer the currently-focused editable element. If the
    // active element is something else (e.g. the user just clicked our
    // expander panel's "P" button), fall back to the most recently focused
    // editable element so the paste still goes where the user expects.
    let target = document.activeElement;
    if (!isEditableElement(target) &&
        isEditableElement(lastEditableElement) &&
        document.contains(lastEditableElement)) {
      target = lastEditableElement;
      try { target.focus(); } catch (_) { /* ignore */ }
    }

    if (isEditableElement(target)) {
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        const startPos = target.selectionStart != null ? target.selectionStart : target.value.length;
        const endPos   = target.selectionEnd   != null ? target.selectionEnd   : startPos;
        const currentValue = target.value;
        const newValue = currentValue.substring(0, startPos) +
                        message.response +
                        currentValue.substring(endPos);
        target.value = newValue;
        target.selectionStart = startPos + message.response.length;
        target.selectionEnd   = startPos + message.response.length;
        // Notify frameworks (React/Vue) so controlled inputs pick up the change.
        try {
          target.dispatchEvent(new Event('input',  { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) { /* ignore */ }
        showNotification("Response pasted", "success");
      } else if (target.isContentEditable) {
        document.execCommand('insertText', false, message.response);
        showNotification("Response pasted", "success");
      }
      sendResponse({success: true});
    } else {
      const textToCopy = String(message.response);
      if (!geminiExtensionCtxLive()) {
        const ok = copyViaExecCommand(textToCopy);
        showDirectIndicator(ok ? 'success' : 'error', 3500, 'bottom-right', 28, 28);
        showGeminiStaleBannerOnce();
        sendResponse({ success: ok, error: ok ? undefined : 'Extension reloaded — refresh page' });
        return;
      }
      chrome.runtime.sendMessage(
        { action: "copyToClipboard", text: textToCopy },
        (bgRes) => {
          if (!chrome.runtime.lastError && bgRes && bgRes.success) {
            showNotification("Copied to clipboard", "success");
            sendResponse({ success: true });
            return;
          }
          if (chrome.runtime.lastError) {
            console.error(
              "Could not copy text:",
              chrome.runtime.lastError.message
            );
          }
          if (copyViaExecCommand(textToCopy)) {
            showNotification("Copied to clipboard", "success");
            sendResponse({ success: true });
            return;
          }
          const detail =
            bgRes && bgRes.error
              ? bgRes.error
              : chrome.runtime.lastError?.message || "clipboard blocked";
          console.error("Could not copy text:", detail);
          showNotification("Failed to copy response", "error");
          sendResponse({ success: false, error: detail });
        }
      );
    }

    return true; // Required for async sendResponse
  }
}); 