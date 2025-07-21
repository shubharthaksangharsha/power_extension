document.addEventListener('DOMContentLoaded', function() {
  // Define constants for model types and JSON modes
  const MODEL_TYPES = {
    GEMINI_2_0_FLASH: "gemini-2.0-flash",
    GEMINI_2_5_FLASH: "gemini-2.5-flash"
  };

  const JSON_MODES = {
    NONE: "none",
    SINGLE: "single",
    MULTI: "multi"
  };
  
  // Clockwise position sequence
  const CLOCKWISE_POSITIONS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  
  // Setup collapsible sections
  const collapsibles = document.querySelectorAll('.collapsible');
  collapsibles.forEach(collapsible => {
    const header = collapsible.querySelector('.collapsible-header');
    header.addEventListener('click', () => {
      collapsible.classList.toggle('open');
    });
  });
  
  // Open display settings section by default
  document.querySelector('.collapsible').classList.add('open');
  
  // Load saved settings from storage
  chrome.storage.local.get([
    'geminiApiKey', 
    'minimalistMode', 
    'modelType', 
    'jsonMode', 
    'answerTextColor',
    'indicatorPosition',
    'positionX',
    'positionY',
    'clockwiseMode',
    'currentClockwiseIndex'
  ], function(result) {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
    
    // Log the actual stored value
    console.log("Loaded minimalistMode from storage:", result.minimalistMode);
    
    // Set minimalist mode checkbox correctly
    // Note: explicitly check against false to handle undefined case
    const minimalistMode = result.minimalistMode !== false;
    console.log("Setting checkbox to:", minimalistMode);
    document.getElementById('minimalistMode').checked = minimalistMode;
    
    // Update model type display
    updateModelTypeDisplay(result.modelType || MODEL_TYPES.GEMINI_2_0_FLASH);
    
    // Update JSON mode display
    updateJsonModeDisplay(result.jsonMode || JSON_MODES.NONE);
    
    // Set the color picker to saved value or default to black
    const colorPicker = document.getElementById('answerTextColor');
    const savedColor = result.answerTextColor || '#000000';
    colorPicker.value = savedColor;
    updateColorPreview(savedColor);
    
    // Select the preset color if it matches
    selectMatchingPresetColor(savedColor);
    
    // Set clockwise mode
    const clockwiseMode = result.clockwiseMode || false;
    document.getElementById('clockwiseMode').checked = clockwiseMode;
    updateClockwiseMode(clockwiseMode, result.currentClockwiseIndex || 0);
    
    // If not in clockwise mode, set normal position selection
    if (!clockwiseMode) {
      const position = result.indicatorPosition || 'top-right';
      selectPosition(position);
    }
    
    // Set offset inputs
    const posX = result.positionX !== undefined ? result.positionX : 10;
    const posY = result.positionY !== undefined ? result.positionY : 10;
    document.getElementById('positionX').value = posX;
    document.getElementById('positionY').value = posY;
  });

  // Save API key button
  document.getElementById('saveApiKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
      showStatus('Please enter a valid API key', 'error');
      return;
    }
    
    chrome.storage.local.set({geminiApiKey: apiKey}, function() {
      showStatus('API key saved!', 'success');
      console.log('API key saved');
      
      // Send a message to background script to confirm the API key is saved
      chrome.runtime.sendMessage({
        action: "apiKeySaved",
        apiKey: apiKey
      });
    });
  });
  
  // Handle minimalist mode toggle
  document.getElementById('minimalistMode').addEventListener('change', function() {
    const minimalistMode = this.checked;
    
    console.log("Setting minimalist mode to:", minimalistMode);
    
    chrome.storage.local.set({minimalistMode: minimalistMode}, function() {
      showStatus(`Display mode set to ${minimalistMode ? 'minimalist' : 'detailed'}`, 'success');
      
      // Test the notification immediately so user sees the change
      chrome.runtime.sendMessage({
        action: "testNotification",
        minimalistMode: minimalistMode
      });
    });
  });
  
  // Handle text color changes
  const colorPicker = document.getElementById('answerTextColor');
  colorPicker.addEventListener('change', function() {
    const color = this.value;
    saveTextColor(color);
    updateColorPreview(color);
    selectMatchingPresetColor(color);
  });
  
  // Set up preset color clicks
  const presetColors = document.querySelectorAll('.preset-color');
  presetColors.forEach(preset => {
    preset.addEventListener('click', function() {
      const color = this.getAttribute('data-color');
      colorPicker.value = color;
      saveTextColor(color);
      updateColorPreview(color);
      selectMatchingPresetColor(color);
    });
  });
  
  // Handle clockwise mode toggle
  document.getElementById('clockwiseMode').addEventListener('change', function() {
    const clockwiseMode = this.checked;
    
    console.log("Setting clockwise mode to:", clockwiseMode);
    
    // Set current index to 0 (top-left) when enabling
    const currentIndex = clockwiseMode ? 0 : null;
    
    chrome.storage.local.set({
      clockwiseMode: clockwiseMode,
      currentClockwiseIndex: currentIndex
    }, function() {
      updateClockwiseMode(clockwiseMode, currentIndex);
      
      // If enabling clockwise, disable position grid selection
      if (clockwiseMode) {
        showStatus('Clockwise mode enabled', 'success');
      } else {
        // When disabling, set to a default position
        selectPosition('top-right');
        savePositionSettings();
        showStatus('Clockwise mode disabled', 'success');
      }
      
      // Test the notification
      testClockwiseIndicator();
    });
  });
  
  // Update UI for clockwise mode
  function updateClockwiseMode(enabled, currentIndex) {
    const positionGrid = document.getElementById('positionGrid');
    const clockwiseInfo = document.querySelector('.clockwise-info');
    const positionOptions = document.querySelectorAll('.position-option');
    
    if (enabled) {
      // Disable normal position grid
      positionGrid.style.opacity = '0.5';
      positionOptions.forEach(option => {
        option.style.pointerEvents = 'none';
        option.classList.remove('selected');
      });
      
      // Show clockwise info
      clockwiseInfo.style.display = 'block';
      
      // Update current dot in clockwise preview
      updateClockwiseDot(currentIndex);
    } else {
      // Enable normal position grid
      positionGrid.style.opacity = '1';
      positionOptions.forEach(option => {
        option.style.pointerEvents = 'auto';
      });
      
      // Hide clockwise info
      clockwiseInfo.style.display = 'none';
    }
  }
  
  // Update the clockwise preview dot to show current position
  function updateClockwiseDot(index) {
    const position = CLOCKWISE_POSITIONS[index];
    const dots = document.querySelectorAll('.clockwise-dot');
    
    dots.forEach(dot => {
      if (dot.getAttribute('data-position') === position) {
        dot.classList.add('current');
      } else {
        dot.classList.remove('current');
      }
    });
  }
  
  // Test the clockwise indicator
  function testClockwiseIndicator() {
    chrome.runtime.sendMessage({
      action: "testClockwiseIndicator"
    });
  }
  
  // Set up position option clicks
  const positionOptions = document.querySelectorAll('.position-option');
  positionOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Only process if clockwise mode is off
      if (!document.getElementById('clockwiseMode').checked) {
        const position = this.getAttribute('data-position');
        selectPosition(position);
        savePositionSettings();
      }
    });
  });
  
  // Handle position offset changes
  document.getElementById('positionX').addEventListener('change', savePositionSettings);
  document.getElementById('positionY').addEventListener('change', savePositionSettings);
  
  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.modelType) {
      updateModelTypeDisplay(changes.modelType.newValue);
    }
    
    if (changes.jsonMode) {
      updateJsonModeDisplay(changes.jsonMode.newValue);
    }
    
    if (changes.answerTextColor) {
      colorPicker.value = changes.answerTextColor.newValue;
      updateColorPreview(changes.answerTextColor.newValue);
      selectMatchingPresetColor(changes.answerTextColor.newValue);
    }
    
    if (changes.indicatorPosition) {
      selectPosition(changes.indicatorPosition.newValue);
    }
    
    if (changes.positionX) {
      document.getElementById('positionX').value = changes.positionX.newValue;
    }
    
    if (changes.positionY) {
      document.getElementById('positionY').value = changes.positionY.newValue;
    }
    
    if (changes.clockwiseMode) {
      document.getElementById('clockwiseMode').checked = changes.clockwiseMode.newValue;
      const currentIndex = changes.currentClockwiseIndex ? 
        changes.currentClockwiseIndex.newValue : 0;
      updateClockwiseMode(changes.clockwiseMode.newValue, currentIndex);
    }
    
    if (changes.currentClockwiseIndex) {
      updateClockwiseDot(changes.currentClockwiseIndex.newValue);
    }
  });
  
  // Select position by data-position value
  function selectPosition(position) {
    const positionOptions = document.querySelectorAll('.position-option');
    positionOptions.forEach(option => {
      if (option.getAttribute('data-position') === position) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
  
  // Save position settings to storage
  function savePositionSettings() {
    const clockwiseMode = document.getElementById('clockwiseMode').checked;
    
    if (clockwiseMode) {
      // In clockwise mode, we only save the offset values
      const posX = parseInt(document.getElementById('positionX').value) || 10;
      const posY = parseInt(document.getElementById('positionY').value) || 10;
      
      chrome.storage.local.set({
        positionX: posX,
        positionY: posY
      }, function() {
        showStatus('Position offsets saved', 'success');
      });
    } else {
      // In normal mode, save position and offsets
      const selectedPosition = document.querySelector('.position-option.selected');
      const positionValue = selectedPosition ? selectedPosition.getAttribute('data-position') : 'top-right';
      const posX = parseInt(document.getElementById('positionX').value) || 10;
      const posY = parseInt(document.getElementById('positionY').value) || 10;
      
      chrome.storage.local.set({
        indicatorPosition: positionValue,
        positionX: posX,
        positionY: posY
      }, function() {
        showStatus('Position settings saved', 'success');
        
        // Test the indicator with new position
        chrome.runtime.sendMessage({
          action: "testPositionChange",
          position: positionValue,
          positionX: posX,
          positionY: posY
        });
      });
    }
  }
  
  // Update color preview box
  function updateColorPreview(color) {
    document.getElementById('colorPreview').style.backgroundColor = color;
  }
  
  // Save text color to storage
  function saveTextColor(color) {
    chrome.storage.local.set({answerTextColor: color}, function() {
      showStatus('Text color saved', 'success');
    });
  }
  
  // Select matching preset color if available
  function selectMatchingPresetColor(color) {
    const presetColors = document.querySelectorAll('.preset-color');
    presetColors.forEach(preset => {
      const presetColor = preset.getAttribute('data-color');
      if (presetColor.toLowerCase() === color.toLowerCase()) {
        preset.classList.add('selected');
      } else {
        preset.classList.remove('selected');
      }
    });
  }
  
  // Update model type display in UI
  function updateModelTypeDisplay(modelType) {
    const modelTypeElement = document.getElementById('modelType');
    const modelBadgeElement = document.getElementById('modelBadge');
    
    if (modelType === MODEL_TYPES.GEMINI_2_5_FLASH) {
      modelTypeElement.textContent = 'Gemini 2.5 Flash';
      modelBadgeElement.textContent = '2.5';
      modelBadgeElement.className = 'badge badge-green';
    } else {
      modelTypeElement.textContent = 'Gemini 2.0 Flash';
      modelBadgeElement.textContent = '2.0';
      modelBadgeElement.className = 'badge badge-blue';
    }
  }
  
  // Update JSON mode display in UI
  function updateJsonModeDisplay(jsonMode) {
    const jsonModeElement = document.getElementById('jsonMode');
    const jsonBadgeElement = document.getElementById('jsonBadge');
    
    switch (jsonMode) {
      case JSON_MODES.SINGLE:
        jsonModeElement.textContent = 'JSON Single-Select';
        jsonBadgeElement.textContent = 'SINGLE';
        jsonBadgeElement.className = 'badge badge-orange';
        break;
      case JSON_MODES.MULTI:
        jsonModeElement.textContent = 'JSON Multi-Select';
        jsonBadgeElement.textContent = 'MULTI';
        jsonBadgeElement.className = 'badge badge-green';
        break;
      default:
        jsonModeElement.textContent = 'Standard';
        jsonBadgeElement.textContent = 'STD';
        jsonBadgeElement.className = 'badge badge-blue';
    }
  }

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.className = 'status';
      statusElement.style.display = 'none';
    }, 3000);
  }
}); 