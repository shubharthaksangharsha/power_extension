// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle request to get clipboard content
  if (message.action === "getClipboardContent") {
    navigator.clipboard.readText()
      .then(text => {
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