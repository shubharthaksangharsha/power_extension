// Optional Gemini key from an untracked file (imported before the rest of this script).
// Safe for GitHub: only commit config.local.example.js — copy to config.local.js locally.
try {
  importScripts('config.local.js');
} catch (_) {
  // No config.local.js yet — use popup storage only.
}

// Store the latest Gemini response
let geminiResponse = "";

// Screenshot debounce control
let isCapturingScreenshot = false;
let screenshotDebounceTimer = null;
const SCREENSHOT_DEBOUNCE_TIME = 1000; // 1 second between screenshot attempts

// Default settings
// Gemini 3.x model IDs per https://ai.google.dev/gemini-api/docs/models
// Note: there is currently no plain "gemini-3.1-flash" text model; the latest
// Flash text model in the 3-series is `gemini-3-flash-preview`.
const MODEL_TYPES = {
  GEMINI_3_FLASH_LITE: "gemini-3.1-flash-lite-preview",
  GEMINI_3_FLASH: "gemini-3-flash-preview",
  GEMINI_3_PRO: "gemini-3.1-pro-preview"
};

const JSON_MODES = {
  NONE: "none",
  SINGLE: "single",
  MULTI: "multi"
};

function resolveGeminiApiKey(storedKey) {
  const fromStorage = typeof storedKey === 'string' ? storedKey.trim() : '';
  if (fromStorage) {
    return fromStorage;
  }
  if (
    typeof EMBEDDED_GEMINI_API_KEY !== 'undefined' &&
    typeof EMBEDDED_GEMINI_API_KEY === 'string' &&
    EMBEDDED_GEMINI_API_KEY.trim()
  ) {
    return EMBEDDED_GEMINI_API_KEY.trim();
  }
  return '';
}

async function syncEmbeddedKeyToStorageIfEmpty() {
  const embedded = resolveGeminiApiKey('');
  if (!embedded) {
    return;
  }
  const prev = await chrome.storage.local.get(['geminiApiKey']);
  const cur = typeof prev.geminiApiKey === 'string' ? prev.geminiApiKey.trim() : '';
  if (!cur) {
    await chrome.storage.local.set({ geminiApiKey: embedded });
  }
}

// Migrate any previously-stored legacy model IDs (e.g. gemini-2.x) to the
// new 3.x defaults so existing users don't end up calling a removed model.
async function migrateModelType() {
  const stored = await chrome.storage.local.get(['modelType']);
  const valid = Object.values(MODEL_TYPES);
  if (!stored.modelType || !valid.includes(stored.modelType)) {
    await chrome.storage.local.set({ modelType: MODEL_TYPES.GEMINI_3_FLASH_LITE });
  }
}

// Initialize settings on first load
chrome.runtime.onInstalled.addListener(async () => {
  await migrateModelType();
  await syncEmbeddedKeyToStorageIfEmpty();

  const settings = await chrome.storage.local.get(['jsonMode']);
  if (!settings.jsonMode) {
    await chrome.storage.local.set({
      jsonMode: JSON_MODES.NONE
    });
  }
  
  // Create context menu
  chrome.contextMenus.create({
    id: "sendSelectionToGemini",
    title: "Send to Gemini",
    contexts: ["selection"]
  });
});

// Also run migration on browser startup in case the extension was updated
// while the browser was closed.
chrome.runtime.onStartup.addListener(() => {
  syncEmbeddedKeyToStorageIfEmpty().catch(function () {});
  migrateModelType().catch(err => console.error("Model migration failed:", err));
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "send-to-gemini") {
    await getClipboardAndSendToGemini();
  } else if (command === "paste-response") {
    await pasteGeminiResponse();
  } else if (command === "switch-model") {
    await toggleModelType();
  } else if (command === "toggle-json-mode") {
    await toggleJsonMode();
  }
});

