// Use an IIFE to avoid polluting the global namespace
(function() {
  // Don't recreate the indicator if it already exists
  if (window.geminiColorIndicator) return;
  
  // Create an ultra-minimal color square indicator
  class ColorIndicator {
    constructor() {
      this.indicator = null;
      this.activeTimeout = null;
      this.initialize();
    }

    initialize() {
      // Check if indicator already exists
      if (document.querySelector('.gemini-color-indicator')) {
        this.indicator = document.querySelector('.gemini-color-indicator');
        return;
      }
      
      // Create the indicator square
      this.indicator = document.createElement('div');
      this.indicator.className = 'gemini-color-indicator';
      
      // Apply styles to make it a small square
      Object.assign(this.indicator.style, {
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
      
      // Append to document
      document.body.appendChild(this.indicator);
    }

    show(type = 'info', duration = 2000) {
      // Clear any existing timeout
      if (this.activeTimeout) {
        clearTimeout(this.activeTimeout);
      }
      
      // Set color based on type
      switch (type) {
        case 'success':
          this.indicator.style.backgroundColor = '#34a853'; // green
          break;
        case 'error':
          this.indicator.style.backgroundColor = '#ea4335'; // red
          break;
        case 'processing':
          this.indicator.style.backgroundColor = '#fbbc05'; // yellow
          break;
        default:
          this.indicator.style.backgroundColor = '#4285f4'; // blue
      }
      
      // Show the indicator
      this.indicator.style.opacity = '1';
      
      // Set timeout to hide
      this.activeTimeout = setTimeout(() => {
        this.hide();
      }, duration);
    }
    
    hide() {
      if (this.indicator) {
        this.indicator.style.opacity = '0';
      }
      this.activeTimeout = null;
    }
  }

  // Create the indicator instance
  window.geminiColorIndicator = new ColorIndicator();
})(); 