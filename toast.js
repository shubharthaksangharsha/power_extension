// Create a toast notification system for the extension
class ToastNotifier {
  constructor() {
    this.toastContainer = null;
    this.activeToasts = new Set();
    this.initialize();
  }

  initialize() {
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
      maxWidth: '350px',
      fontFamily: 'Arial, sans-serif'
    });
    
    // Create a style element for the toast animations
    const style = document.createElement('style');
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
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        background-color: #ffffff;
        color: #333333;
        font-size: 14px;
        max-width: 100%;
        animation: gemini-toast-fade-in 0.3s ease forwards;
        display: flex;
        align-items: center;
        border-left: 4px solid #4285f4;
      }
      
      .gemini-toast.success {
        border-left-color: #34a853;
      }
      
      .gemini-toast.error {
        border-left-color: #ea4335;
      }
      
      .gemini-toast.processing {
        border-left-color: #fbbc05;
      }
      
      .gemini-toast-icon {
        margin-right: 10px;
        font-size: 18px;
      }
      
      .gemini-toast-content {
        flex-grow: 1;
      }
      
      .gemini-toast-title {
        font-weight: bold;
        margin-bottom: 3px;
      }
      
      .gemini-toast-message {
        line-height: 1.4;
      }
      
      .gemini-toast-progress {
        height: 3px;
        background-color: #e0e0e0;
        width: 100%;
        position: absolute;
        bottom: 0;
        left: 0;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
        overflow: hidden;
      }
      
      .gemini-toast-progress-inner {
        height: 100%;
        background-color: #4285f4;
        width: 100%;
        transform-origin: left;
        animation: gemini-toast-progress 5s linear forwards;
      }
      
      @keyframes gemini-toast-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }
    `;
    
    // Append elements to the document
    document.head.appendChild(style);
    document.body.appendChild(this.toastContainer);
  }

  showToast(title, message, type = 'info', duration = 5000) {
    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `gemini-toast ${type}`;
    toast.style.position = 'relative';
    
    // Create icon based on toast type
    let iconContent = '';
    switch (type) {
      case 'success':
        iconContent = '✓';
        break;
      case 'error':
        iconContent = '✗';
        break;
      case 'processing':
        iconContent = '⟳';
        break;
      default:
        iconContent = 'ℹ';
    }
    
    // Set the toast content
    toast.innerHTML = `
      <div class="gemini-toast-icon">${iconContent}</div>
      <div class="gemini-toast-content">
        <div class="gemini-toast-title">${title}</div>
        <div class="gemini-toast-message">${message}</div>
      </div>
      <div class="gemini-toast-progress">
        <div class="gemini-toast-progress-inner"></div>
      </div>
    `;
    
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
  
  // Update an existing toast
  updateToast(toast, title, message, type) {
    if (!this.activeToasts.has(toast)) return;
    
    toast.className = `gemini-toast ${type}`;
    
    const titleElement = toast.querySelector('.gemini-toast-title');
    const messageElement = toast.querySelector('.gemini-toast-message');
    const iconElement = toast.querySelector('.gemini-toast-icon');
    
    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    // Update icon
    let iconContent = '';
    switch (type) {
      case 'success':
        iconContent = '✓';
        break;
      case 'error':
        iconContent = '✗';
        break;
      case 'processing':
        iconContent = '⟳';
        break;
      default:
        iconContent = 'ℹ';
    }
    
    if (iconElement) iconElement.textContent = iconContent;
  }
}

// Create the toast notifier instance
window.geminiToastNotifier = new ToastNotifier(); 