// Toggle between model types (cycle Flash-Lite -> Flash -> Pro -> Flash-Lite)
async function toggleModelType() {
  try {
    const settings = await chrome.storage.local.get(['modelType']);
    const currentModel = settings.modelType || MODEL_TYPES.GEMINI_3_FLASH_LITE;
    
    let newModel, modelName;
    
    switch (currentModel) {
      case MODEL_TYPES.GEMINI_3_FLASH_LITE:
        newModel = MODEL_TYPES.GEMINI_3_FLASH;
        modelName = "Gemini 3 Flash";
        break;
      case MODEL_TYPES.GEMINI_3_FLASH:
        newModel = MODEL_TYPES.GEMINI_3_PRO;
        modelName = "Gemini 3.1 Pro";
        break;
      default:
        newModel = MODEL_TYPES.GEMINI_3_FLASH_LITE;
        modelName = "Gemini 3.1 Flash-Lite";
        break;
    }
    
    await chrome.storage.local.set({ modelType: newModel });
    showNotification(`Switched to ${modelName}`, "success");
  } catch (error) {
    console.error("Error toggling model type:", error);
    showNotification("Failed to switch models", "error");
  }
}

// Toggle between JSON modes (none -> single -> multi -> none)
async function toggleJsonMode() {
  try {
    const settings = await chrome.storage.local.get(['jsonMode']);
    const currentMode = settings.jsonMode || JSON_MODES.NONE;
    
    let newMode = JSON_MODES.NONE;
    let modeName = "Standard Mode";
    
    switch (currentMode) {
      case JSON_MODES.NONE:
        newMode = JSON_MODES.SINGLE;
        modeName = "JSON Single-Select Mode";
        break;
      case JSON_MODES.SINGLE:
        newMode = JSON_MODES.MULTI;
        modeName = "JSON Multi-Select Mode";
        break;
      default:
        newMode = JSON_MODES.NONE;
        modeName = "Standard Mode";
    }
    
    await chrome.storage.local.set({ jsonMode: newMode });
    showNotification(`Switched to ${modeName}`, "success");
  } catch (error) {
    console.error("Error toggling JSON mode:", error);
    showNotification("Failed to switch JSON mode", "error");
  }
}

async function tryReadClipboardInExtensionContext() {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.readText !== "function"
    ) {
      return "";
    }
    const t = await navigator.clipboard.readText();
    return typeof t === "string" ? t : "";
  } catch (err) {
    return "";
  }
}

async function swClipboardWriteMaybe(text) {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

// Function to get clipboard text and send to Gemini (never uses a screenshot)
async function getClipboardAndSendToGemini() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      showNotification("No active tab found", "error");
      return;
    }

    const tabId = tabs[0].id;

    const clip = (await tryReadClipboardInExtensionContext()).trim();
    if (clip) {
      showNotification("Sending to Gemini", "processing");
      await processContentWithGemini(clip);
      return;
    }

    chrome.tabs.sendMessage(tabId, { action: "getClipboardContent" }, async (response) => {
      if (chrome.runtime.lastError) {
        showNotification("Failed to communicate with page", "error");
        return;
      }

      if (!response || !response.success) {
        showNotification("Failed to read clipboard", "error");
        return;
      }

      const clipboardContent = response.content;
      if (!clipboardContent || !String(clipboardContent).trim()) {
        showNotification("Copy text first (Ctrl+C), then press Ctrl+I", "error");
        return;
      }

      await processContentWithGemini(String(clipboardContent).trim());
    });
  } catch (error) {
    console.error("Error getting clipboard:", error);
    showNotification("Failed to get clipboard content", "error");
  }
}

async function sendScreenshotToGemini() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    showNotification("No active tab found", "error");
    return;
  }
  const settings = await chrome.storage.local.get(["jsonMode"]);
  const jsonMode = settings.jsonMode || JSON_MODES.NONE;
  if (jsonMode === JSON_MODES.NONE) {
    showNotification("Press Alt+B for quiz (JSON) mode, then Alt+G → S to screenshot-send", "error");
    return;
  }
  debouncedCaptureScreenshot(tabs[0].id);
}

