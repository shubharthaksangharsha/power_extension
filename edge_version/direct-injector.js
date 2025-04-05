// This script handles direct injection of the indicator for CSP-restricted environments
function injectColorIndicator() {
  // Create the indicator directly in DOM
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
  
  return indicator;
}

// Export function to show indicator
function showDirectIndicator(type, duration = 2000) {
  const indicator = injectColorIndicator();
  
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
  setTimeout(() => {
    indicator.style.opacity = '0';
  }, duration);
} 