// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "paste") {
    // Old method - simulating paste event (not working well)
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    
    // Find the active element
    const activeElement = document.activeElement;
    if (activeElement) {
      activeElement.dispatchEvent(pasteEvent);
    }
  } else if (request.action === "directPaste") {
    // New direct paste method
    const activeElement = document.activeElement;
    if (activeElement) {
      // Check if it's an input or textarea
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        // Get current selection
        const startPos = activeElement.selectionStart;
        const endPos = activeElement.selectionEnd;
        
        // Insert text at cursor position
        const currentValue = activeElement.value;
        activeElement.value = currentValue.substring(0, startPos) + 
                             request.text + 
                             currentValue.substring(endPos);
                             
        // Move cursor to end of inserted text
        activeElement.selectionStart = activeElement.selectionEnd = startPos + request.text.length;
      } else if (activeElement.isContentEditable) {
        // For contentEditable elements like rich text editors
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const textNode = document.createTextNode(request.text);
        range.insertNode(textNode);
        
        // Move cursor to end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
}); 