// Debounced screenshot capture function
function debouncedCaptureScreenshot(tabId) {
  // If already capturing, don't trigger another capture
  if (isCapturingScreenshot) {
    showNotification("Screenshot capture in progress...", "info");
    return;
  }
  
  // Clear any existing timer
  if (screenshotDebounceTimer) {
    clearTimeout(screenshotDebounceTimer);
  }
  
  // Set flag and show processing indicator
  isCapturingScreenshot = true;
  showNotification("Processing request", "processing");
  
  // Capture screenshot after short delay to ensure UI updates
  screenshotDebounceTimer = setTimeout(() => {
    captureScreenshotAndProcess(tabId)
      .finally(() => {
        // Reset flag when done (success or failure)
        isCapturingScreenshot = false;
        screenshotDebounceTimer = null;
      });
  }, 100);
}

// Capture screenshot and process it with Gemini
async function captureScreenshotAndProcess(tabId) {
  try {
    // Capture the screenshot of the visible area
    const screenshot = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
    
    // Create a data URL for the image
    const imageBase64 = screenshot.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
    
    // Get prompt based on the current JSON mode
    const settings = await chrome.storage.local.get(['jsonMode']);
    const jsonMode = settings.jsonMode || JSON_MODES.NONE;
    
    // Prepare prompt based on JSON mode
    let prompt = "";
    if (jsonMode === JSON_MODES.SINGLE) {
      prompt = "Look at this screenshot containing multiple choice question or options. Select ONE best option. Answer only with the number or letter of the option (like 1, 2, 3, A, B, C). Format as {\"answer\": \"X\"} where X is just the option number or letter. Use your own knowledge to select the best option. Do not choose wrong/already selected option.";
    } else {
      prompt = "Look at this screenshot containing multiple choice question or options. Select ALL applicable options. Answer only with the numbers or letters of the options separated by spaces (like \"1 2 3\" or \"A B C\"). Format as {\"answers\": \"X Y Z\"} where X Y Z are just the option numbers or letters. Use your own knowledge to select the best options. Do not choose wrong/already selected options.";
    }
    
    // Process the screenshot with Gemini
    await processContentWithGemini(prompt, imageBase64);
    
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    showNotification("Failed to capture screenshot", "error");
  }
}

