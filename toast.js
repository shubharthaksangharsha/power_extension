// Use an IIFE to avoid polluting the global namespace
(function() {
  // Don't recreate the notifier if it already exists
  if (window.geminiToastNotifier) return;
  
  // Create a minimalist toast notification system
  class ToastNotifier {
    constructor() {
      this.toastContainer = null;
      this.activeToasts = new Set();
      this.initialize();
    }

    initialize() {
      // Check if container already exists (to prevent duplicates)
      if (document.querySelector('.gemini-toast-container')) {
        this.toastContainer = document.querySelector('.gemini-toast-container');
        return;
      }
      
      // Create the container for toast messages
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'gemini-toast-container';
      
      // Apply styles to the container
      Object.assign(this.toastContainer.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647', // Highest possible z-index
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        fontFamily: 'Arial, sans-serif'
      });
      
      // Only add styles if they don't already exist
      if (!document.getElementById('gemini-toast-styles')) {
        // Create a style element for the toast animations
        const style = document.createElement('style');
        style.id = 'gemini-toast-styles';
        style.textContent = `
          @keyframes gemini-toast-fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes gemini-toast-fade-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(20px); }
          }
          
          .gemini-toast {
            padding: 10px 16px;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            background-color: #4285f4;
            color: white;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 0.5px;
            animation: gemini-toast-fade-in 0.3s ease forwards;
            display: flex;
            align-items: center;
            min-width: 80px;
            justify-content: center;
            text-transform: uppercase;
          }
          
          .gemini-toast.success {
            background-color: #34a853;
          }
          
          .gemini-toast.error {
            background-color: #ea4335;
          }
          
          .gemini-toast.processing {
            background-color: #fbbc05;
          }
        `;
        
        // Append style to the document
        document.head.appendChild(style);
      }
      
      // Append container to the document
      document.body.appendChild(this.toastContainer);
    }

    showToast(status, type = 'info', duration = 3000) {
      // Create the toast element
      const toast = document.createElement('div');
      toast.className = `gemini-toast ${type}`;
      
      // Set the status text
      toast.textContent = status;
      
      // Add the toast to the container
      this.toastContainer.appendChild(toast);
      this.activeToasts.add(toast);
      
      // Set up automatic removal
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
      
      return toast;
    }
    
    removeToast(toast) {
      if (!this.activeToasts.has(toast)) return;
      
      // Add fade-out animation
      toast.style.animation = 'gemini-toast-fade-out 0.3s ease forwards';
      
      // Remove after animation completes
      setTimeout(() => {
        if (toast.parentNode === this.toastContainer) {
          this.toastContainer.removeChild(toast);
        }
        this.activeToasts.delete(toast);
      }, 300);
    }
  }

  // Create the toast notifier instance
  window.geminiToastNotifier = new ToastNotifier();
})(); 