// Process content with Gemini API
async function processContentWithGemini(content, imageBase64 = null) {
  try {
    // Get settings from storage
    const result = await chrome.storage.local.get(['geminiApiKey', 'modelType', 'jsonMode']);
    await syncEmbeddedKeyToStorageIfEmpty();
    const apiKey = resolveGeminiApiKey(result.geminiApiKey);
    let modelType = result.modelType || MODEL_TYPES.GEMINI_3_FLASH_LITE;
    if (!Object.values(MODEL_TYPES).includes(modelType)) {
      // Defensive: catch any leftover legacy ID still floating around
      modelType = MODEL_TYPES.GEMINI_3_FLASH_LITE;
      await chrome.storage.local.set({ modelType });
    }
    const jsonMode = result.jsonMode || JSON_MODES.NONE;
    
    if (!apiKey) {
      showNotification("API key missing", "error");
      return;
    }

    // Discard any prior reply so paste never uses a stale answer while this run is in-flight.
    geminiResponse = "";
    await chrome.storage.local.remove(["latestGeminiResponse"]);

    // Show indicator that request is being processed if not already shown
    showNotification("Processing request", "processing");
    
    // Prepare the request body based on JSON mode (STD = plain text, no JSON MIME)
    const requestBody = {
      contents: [
        {
          parts: []
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    };
    
    // Add text part
    requestBody.contents[0].parts.push({
      text: formatPromptForJsonMode(content, jsonMode)
    });
    
    // Add image part if provided
    if (imageBase64) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: "image/png",
          data: imageBase64
        }
      });
    }
    
    // Gemini 3.x uses `thinkingLevel` ("minimal" | "low" | "medium" | "high")
    // instead of the legacy `thinkingBudget`. Mixing them returns HTTP 400.
    // Choose a sensible default per model so latency stays reasonable while
    // still giving Pro room to reason on harder prompts.
    if (modelType === MODEL_TYPES.GEMINI_3_PRO) {
      requestBody.generationConfig.thinkingConfig = { thinkingLevel: "low" };
    } else if (modelType === MODEL_TYPES.GEMINI_3_FLASH) {
      requestBody.generationConfig.thinkingConfig = { thinkingLevel: "low" };
    } else if (modelType === MODEL_TYPES.GEMINI_3_FLASH_LITE) {
      requestBody.generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    }
    
    if (jsonMode !== JSON_MODES.NONE) {
      requestBody.generationConfig.responseMimeType = "application/json";
      
      if (jsonMode === JSON_MODES.SINGLE) {
        requestBody.generationConfig.responseSchema = {
          type: "OBJECT",
          properties: {
            answer: {
              type: "STRING"
            }
          },
          required: ["answer"]
        };
      } else {
        requestBody.generationConfig.responseSchema = {
          type: "OBJECT",
          properties: {
            answers: {
              type: "STRING"
            }
          },
          required: ["answers"]
        };
      }
    }
    
    // HTTP `Content-Type: application/json` here only means *this POST body* is JSON (required by
    // the REST API). STD vs quiz mode is controlled by `generationConfig.responseMimeType` inside
    // that JSON body — not by these headers.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelType}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    const data = await response.json();
    
    if (data.error) {
      showNotification("API error: " + data.error.message, "error");
      return;
    }
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      const rawResponse = data.candidates[0].content.parts[0].text;
      
      // Process JSON response if in JSON mode. We figure out the final value
      // and the toast text first, then PERSIST to storage BEFORE showing the
      // success notification. Otherwise an immediate Ctrl+Q after seeing
      // green can race the storage write and the user pastes the previous
      // response (since the MV3 service worker may be torn down between the
      // toast and the storage flush).
      let toastMessage = "Response ready (Ctrl+Q to paste)";
      if (jsonMode !== JSON_MODES.NONE) {
        try {
          const jsonResponse = JSON.parse(rawResponse);
          if (jsonMode === JSON_MODES.SINGLE && jsonResponse.answer) {
            geminiResponse = jsonResponse.answer;
            toastMessage = `JSON Answer: ${geminiResponse}`;
          } else if (jsonMode === JSON_MODES.MULTI && jsonResponse.answers) {
            geminiResponse = jsonResponse.answers;
            toastMessage = `JSON Answers: ${geminiResponse}`;
          } else {
            geminiResponse = rawResponse;
          }
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError);
          geminiResponse = rawResponse;
        }
      } else {
        geminiResponse = rawResponse;
      }

      // Persist BEFORE notifying the user so an instant Ctrl+Q sees the new
      // response in storage even if the service worker is recycled.
      await chrome.storage.local.set({ latestGeminiResponse: geminiResponse });
      showNotification(toastMessage, "success");
    } else {
      showNotification("Empty response from Gemini", "error");
    }
    
  } catch (error) {
    console.error("Error processing request:", error);
    showNotification("Failed to process request", "error");
  }
}

// Format prompt based on JSON mode
function formatPromptForJsonMode(content, jsonMode) {
  if (jsonMode === JSON_MODES.NONE) {
    return `${content}\n\nAnswer in plain form only: working code / markdown / prose as requested. Never use JSON. Do not wrap the whole reply in curly braces or JSON objects. Prefer raw source code syntax that can be copied directly into files. Avoid unnecessary preamble unless the question requires explanation.`;
  }
  
  if (jsonMode === JSON_MODES.MULTI) {
    return `${content}\n\nYou can select multiple options. Present your answer in JSON format as {"answers": "X Y Z"} where X Y Z are just the option numbers like 1, 2, 3, without any additional text. Do not include any other text or explanation and also dont include option description. just the number of the options. If options as 1, 2, 3 not given assume the first one is 1 and the second one is 2 and the third one is 3.`;
  }
  
  // Single select mode (like 1, 2, 3)
  return `${content}\n\nSelect only ONE option. Present your answer in JSON format as {"answer": "X"} where X is just the option number like 1, 2, 3, without any additional text. Do not include any other text or explanation and also dont include option description. just the number of the option. If options as 1, 2, 3 not given assume the first one is 1 and the second one is 2 and the third one is 3.`;
}

// Injected in every frame; must remain self-contained (closure-free) for scripting.executeScript.
function pasteGeminiIntoDocument(responseText) {
  function editable(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable === true;
  }

  function insertIntoInput(el, text) {
    var v = typeof el.value === "string" ? el.value : "";
    var start = el.selectionStart != null ? el.selectionStart : v.length;
    var end = el.selectionEnd != null ? el.selectionEnd : start;
    el.value = v.substring(0, start) + text + v.substring(end);
    var pos = start + text.length;
    el.selectionStart = pos;
    el.selectionEnd = pos;
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e2) { /* ignore */ }
  }

  try {
    if (typeof responseText !== "string" || !responseText) {
      return "";
    }

    var target = document.activeElement;
    if (editable(target)) {
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
        insertIntoInput(target, responseText);
        return "ok";
      }
      document.execCommand("insertText", false, responseText);
      return "ok";
    }

    var monacoRoot =
      document.querySelector(".monaco-editor.focused, .monaco-editor:focus-within") ||
      document.querySelector(".monaco-editor");
    if (monacoRoot) {
      var ta =
        monacoRoot.querySelector(
          'textarea.inputarea, textarea.native-edit-context, textarea[class*="monaco"]'
        ) || monacoRoot.querySelector("textarea");
      var ceEditable = monacoRoot.querySelector('[contenteditable="true"]');

      if (ta) {
        try {
          ta.focus();
        } catch (e3) { /* ignore */ }
        insertIntoInput(ta, responseText);
        return "ok";
      }

      if (ceEditable) {
        try {
          ceEditable.focus();
        } catch (e4) { /* ignore */ }
        document.execCommand("insertText", false, responseText);
        return "ok";
      }
    }

    return "";
  } catch (e) {
    return "";
  }
}

async function tryPasteResponseInAllFrames(tabId, response) {
  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: pasteGeminiIntoDocument,
      args: [response],
    });
    return (
      Array.isArray(injections) &&
      injections.some(function (row) {
        return row && row.result === "ok";
      })
    );
  } catch (err) {
    console.warn("[Gemini] all-frame paste failed:", err);
    return false;
  }
}

// Function to paste Gemini response
async function pasteGeminiResponse() {
  try {
    const result = await chrome.storage.local.get(["latestGeminiResponse"]);
    const response = result.latestGeminiResponse || geminiResponse;

    if (!response) {
      showNotification("No response available", "error");
      return;
    }
    geminiResponse = response;

    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      if (!tabs[0]) {
        showNotification("Cannot paste in current context", "error");
        return;
      }
      const tabId = tabs[0].id;

      const didInject = await tryPasteResponseInAllFrames(tabId, response);
      if (didInject) {
        showNotification("Response pasted", "success");
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { action: "pasteResponse", response: response },
        async function (r) {
          if (chrome.runtime.lastError) {
            if (await swClipboardWriteMaybe(response)) {
              showNotification("Copied — press Ctrl+V in the editor", "success");
            } else {
              showNotification("Could not paste or copy reply", "error");
            }
            return;
          }
          if (!r || !r.success) {
            if (await swClipboardWriteMaybe(response)) {
              showNotification("Copied — press Ctrl+V in the editor", "success");
            } else {
              showNotification("Could not paste or copy reply", "error");
            }
          }
        }
      );
    });
  } catch (error) {
    console.error("Error pasting response:", error);
    showNotification("Failed to paste response", "error");
  }
}


/** URLs where content scripts cannot run — avoid sendMessage without a receiver. */
function tabUrlCannotHostContentScripts(url) {
  if (!url || typeof url !== "string") {
    return false;
  }
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://") ||
    url.startsWith("view-source:")
  );
}

// Function to show notification via content script (no receiver ⇒ skip quietly)
function showNotification(status, type = 'info', duration = 3000) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs && tabs[0];
    if (!tab?.id || tabUrlCannotHostContentScripts(tab.url)) {
      return;
    }
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "showNotification",
        status: status,
        type: type,
        duration: duration,
      },
      function () {
        if (chrome.runtime.lastError) {
          // Tab has no injected listener (timing, unload, unsupported frame, etc.)
          return;
        }
      }
    );
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId === "sendSelectionToGemini" && info.selectionText) {
    processContentWithGemini(info.selectionText);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "apiKeySaved") {
    console.log("API key was saved successfully");
    showNotification("API key saved", "success");
    sendResponse({success: true});
    return true;
  }
  
  if (message.action === "testNotification") {
    console.log("Testing notification with minimalist mode:", message.minimalistMode);
    // Force storage update first to ensure the new setting is used
    chrome.storage.local.set({minimalistMode: message.minimalistMode}, function() {
      // Then show a test notification
      if (message.minimalistMode) {
        showNotification("Test notification", "info");
      } else {
        showNotification("Display mode changed to detailed", "info");
      }
    });
    return true;
  }
  
  // Handle position change test
  if (message.action === "testPositionChange") {
    console.log("Testing notification with new position:", message.position, message.positionX, message.positionY);
    
    // Show a test notification
    showNotification("Position updated", "success");
    return true;
  }
  
  // Handle clockwise mode test
  if (message.action === "testClockwiseIndicator") {
    console.log("Testing clockwise indicator");
    
    // Show a test notification
    showNotification("Clockwise mode enabled", "success");
    return true;
  }
  
  // Handle middle mouse click paste request
  if (message.action === "pasteResponseRequest") {
    pasteGeminiResponse();
    return true;
  }

  // Write text from the extension context. Content scripts often cannot use
  // navigator.clipboard.writeText without a user gesture (page security model);
  // the service worker can with the clipboardWrite permission.
  if (message.action === "copyToClipboard" && typeof message.text === "string") {
    const text = message.text;
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      sendResponse({
        success: false,
        error: "Clipboard API unavailable in service worker — use refresh (F5) after reload.",
      });
      return false;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error("Extension clipboard write failed:", err?.name, err?.message);
        sendResponse({
          success: false,
          error: err?.message || String(err),
        });
      });
    return true;
  }

  // Triggered from the in-page expander overlay's "Send" button when its
  // local clipboard read failed. Routes through the same flow as the
  // Alt+N / Ctrl+I keyboard shortcut.
  if (message.action === "triggerSendToGemini") {
    getClipboardAndSendToGemini();
    return false;
  }

  // Preferred path from the expander's "Send" button in standard mode:
  // the content script already grabbed the clipboard text inside the
  // click handler (where user activation is fresh) and is shipping it
  // straight here, avoiding any round-trip race with the clipboard.
  if (message.action === "processClipboardText") {
    (async () => {
      if (message.text && message.text.length > 0) {
        await processContentWithGemini(message.text);
      } else {
        showNotification("Copy text first (Ctrl+C), then send", "error");
      }
    })();
    return false;
  }

  // Expander's "Send" button in JSON (screenshot) mode.
  if (message.action === "triggerScreenshotSend") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        debouncedCaptureScreenshot(tabs[0].id);
      } else {
        showNotification("No active tab found", "error");
      }
    });
    return false;
  }

  return false;
}); 