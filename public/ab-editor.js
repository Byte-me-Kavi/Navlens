/**
 * Navlens Visual A/B Editor - Enhanced Version
 * 
 * Lazy-loaded overlay for creating visual modifications.
 * Only loaded when ?__navlens_editor is in URL with valid signature.
 * 
 * Supports 18 modification types:
 * - Content: CSS, Text, Hide, Image, Link, Insert HTML, Replace HTML
 * - Visual: Resize, Clone, Reorder, Move
 * - Attribute: Attribute, Class
 * - Interactive: Click Redirect, Tooltip, Sticky
 * - Form: Placeholder, Form Action
 * - Animation: Animation
 * 
 * Security:
 * - Requires HMAC-signed URL with timestamp
 * - URLs expire after 1 hour
 */

(function() {
  'use strict';

  // Get config from URL
  const urlParams = new URLSearchParams(window.location.search);
  const editorMode = urlParams.has('__navlens_editor');
  
  if (!editorMode) return;

  // Validate signature and timestamp
  const experimentId = urlParams.get('__navlens_editor');
  const variantId = urlParams.get('__variant');
  const timestamp = urlParams.get('__ts');
  const signature = urlParams.get('__sig');

  // Get navlens config
  const navlensScript = document.querySelector('script[data-site-id]');
  const siteId = navlensScript?.dataset.siteId;
  const apiHost = navlensScript?.dataset.apiHost || navlensScript?.src.replace(/\/tracker\.js.*/, '');
  
  if (!siteId || !apiHost) {
    console.error('[navlens-editor] Missing site ID or API host');
    return;
  }

  const normalizedHost = apiHost.includes('://') ? apiHost : `https://${apiHost}`;

  // SECURITY: Verify signature server-side before loading editor
  async function verifyAndLoadEditor() {
    // Check if URL has signature (required for security)
    if (!signature || !timestamp) {
      alert('Invalid editor link. Please generate a new link from the dashboard.');
      console.error('[navlens-editor] Missing signature or timestamp');
      return false;
    }

    // Quick client-side expiry check (1 hour)
    const ts = parseInt(timestamp, 10);
    const age = Date.now() - ts;
    const MAX_AGE = 60 * 60 * 1000; // 1 hour
    
    if (age > MAX_AGE || age < 0) {
      alert('Editor link has expired. Please generate a new link from the dashboard.');
      console.error('[navlens-editor] Editor URL expired');
      return false;
    }

    // Server-side signature verification
    try {
      const resp = await fetch(`${normalizedHost}/api/experiments/verify-editor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experimentId, variantId, timestamp, signature })
      });

      const result = await resp.json();

      if (!result.valid) {
        alert(`Editor access denied: ${result.error || 'Invalid signature'}. Please generate a new link.`);
        console.error('[navlens-editor] Signature verification failed:', result.error);
        return false;
      }

      console.log('[navlens-editor] Signature verified successfully');
      return true;
    } catch (e) {
      console.error('[navlens-editor] Verification request failed:', e);
      alert('Could not verify editor access. Please check your connection and try again.');
      return false;
    }
  }

  // Verify before proceeding
  verifyAndLoadEditor().then(verified => {
    if (!verified) return;

  // Editor state
  let selectedElement = null;
  let modifications = [];
  let isDragging = false;

  // ============================================
  // UI STYLES
  // ============================================
  const styles = document.createElement('style');
  styles.id = 'navlens-editor-styles';
  styles.textContent = `
    .nv-editor-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100%;
      pointer-events: none;
      z-index: 999999;
    }
    
    .nv-highlight {
      position: absolute;
      pointer-events: none;
      border: 2px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      transition: all 0.1s ease;
      z-index: 999998;
    }
    
    .nv-selected {
      border: 2px solid #10b981 !important;
      background: rgba(16, 185, 129, 0.1) !important;
    }
    
    .nv-toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 1000000;
      pointer-events: auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      min-width: 320px;
      max-width: 380px;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .nv-toolbar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #374151;
    }
    
    .nv-toolbar-title {
      font-weight: 600;
      color: #10b981;
    }
    
    .nv-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .nv-btn-primary {
      background: #3b82f6;
      color: white;
    }
    
    .nv-btn-primary:hover {
      background: #2563eb;
    }
    
    .nv-btn-success {
      background: #10b981;
      color: white;
    }
    
    .nv-btn-danger {
      background: #ef4444;
      color: white;
    }
    
    .nv-btn-secondary {
      background: #374151;
      color: white;
    }
    
    .nv-panel {
      margin-top: 12px;
    }
    
    .nv-panel-section {
      margin-bottom: 12px;
    }
    
    .nv-panel-label {
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    
    .nv-input {
      width: 100%;
      padding: 8px;
      border: 1px solid #374151;
      border-radius: 4px;
      background: #111827;
      color: white;
      font-size: 13px;
      box-sizing: border-box;
    }
    
    .nv-input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    .nv-color-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .nv-color-input {
      width: 40px;
      height: 32px;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
    
    .nv-selector-display {
      font-family: monospace;
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
      word-break: break-all;
    }
    
    .nv-mod-list {
      max-height: 150px;
      overflow-y: auto;
      margin-top: 8px;
    }
    
    .nv-mod-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #111827;
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    
    .nv-mod-delete {
      color: #ef4444;
      cursor: pointer;
      padding: 2px 6px;
    }

    .nv-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .nv-file-input {
      display: none;
    }

    .nv-file-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #374151;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .nv-file-btn:hover {
      background: #4b5563;
    }

    .nv-preview-img {
      max-width: 100%;
      max-height: 80px;
      border-radius: 4px;
      margin-top: 8px;
    }

    .nv-type-group {
      padding: 4px 0;
      border-bottom: 1px solid #374151;
    }

    .nv-type-group:last-child {
      border-bottom: none;
    }

    .nv-type-group-label {
      font-size: 10px;
      color: #6b7280;
      padding: 4px 8px;
      text-transform: uppercase;
    }

    .nv-checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .nv-checkbox-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }

    .nv-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .nv-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .nv-tab {
      padding: 4px 8px;
      font-size: 11px;
      background: #374151;
      border-radius: 4px;
      cursor: pointer;
    }

    .nv-tab.active {
      background: #3b82f6;
    }
  `;
  document.head.appendChild(styles);

  // ============================================
  // UI ELEMENTS
  // ============================================
  
  // Overlay container
  const overlay = document.createElement('div');
  overlay.className = 'nv-editor-overlay';
  overlay.id = 'navlens-editor';
  
  // Highlight box
  const highlight = document.createElement('div');
  highlight.className = 'nv-highlight';
  highlight.style.display = 'none';
  overlay.appendChild(highlight);
  
  // Toolbar HTML - with all modification types + UX controls
  const toolbar = document.createElement('div');
  toolbar.className = 'nv-toolbar';
  toolbar.innerHTML = `
    <div class="nv-toolbar-header">
      <span class="nv-toolbar-title">🧪 Navlens Editor</span>
      <div style="display: flex; gap: 4px;">
        <button class="nv-btn" id="nv-minimize" title="Minimize to floating button">➖</button>
        <button class="nv-btn nv-btn-danger" id="nv-close">✕</button>
      </div>
    </div>
    
    <!-- Mode & Viewport Controls -->
    <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 160px;">
        <div class="nv-panel-label" style="margin-bottom: 4px;">Mode</div>
        <div style="display: flex; background: #374151; border-radius: 6px; overflow: hidden;">
          <button id="nv-mode-edit" class="nv-mode-btn nv-mode-active" style="flex:1; padding: 6px 6px; font-size: 10px; border: none; cursor: pointer; background: #3b82f6; color: white;">🖱️ Edit</button>
          <button id="nv-mode-drag" class="nv-mode-btn" style="flex:1; padding: 6px 6px; font-size: 10px; border: none; cursor: pointer; background: transparent; color: #9ca3af;">✋ Drag</button>
          <button id="nv-mode-navigate" class="nv-mode-btn" style="flex:1; padding: 6px 6px; font-size: 10px; border: none; cursor: pointer; background: transparent; color: #9ca3af;">🔗 Nav</button>
        </div>
      </div>
    </div>
    
    <!-- Undo/Redo Row -->
    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
      <button id="nv-undo" class="nv-btn" style="flex:1;" disabled title="Undo (Ctrl+Z)">↩️ Undo</button>
      <button id="nv-redo" class="nv-btn" style="flex:1;" disabled title="Redo (Ctrl+Shift+Z)">↪️ Redo</button>
    </div>
    
    <div id="nv-instructions" style="color: #9ca3af; font-size: 12px;">
      Click on any element to select it
    </div>
    
    <div id="nv-edit-panel" class="nv-panel" style="display: none;">
      <div class="nv-panel-section">
        <div class="nv-panel-label">Selected Element</div>
        <div id="nv-selected-tag" style="font-weight: 600;"></div>
        <div id="nv-selected-selector" class="nv-selector-display"></div>
      </div>
      
      <div class="nv-panel-section">
        <div class="nv-panel-label">Modification Type</div>
        <select id="nv-mod-type" class="nv-input">
          <!-- Options populated dynamically based on selected element -->
        </select>
        <div id="nv-type-hint" style="font-size: 10px; color: #6b7280; margin-top: 4px;"></div>
      </div>
      
      <!-- CSS Panel -->
      <div id="nv-css-panel" class="nv-panel-section">
        <div class="nv-panel-label">Background Color</div>
        <div class="nv-color-row">
          <input type="color" id="nv-bg-color" class="nv-color-input" value="#ffffff">
          <input type="text" id="nv-bg-color-text" class="nv-input" placeholder="#ffffff" style="flex:1;">
        </div>
        
        <div class="nv-panel-label" style="margin-top: 8px;">Text Color</div>
        <div class="nv-color-row">
          <input type="color" id="nv-text-color" class="nv-color-input" value="#000000">
          <input type="text" id="nv-text-color-text" class="nv-input" placeholder="#000000" style="flex:1;">
        </div>
        
        <div class="nv-panel-label" style="margin-top: 8px;">Font Size</div>
        <input type="text" id="nv-font-size" class="nv-input" placeholder="e.g., 16px">
      </div>
      
      <!-- Text Panel -->
      <div id="nv-text-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">New Text</div>
        <textarea id="nv-new-text" class="nv-input" rows="3" placeholder="Enter replacement text..."></textarea>
      </div>

      <!-- Hide Panel -->
      <div id="nv-hide-panel" class="nv-panel-section" style="display: none;">
        <div style="color: #fbbf24; font-size: 12px;">
          ⚠️ This will hide the selected element (CSS display: none). Element stays in DOM.
        </div>
      </div>

      <!-- Remove Panel (Hard Delete) -->
      <div id="nv-remove-panel" class="nv-panel-section" style="display: none;">
        <div style="color: #ef4444; font-size: 12px;">
          🗑️ This will <strong>permanently remove</strong> the element from the DOM for this variant.
        </div>
      </div>

      <!-- Clone Panel -->
      <div id="nv-clone-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Number of Clones</div>
        <input type="number" id="nv-clone-count" class="nv-input" min="1" max="10" value="1" placeholder="1-10">
        <div class="nv-panel-label" style="margin-top: 8px;">Position</div>
        <select id="nv-clone-position" class="nv-input">
          <option value="after">After Original</option>
          <option value="before">Before Original</option>
        </select>
      </div>

      <!-- Image Panel -->
      <div id="nv-image-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Image URL</div>
        <input type="text" id="nv-image-url" class="nv-input" placeholder="https://example.com/image.jpg">
        <div style="margin: 8px 0; text-align: center; color: #6b7280; font-size: 11px;">— OR —</div>
        <label class="nv-file-btn">
          📁 Upload Image
          <input type="file" id="nv-image-file" class="nv-file-input" accept="image/*">
        </label>
        <div id="nv-image-preview"></div>
      </div>

      <!-- Link Panel -->
      <div id="nv-link-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Link URL</div>
        <input type="text" id="nv-link-url" class="nv-input" placeholder="https://example.com/page">
        <div class="nv-panel-label" style="margin-top: 8px;">Open In</div>
        <select id="nv-link-target" class="nv-input">
          <option value="_self">Same Tab</option>
          <option value="_blank">New Tab</option>
        </select>
      </div>

      <!-- Insert HTML Panel -->
      <div id="nv-insertHtml-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Position</div>
        <select id="nv-insert-position" class="nv-input">
          <option value="before">Before Element</option>
          <option value="after">After Element</option>
          <option value="prepend">Inside (Start)</option>
          <option value="append">Inside (End)</option>
        </select>
        <div class="nv-panel-label" style="margin-top: 8px;">HTML Code</div>
        <textarea id="nv-insert-html" class="nv-input" rows="4" placeholder="<div>Your HTML here</div>" style="font-family: monospace;"></textarea>
      </div>

      <!-- Replace HTML Panel -->
      <div id="nv-replaceHtml-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">New HTML</div>
        <textarea id="nv-replace-html" class="nv-input" rows="4" placeholder="<div>Replacement HTML</div>" style="font-family: monospace;"></textarea>
        <div style="color: #fbbf24; font-size: 11px; margin-top: 4px;">
          ⚠️ This replaces the entire element with your HTML.
        </div>
      </div>

      <!-- Resize Panel -->
      <div id="nv-resize-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-two-col">
          <div>
            <div class="nv-panel-label">Width</div>
            <input type="text" id="nv-resize-width" class="nv-input" placeholder="e.g., 200px or 50%">
          </div>
          <div>
            <div class="nv-panel-label">Height</div>
            <input type="text" id="nv-resize-height" class="nv-input" placeholder="e.g., 100px or auto">
          </div>
        </div>
      </div>

      <!-- Clone Panel -->
      <div id="nv-clone-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Number of Copies</div>
        <input type="number" id="nv-clone-count" class="nv-input" value="1" min="1" max="10">
        <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">
          Copies will be inserted after the original element.
        </div>
      </div>

      <!-- Reorder Panel -->
      <div id="nv-reorder-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Move to Position</div>
        <input type="number" id="nv-reorder-index" class="nv-input" value="0" min="0">
        <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">
          Position among siblings (0 = first).
        </div>
      </div>

      <!-- Move Panel -->
      <div id="nv-move-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-two-col">
          <div>
            <div class="nv-panel-label">X Offset (px)</div>
            <input type="number" id="nv-move-x" class="nv-input" value="0">
          </div>
          <div>
            <div class="nv-panel-label">Y Offset (px)</div>
            <input type="number" id="nv-move-y" class="nv-input" value="0">
          </div>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">
          Uses CSS transform to offset the element.
        </div>
      </div>

      <!-- Attribute Panel -->
      <div id="nv-attribute-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Attribute Name</div>
        <input type="text" id="nv-attr-name" class="nv-input" placeholder="e.g., data-custom, title, aria-label">
        <div class="nv-panel-label" style="margin-top: 8px;">Attribute Value</div>
        <input type="text" id="nv-attr-value" class="nv-input" placeholder="Value to set">
      </div>

      <!-- Class Panel -->
      <div id="nv-class-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Add Classes</div>
        <input type="text" id="nv-class-add" class="nv-input" placeholder="class1, class2">
        <div class="nv-panel-label" style="margin-top: 8px;">Remove Classes</div>
        <input type="text" id="nv-class-remove" class="nv-input" placeholder="class1, class2">
        <div id="nv-current-classes" style="font-size: 11px; color: #6b7280; margin-top: 4px;"></div>
      </div>

      <!-- Click Redirect Panel -->
      <div id="nv-clickRedirect-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Redirect URL</div>
        <input type="text" id="nv-redirect-url" class="nv-input" placeholder="https://example.com/page">
        <div style="color: #9ca3af; font-size: 11px; margin-top: 4px;">
          Clicking this element will navigate to the URL.
        </div>
      </div>

      <!-- Tooltip Panel -->
      <div id="nv-tooltip-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Tooltip Text</div>
        <textarea id="nv-tooltip-text" class="nv-input" rows="2" placeholder="Hover text..."></textarea>
        <div class="nv-panel-label" style="margin-top: 8px;">Position</div>
        <select id="nv-tooltip-position" class="nv-input">
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>

      <!-- Sticky Panel -->
      <div id="nv-sticky-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Stick to Top</div>
        <input type="text" id="nv-sticky-top" class="nv-input" placeholder="e.g., 0px or 20px" value="0px">
        <div class="nv-panel-label" style="margin-top: 8px;">Z-Index</div>
        <input type="number" id="nv-sticky-zindex" class="nv-input" value="1000" min="1" max="9999999">
      </div>

      <!-- Placeholder Panel -->
      <div id="nv-placeholder-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">New Placeholder Text</div>
        <input type="text" id="nv-placeholder-text" class="nv-input" placeholder="Enter new placeholder...">
      </div>

      <!-- Form Action Panel -->
      <div id="nv-formAction-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">New Form Action URL</div>
        <input type="text" id="nv-form-action-url" class="nv-input" placeholder="https://example.com/submit">
        <div style="color: #fbbf24; font-size: 11px; margin-top: 4px;">
          ⚠️ Only applies to form elements.
        </div>
      </div>

      <!-- Animation Panel -->
      <div id="nv-animation-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">Animation Name</div>
        <select id="nv-animation-name" class="nv-input">
          <option value="">Select animation...</option>
          <option value="fadeIn">Fade In</option>
          <option value="fadeOut">Fade Out</option>
          <option value="slideInLeft">Slide In Left</option>
          <option value="slideInRight">Slide In Right</option>
          <option value="slideInUp">Slide In Up</option>
          <option value="slideInDown">Slide In Down</option>
          <option value="bounce">Bounce</option>
          <option value="pulse">Pulse</option>
          <option value="shake">Shake</option>
          <option value="custom">Custom CSS</option>
        </select>
        <div class="nv-two-col" style="margin-top: 8px;">
          <div>
            <div class="nv-panel-label">Duration</div>
            <input type="text" id="nv-animation-duration" class="nv-input" placeholder="0.5s" value="0.5s">
          </div>
          <div>
            <div class="nv-panel-label">Repeat</div>
            <select id="nv-animation-iteration" class="nv-input">
              <option value="1">Once</option>
              <option value="2">2 times</option>
              <option value="3">3 times</option>
              <option value="5">5 times</option>
              <option value="infinite">∞ Infinite</option>
            </select>
          </div>
        </div>
        <div class="nv-panel-label" style="margin-top: 8px;">Delay (before start)</div>
        <input type="text" id="nv-animation-delay" class="nv-input" placeholder="0s" value="0s">
        <div id="nv-animation-custom-container" style="display: none; margin-top: 8px;">
          <div class="nv-panel-label">Custom CSS Animation</div>
          <textarea id="nv-animation-custom" class="nv-input" rows="2" placeholder="transform: scale(1.1);" style="font-family: monospace;"></textarea>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="nv-btn nv-btn-primary" id="nv-add-mod" style="flex: 1;">Add Change</button>
        <button class="nv-btn nv-btn-secondary" id="nv-cancel">Cancel</button>
      </div>
    </div>
    
    <div class="nv-panel-section" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #374151;">
      <div class="nv-panel-label">Saved Changes (<span id="nv-mod-count">0</span>)</div>
      <div id="nv-mod-list" class="nv-mod-list"></div>
      <button class="nv-btn nv-btn-success" id="nv-save" style="width: 100%; margin-top: 8px;">
        💾 Save All Changes
      </button>
    </div>
  `;
  overlay.appendChild(toolbar);
  
  document.body.appendChild(overlay);

  // ============================================
  // SMART MODIFICATION TYPES & ORIGINAL STATE
  // ============================================
  
  // Store original element states for undo
  const originalStates = new Map();
  
  // All available modification types with their requirements
  const modificationTypes = {
    // Universal types (work on any element)
    css: { label: '🎨 Change Style (CSS)', hint: 'Modify colors, fonts, spacing', universal: true },
    text: { label: '✏️ Change Text', hint: 'Replace text content', universal: true },
    hide: { label: '👁️ Hide Element', hint: 'Hide from visitors (CSS)', universal: true },
    remove: { label: '🗑️ Remove Element', hint: 'Delete from DOM', universal: true },
    clone: { label: '📋 Clone Element', hint: 'Duplicate this element', universal: true },
    insertHtml: { label: '➕ Insert HTML', hint: 'Add HTML before/after', universal: true },
    replaceHtml: { label: '🔄 Replace HTML', hint: 'Replace with custom HTML', universal: true },
    resize: { label: '📐 Resize Element', hint: 'Change width/height', universal: true },
    reorder: { label: '↕️ Reorder Element', hint: 'Move among siblings', universal: true },
    move: { label: '✋ Move Element', hint: 'Offset position', universal: true },
    attribute: { label: '⚙️ Modify Attribute', hint: 'Change any attribute', universal: true },
    class: { label: '🏷️ Toggle Classes', hint: 'Add/remove CSS classes', universal: true },
    tooltip: { label: '💬 Add Tooltip', hint: 'Show text on hover', universal: true },
    sticky: { label: '📌 Make Sticky', hint: 'Stick to viewport', universal: true },
    animation: { label: '✨ Add Animation', hint: 'Animate on load', universal: true },
    clickRedirect: { label: '🖱️ Click Redirect', hint: 'Navigate on click', universal: true },
    
    // Element-specific types
    image: { label: '🖼️ Replace Image', hint: 'Swap image source', tags: ['IMG'] },
    link: { label: '🔗 Replace Link', hint: 'Change link URL', tags: ['A'] },
    placeholder: { label: '📝 Change Placeholder', hint: 'Modify placeholder text', tags: ['INPUT', 'TEXTAREA'] },
    formAction: { label: '📤 Change Form Action', hint: 'Redirect form submission', tags: ['FORM'] }
  };
  
  // Populate modification types based on selected element
  function populateModTypes(element) {
    const select = document.getElementById('nv-mod-type');
    const hint = document.getElementById('nv-type-hint');
    const tagName = element.tagName.toUpperCase();
    
    select.innerHTML = '';
    
    // Add universal types
    const universalGroup = document.createElement('optgroup');
    universalGroup.label = 'All Elements';
    
    Object.entries(modificationTypes).forEach(([value, config]) => {
      if (config.universal) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = config.label;
        universalGroup.appendChild(option);
      }
    });
    select.appendChild(universalGroup);
    
    // Check for nested elements (handles Next.js Image wrappers, etc.)
    const nestedTypes = [];
    
    // Check if this element or its children contain special elements
    if (tagName === 'IMG' || element.querySelector('img')) {
      nestedTypes.push(['image', modificationTypes.image]);
    }
    if (tagName === 'A' || element.querySelector('a')) {
      nestedTypes.push(['link', modificationTypes.link]);
    }
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || element.querySelector('input, textarea')) {
      nestedTypes.push(['placeholder', modificationTypes.placeholder]);
    }
    if (tagName === 'FORM' || element.querySelector('form')) {
      nestedTypes.push(['formAction', modificationTypes.formAction]);
    }
    
    // Add element-specific types (including nested)
    if (nestedTypes.length > 0) {
      const specificGroup = document.createElement('optgroup');
      const label = tagName === 'IMG' ? 'IMG Specific' : 
                    tagName === 'A' ? 'Link Specific' :
                    'Contains Special Elements';
      specificGroup.label = label;
      
      nestedTypes.forEach(([value, config]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = config.label;
        specificGroup.appendChild(option);
      });
      select.appendChild(specificGroup);
      
      // Default to element-specific type
      select.value = nestedTypes[0][0];
    }
    
    // Show hint
    const selected = modificationTypes[select.value];
    hint.textContent = selected ? selected.hint : '';
    
    // Show appropriate panel
    showPanel(`nv-${select.value}-panel`);
  }
  
  // Store original state for undo
  function storeOriginalState(element, modId) {
    if (!originalStates.has(modId)) {
      originalStates.set(modId, {
        outerHTML: element.outerHTML,
        style: element.getAttribute('style') || '',
        textContent: element.textContent,
        src: element.src,
        href: element.href,
        placeholder: element.placeholder,
        action: element.action,
        className: element.className,
        title: element.title
      });
    }
  }
  
  // Restore original state on undo
  function restoreOriginalState(mod) {
    const original = originalStates.get(mod.id);
    if (!original) return;
    
    try {
      const elements = document.querySelectorAll(mod.selector);
      elements.forEach(el => {
        switch (mod.type) {
          case 'css':
          case 'hide':
          case 'resize':
          case 'sticky':
          case 'move':
            el.setAttribute('style', original.style);
            break;
          case 'text':
            el.textContent = original.textContent;
            break;
          case 'image':
            if (el.tagName === 'IMG') el.src = original.src;
            break;
          case 'link':
            if (el.tagName === 'A') el.href = original.href;
            break;
          case 'placeholder':
            el.placeholder = original.placeholder;
            break;
          case 'formAction':
            if (el.tagName === 'FORM') el.action = original.action;
            break;
          case 'class':
            el.className = original.className;
            break;
          case 'tooltip':
            el.title = original.title;
            break;
          case 'animation':
            el.style.animation = '';
            el.style.transition = '';
            break;
          case 'attribute':
            // For attributes, we restore the full style and outer state
            el.setAttribute('style', original.style);
            break;
        }
        delete el.dataset.nvApplied;
      });
      originalStates.delete(mod.id);
    } catch (e) {
      console.warn('[navlens-editor] Could not restore original state:', e);
    }
  }

  // ============================================
  // PANEL VISIBILITY MANAGEMENT
  // ============================================
  const allPanels = [
    'nv-css-panel', 'nv-text-panel', 'nv-hide-panel', 'nv-image-panel', 'nv-link-panel',
    'nv-insertHtml-panel', 'nv-replaceHtml-panel', 'nv-resize-panel', 'nv-clone-panel',
    'nv-reorder-panel', 'nv-move-panel', 'nv-attribute-panel', 'nv-class-panel',
    'nv-clickRedirect-panel', 'nv-tooltip-panel', 'nv-sticky-panel', 'nv-placeholder-panel',
    'nv-formAction-panel', 'nv-animation-panel'
  ];

  function showPanel(panelId) {
    allPanels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === panelId ? 'block' : 'none';
    });
  }

  // Show appropriate panel when modification type changes
  document.getElementById('nv-mod-type').addEventListener('change', (e) => {
    const type = e.target.value;
    showPanel(`nv-${type}-panel`);
    
    // Update hint
    const hint = document.getElementById('nv-type-hint');
    const config = modificationTypes[type];
    hint.textContent = config ? config.hint : '';
    
    // Show current classes for class modification
    if (type === 'class' && selectedElement) {
      const classes = Array.from(selectedElement.classList).filter(c => !c.startsWith('nv-'));
      document.getElementById('nv-current-classes').textContent = 
        classes.length ? `Current: ${classes.join(', ')}` : 'No classes';
    }
  });

  // Animation name change handler
  document.getElementById('nv-animation-name').addEventListener('change', (e) => {
    const container = document.getElementById('nv-animation-custom-container');
    container.style.display = e.target.value === 'custom' ? 'block' : 'none';
  });

  // ============================================
  // IMAGE UPLOAD HANDLING
  // ============================================
  document.getElementById('nv-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('nv-image-preview');
    preview.innerHTML = '<div style="color: #9ca3af; font-size: 11px;">Uploading...</div>';

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('siteId', siteId);
      formData.append('experimentId', experimentId || '');
      formData.append('variantId', variantId || '');
      formData.append('timestamp', timestamp || '');
      formData.append('signature', signature || '');

      const resp = await fetch(`${apiHost}/api/experiments/upload`, {
        method: 'POST',
        mode: 'cors',
        body: formData
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await resp.json();
      document.getElementById('nv-image-url').value = data.url;
      preview.innerHTML = `<img src="${data.url}" class="nv-preview-img" alt="Preview">`;
    } catch (err) {
      preview.innerHTML = `<div style="color: #ef4444; font-size: 11px;">Error: ${err.message}</div>`;
    }
  });

  // URL preview for image
  document.getElementById('nv-image-url').addEventListener('blur', (e) => {
    const url = e.target.value.trim();
    const preview = document.getElementById('nv-image-preview');
    if (url && url.startsWith('http')) {
      preview.innerHTML = `<img src="${url}" class="nv-preview-img" alt="Preview" onerror="this.style.display='none'">`;
    } else {
      preview.innerHTML = '';
    }
  });

  // ============================================
  // LOAD EXISTING MODIFICATIONS
  // ============================================
  async function loadExistingModifications() {
    try {
      const params = new URLSearchParams({
        experimentId: experimentId,
        siteId: siteId,
        variantId: variantId || '',
        ts: timestamp || '',
        sig: signature || ''
      });
      
      console.log('[navlens-editor] Loading modifications from:', `${apiHost}/api/experiments/modifications?${params}`);
      
      const resp = await fetch(`${apiHost}/api/experiments/modifications?${params}`);
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error('[navlens-editor] Failed to load modifications:', resp.status, errorData);
        return;
      }
      
      const data = await resp.json();
      
      if (data.modifications && data.modifications.length > 0) {
        const variantMods = variantId 
          ? data.modifications.filter(m => m.variant_id === variantId)
          : data.modifications;
        
        modifications = variantMods;
        updateModList();
        
        // Apply modifications visually
        modifications.forEach(mod => {
          applyModification(mod);
        });
        
        console.log(`[navlens-editor] Loaded ${modifications.length} existing modifications`);
      }
    } catch (e) {
      console.error('[navlens-editor] Could not load existing modifications:', e);
    }
  }

  // ============================================
  // APPLY MODIFICATION TO DOM
  // ============================================
  function applyModification(mod) {
    try {
      let elements;
      try {
        elements = document.querySelectorAll(mod.selector);
      } catch (err) {
        if (mod.selector.includes(':')) {
          const escapedSelector = mod.selector.replace(/:/g, '\\:');
          elements = document.querySelectorAll(escapedSelector);
        } else {
          throw err;
        }
      }

      elements.forEach(el => {
        const changes = mod.changes || {};
        
        switch (mod.type) {
          case 'css':
            if (changes.css) Object.assign(el.style, changes.css);
            break;
          case 'text':
            if (changes.text !== undefined) el.textContent = changes.text;
            break;
          case 'hide':
            el.style.display = 'none';
            break;
          case 'remove':
            el.remove();
            break;
          case 'clone':
            const count = changes.cloneCount || 1;
            const position = changes.clonePosition || 'after';
            for (let i = 0; i < count; i++) {
              const clone = el.cloneNode(true);
              clone.removeAttribute('id'); // Avoid duplicate IDs
              if (position === 'before') {
                el.parentNode.insertBefore(clone, el);
              } else {
                el.parentNode.insertBefore(clone, el.nextSibling);
              }
            }
            break;
          case 'image':
            if (changes.imageUrl) {
              // Handle both direct IMG elements and Next.js Image wrappers
              const replaceImage = (img) => {
                console.log('[navlens-editor] Replacing image:', img.src, '->', changes.imageUrl);
                
                // Clear srcset to prevent Next.js from overriding
                img.removeAttribute('srcset');
                img.removeAttribute('data-srcset');
                
                // Set the new src
                img.src = changes.imageUrl;
                
                // Use CSS to ensure the image stays replaced even if React re-renders
                // This creates a visual override that persists
                img.style.cssText += `
                  content: url(${changes.imageUrl}) !important;
                  object-fit: cover !important;
                `;
                
                // Mark as modified to prevent re-application loops
                img.dataset.nvModified = 'true';
              };
              
              if (el.tagName === 'IMG') {
                replaceImage(el);
              } else {
                // Check for img inside the element (Next.js Image wrapper)
                const imgs = el.querySelectorAll('img');
                imgs.forEach(replaceImage);
              }
            }
            break;
          case 'link':
            if (changes.linkUrl && el.tagName === 'A') {
              el.href = changes.linkUrl;
              if (changes.linkTarget) el.target = changes.linkTarget;
            }
            break;
          case 'insertHtml':
            if (changes.html) {
              const pos = changes.insertPosition || 'after';
              el.insertAdjacentHTML(
                pos === 'before' ? 'beforebegin' : 
                pos === 'after' ? 'afterend' :
                pos === 'prepend' ? 'afterbegin' : 'beforeend',
                changes.html
              );
            }
            break;
          case 'replaceHtml':
            if (changes.html) el.outerHTML = changes.html;
            break;
          case 'resize':
            if (changes.width) el.style.width = changes.width;
            if (changes.height) el.style.height = changes.height;
            break;

          case 'reorder':
            const parent = el.parentNode;
            const siblings = Array.from(parent.children);
            const newIdx = Math.min(changes.newIndex || 0, siblings.length - 1);
            parent.insertBefore(el, siblings[newIdx]);
            break;
          case 'move':
            if (changes.position) {
              el.style.transform = `translate(${changes.position.x}px, ${changes.position.y}px)`;
            }
            break;
          case 'attribute':
            if (changes.attributes) {
              Object.entries(changes.attributes).forEach(([k, v]) => el.setAttribute(k, v));
            }
            break;
          case 'class':
            if (changes.addClass) changes.addClass.forEach(c => el.classList.add(c));
            if (changes.removeClass) changes.removeClass.forEach(c => el.classList.remove(c));
            break;
          case 'clickRedirect':
            if (changes.redirectUrl) {
              el.style.cursor = 'pointer';
              el.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = changes.redirectUrl;
              });
            }
            break;
          case 'tooltip':
            if (changes.tooltipText) {
              el.title = changes.tooltipText;
            }
            break;
          case 'sticky':
            el.style.position = 'sticky';
            el.style.top = changes.stickyTop || '0px';
            el.style.zIndex = changes.stickyZIndex || 1000;
            break;
          case 'placeholder':
            if (changes.placeholderText !== undefined) {
              el.placeholder = changes.placeholderText;
            }
            break;
          case 'formAction':
            if (changes.formActionUrl && el.tagName === 'FORM') {
              el.action = changes.formActionUrl;
            }
            break;
          case 'animation':
            if (changes.animationName) {
              const duration = changes.animationDuration || '0.5s';
              if (changes.animationName === 'custom' && changes.animationCustom) {
                el.style.transition = `all ${duration}`;
                Object.assign(el.style, parseCustomCss(changes.animationCustom));
              } else {
                el.style.animation = `${changes.animationName} ${duration}`;
              }
            }
            break;
        }
      });
    } catch (e) {
      console.warn('[navlens-editor] Could not apply modification:', mod.selector, e);
    }
  }

  function parseCustomCss(css) {
    const result = {};
    css.split(';').forEach(part => {
      const [prop, value] = part.split(':').map(s => s.trim());
      if (prop && value) {
        // Convert kebab-case to camelCase
        const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        result[camelProp] = value;
      }
    });
    return result;
  }
  
  // Load existing modifications on startup
  loadExistingModifications();

  // ============================================
  // ELEMENT SELECTION
  // ============================================
  
  function getSelector(element) {
    // If element has an ID, use it directly
    if (element.id) return `#${CSS.escape(element.id)}`;
    
    // Try to use unique attributes for images
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      
      // Handle Next.js Image URLs: /_next/image?url=%2Fimg%2Flec1.webp&w=256
      if (src.includes('/_next/image')) {
        try {
          const urlParam = new URL(src, window.location.origin).searchParams.get('url');
          if (urlParam) {
            // Get the filename from the url param (decoded)
            const decodedUrl = decodeURIComponent(urlParam);
            const filename = decodedUrl.split('/').pop();
            if (filename && filename.length > 3) {
              console.log('[navlens-editor] Using Next.js image filename:', filename);
              return `img[src*="${CSS.escape(filename)}"]`;
            }
          }
        } catch (e) {
          console.warn('[navlens-editor] Failed to parse Next.js image URL');
        }
      }
      
      // Regular image - extract filename from src
      if (src) {
        const srcPart = src.split('/').pop()?.split('?')[0];
        if (srcPart && srcPart.length > 3 && srcPart !== 'image') {
          return `img[src*="${CSS.escape(srcPart)}"]`;
        }
      }
      
      // Fallback: use alt attribute
      const alt = element.getAttribute('alt');
      if (alt) {
        return `img[alt="${CSS.escape(alt)}"]`;
      }
    }
    
    // For links, try href but VERIFY it's unique first
    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (href && href !== '#' && href !== '/') {
        const hrefSelector = `a[href="${CSS.escape(href)}"]`;
        // Only use href if it matches EXACTLY one element (unique)
        const matches = document.querySelectorAll(hrefSelector);
        if (matches.length === 1) {
          return hrefSelector;
        }
        // If multiple matches, fall through to path-based selector
        console.log(`[navlens-editor] Multiple links with href="${href}" (${matches.length}), using path-based selector`);
      }
    }
    
    // Build path with nth-child for uniqueness
    let path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // For links, include href in the path-based selector too
      if (current.tagName === 'A' && current.getAttribute('href')) {
        const href = current.getAttribute('href');
        if (href && href !== '#' && href !== '/') {
          selector += `[href="${CSS.escape(href)}"]`;
        }
      }
      
      // Add nth-of-type for specificity (especially useful for repeated elements)
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      // Add a class if available (limit to 1 to keep selector short)
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/)
          .filter(c => c && !c.startsWith('nv-') && !c.startsWith('__'))
          .slice(0, 1);
        if (classes.length) {
          selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
      }
      
      // Add data-testid or role attribute if available (common for identifying elements)
      const testId = current.getAttribute('data-testid');
      const role = current.getAttribute('role');
      if (testId) {
        selector += `[data-testid="${CSS.escape(testId)}"]`;
      } else if (role && ['button', 'link', 'navigation', 'main', 'header', 'footer'].includes(role)) {
        selector += `[role="${role}"]`;
      }
      
      path.unshift(selector);
      
      // Stop if we have enough specificity  
      if (current.id || path.length >= 4) break;
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }
  
  function isEditorElement(el) {
    return el.closest('#navlens-editor') !== null;
  }
  
  function positionHighlight(element) {
    const rect = element.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.top = rect.top + window.scrollY + 'px';
    highlight.style.left = rect.left + window.scrollX + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
  }
  
  // Mouse move - highlight (only in edit mode)
  document.addEventListener('mousemove', (e) => {
    // Skip if in navigate mode or dragging or clicking on editor
    if (window.navlensInteractionMode === 'navigate' || isDragging || isEditorElement(e.target)) {
      highlight.style.display = 'none';
      return;
    }
    positionHighlight(e.target);
  });
  
  // Click - select (only in edit mode, allow navigation in nav mode)
  document.addEventListener('click', (e) => {
    if (isEditorElement(e.target)) return;
    
    // In navigate mode, allow normal clicks (links work)
    if (window.navlensInteractionMode === 'navigate') {
      return; // Don't prevent default, allow navigation
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    let target = e.target;
    
    // Auto-drill-down to specific elements for better targeting
    // If clicked on a wrapper, try to find the actual img/link inside
    if (target.tagName !== 'IMG' && target.tagName !== 'A' && target.tagName !== 'INPUT') {
      // Check for a single img child that we should target instead
      const imgs = target.querySelectorAll('img');
      if (imgs.length === 1) {
        // Only one image inside - target it directly
        target = imgs[0];
        console.log('[navlens-editor] Auto-targeting nested img element');
      }
      
      // Check for single link
      const links = target.querySelectorAll('a');
      if (links.length === 1 && target.tagName !== 'IMG') {
        target = links[0];
        console.log('[navlens-editor] Auto-targeting nested link element');
      }
    }
    
    selectedElement = target;
    highlight.classList.add('nv-selected');
    positionHighlight(selectedElement);
    
    // Show edit panel
    document.getElementById('nv-instructions').style.display = 'none';
    document.getElementById('nv-edit-panel').style.display = 'block';
    document.getElementById('nv-selected-tag').textContent = 
      `<${selectedElement.tagName.toLowerCase()}>`;
    document.getElementById('nv-selected-selector').textContent = 
      getSelector(selectedElement);
    
    // Pre-fill current styles
    const computed = window.getComputedStyle(selectedElement);
    document.getElementById('nv-bg-color-text').value = computed.backgroundColor;
    document.getElementById('nv-text-color-text').value = computed.color;
    
    // Populate modification types based on selected element
    populateModTypes(selectedElement);
    
    // Show current classes for class modification
    const classes = Array.from(selectedElement.classList).filter(c => !c.startsWith('nv-'));
    document.getElementById('nv-current-classes').textContent = 
      classes.length ? `Current: ${classes.join(', ')}` : 'No classes';
  }, true);

  // Color picker sync
  ['bg', 'text'].forEach(prefix => {
    document.getElementById(`nv-${prefix}-color`).addEventListener('input', (e) => {
      document.getElementById(`nv-${prefix}-color-text`).value = e.target.value;
    });
    document.getElementById(`nv-${prefix}-color-text`).addEventListener('input', (e) => {
      document.getElementById(`nv-${prefix}-color`).value = e.target.value;
    });
  });

  // ============================================
  // ADD MODIFICATION
  // ============================================
  document.getElementById('nv-add-mod').addEventListener('click', () => {
    if (!selectedElement) return;
    
    const type = document.getElementById('nv-mod-type').value;
    const selector = getSelector(selectedElement);
    
    const mod = {
      id: 'mod_' + Date.now(),
      variant_id: variantId || 'variant_0',
      selector: selector,
      type: type,
      changes: {}
    };
    
    // Build changes based on type
    switch (type) {
      case 'css':
        mod.changes.css = {};
        const bgColor = document.getElementById('nv-bg-color-text').value;
        const textColor = document.getElementById('nv-text-color-text').value;
        const fontSize = document.getElementById('nv-font-size').value;
        if (bgColor) mod.changes.css.backgroundColor = bgColor;
        if (textColor) mod.changes.css.color = textColor;
        if (fontSize) mod.changes.css.fontSize = fontSize;
        break;
        
      case 'text':
        mod.changes.text = document.getElementById('nv-new-text').value;
        break;
        
      case 'hide':
        // No additional changes needed - just hides with CSS
        break;
        
      case 'remove':
        // No additional changes needed - removes from DOM
        break;
        
      case 'image':
        mod.changes.imageUrl = document.getElementById('nv-image-url').value;
        console.log('[navlens-editor] Adding image modification:', {
          selector: mod.selector,
          imageUrl: mod.changes.imageUrl,
          selectedElement: selectedElement.tagName
        });
        break;
        
      case 'link':
        mod.changes.linkUrl = document.getElementById('nv-link-url').value;
        mod.changes.linkTarget = document.getElementById('nv-link-target').value;
        break;
        
      case 'insertHtml':
        mod.changes.html = document.getElementById('nv-insert-html').value;
        mod.changes.insertPosition = document.getElementById('nv-insert-position').value;
        break;
        
      case 'replaceHtml':
        mod.changes.html = document.getElementById('nv-replace-html').value;
        break;
        
      case 'resize':
        mod.changes.width = document.getElementById('nv-resize-width').value;
        mod.changes.height = document.getElementById('nv-resize-height').value;
        break;
        
      case 'clone':
        mod.changes.cloneCount = parseInt(document.getElementById('nv-clone-count').value) || 1;
        mod.changes.clonePosition = document.getElementById('nv-clone-position').value || 'after';
        break;
        
      case 'reorder':
        mod.changes.newIndex = parseInt(document.getElementById('nv-reorder-index').value) || 0;
        break;
        
      case 'move':
        mod.changes.position = {
          x: parseInt(document.getElementById('nv-move-x').value) || 0,
          y: parseInt(document.getElementById('nv-move-y').value) || 0
        };
        break;
        
      case 'attribute':
        mod.changes.attributes = {};
        const attrName = document.getElementById('nv-attr-name').value.trim();
        const attrValue = document.getElementById('nv-attr-value').value;
        if (attrName) mod.changes.attributes[attrName] = attrValue;
        break;
        
      case 'class':
        const addClass = document.getElementById('nv-class-add').value.split(',').map(c => c.trim()).filter(Boolean);
        const removeClass = document.getElementById('nv-class-remove').value.split(',').map(c => c.trim()).filter(Boolean);
        if (addClass.length) mod.changes.addClass = addClass;
        if (removeClass.length) mod.changes.removeClass = removeClass;
        break;
        
      case 'clickRedirect':
        mod.changes.redirectUrl = document.getElementById('nv-redirect-url').value;
        break;
        
      case 'tooltip':
        mod.changes.tooltipText = document.getElementById('nv-tooltip-text').value;
        mod.changes.tooltipPosition = document.getElementById('nv-tooltip-position').value;
        break;
        
      case 'sticky':
        mod.changes.stickyTop = document.getElementById('nv-sticky-top').value;
        mod.changes.stickyZIndex = parseInt(document.getElementById('nv-sticky-zindex').value) || 1000;
        break;
        
      case 'placeholder':
        mod.changes.placeholderText = document.getElementById('nv-placeholder-text').value;
        break;
        
      case 'formAction':
        mod.changes.formActionUrl = document.getElementById('nv-form-action-url').value;
        break;
        
      case 'animation':
        mod.changes.animationName = document.getElementById('nv-animation-name').value;
        mod.changes.animationDuration = document.getElementById('nv-animation-duration').value;
        mod.changes.animationIteration = document.getElementById('nv-animation-iteration').value || '1';
        mod.changes.animationDelay = document.getElementById('nv-animation-delay').value || '0s';
        if (mod.changes.animationName === 'custom') {
          mod.changes.animationCustom = document.getElementById('nv-animation-custom').value;
        }
        break;
    }
    
    // Store original state for undo before applying
    storeOriginalState(selectedElement, mod.id);
    
    // Apply preview
    applyModification(mod);
    
    modifications.push(mod);
    updateModList();
    
    // Reset selection
    resetSelection();
  });

  // Cancel
  document.getElementById('nv-cancel').addEventListener('click', () => {
    resetSelection();
  });

  function resetSelection() {
    selectedElement = null;
    highlight.classList.remove('nv-selected');
    highlight.style.display = 'none';
    document.getElementById('nv-edit-panel').style.display = 'none';
    document.getElementById('nv-instructions').style.display = 'block';
    
    // Reset all input fields
    document.getElementById('nv-font-size').value = '';
    document.getElementById('nv-new-text').value = '';
    document.getElementById('nv-image-url').value = '';
    document.getElementById('nv-image-preview').innerHTML = '';
    document.getElementById('nv-link-url').value = '';
    document.getElementById('nv-insert-html').value = '';
    document.getElementById('nv-replace-html').value = '';
    document.getElementById('nv-resize-width').value = '';
    document.getElementById('nv-resize-height').value = '';
    document.getElementById('nv-clone-count').value = '1';
    document.getElementById('nv-reorder-index').value = '0';
    document.getElementById('nv-move-x').value = '0';
    document.getElementById('nv-move-y').value = '0';
    document.getElementById('nv-attr-name').value = '';
    document.getElementById('nv-attr-value').value = '';
    document.getElementById('nv-class-add').value = '';
    document.getElementById('nv-class-remove').value = '';
    document.getElementById('nv-redirect-url').value = '';
    document.getElementById('nv-tooltip-text').value = '';
    document.getElementById('nv-placeholder-text').value = '';
    document.getElementById('nv-form-action-url').value = '';
    document.getElementById('nv-animation-name').value = '';
    document.getElementById('nv-animation-custom').value = '';
  }

  // ============================================
  // MODIFICATIONS LIST
  // ============================================
  function updateModList() {
    const list = document.getElementById('nv-mod-list');
    document.getElementById('nv-mod-count').textContent = modifications.length;
    
    const typeLabels = {
      css: '🎨 CSS',
      text: '✏️ Text',
      hide: '👁️ Hide',
      image: '🖼️ Image',
      link: '🔗 Link',
      insertHtml: '➕ HTML',
      replaceHtml: '🔄 HTML',
      resize: '📐 Resize',
      clone: '📋 Clone',
      reorder: '↕️ Reorder',
      move: '✋ Move',
      attribute: '⚙️ Attr',
      class: '🏷️ Class',
      clickRedirect: '🖱️ Click',
      tooltip: '💬 Tooltip',
      sticky: '📌 Sticky',
      placeholder: '📝 Placeholder',
      formAction: '📤 Form',
      animation: '✨ Anim'
    };
    
    list.innerHTML = modifications.map((mod, i) => `
      <div class="nv-mod-item">
        <span>${typeLabels[mod.type] || mod.type}: ${mod.selector.slice(0, 25)}...</span>
        <span class="nv-mod-delete" data-index="${i}">🗑</span>
      </div>
    `).join('');
    
    // Delete handlers with undo
    list.querySelectorAll('.nv-mod-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        const mod = modifications[idx];
        
        // Restore original state before removing
        if (mod) {
          restoreOriginalState(mod);
        }
        
        modifications.splice(idx, 1);
        updateModList();
      });
    });
  }

  // ============================================
  // SAVE
  // ============================================
  document.getElementById('nv-save').addEventListener('click', async () => {
    if (!modifications.length) {
      alert('No changes to save');
      return;
    }
    
    const btn = document.getElementById('nv-save');
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';
    
    try {
      const resp = await fetch(`${apiHost}/api/experiments/modifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          experimentId: experimentId,
          siteId: siteId,
          variantId: variantId,
          timestamp: timestamp,
          signature: signature,
          modifications: modifications
        })
      });
      
      if (resp.ok) {
        btn.textContent = '✅ Saved!';
        setTimeout(() => {
          btn.textContent = '💾 Save All Changes';
          btn.disabled = false;
        }, 2000);
      } else {
        const err = await resp.json();
        alert('Save failed: ' + (err.error || 'Unknown error'));
        btn.textContent = '💾 Save All Changes';
        btn.disabled = false;
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
      btn.textContent = '💾 Save All Changes';
      btn.disabled = false;
    }
  });

  // ============================================
  // CLOSE EDITOR
  // ============================================
  document.getElementById('nv-close').addEventListener('click', () => {
    if (modifications.length && !confirm('You have unsaved changes. Close anyway?')) {
      return;
    }
    // Remove editor params and reload
    const url = new URL(window.location);
    url.searchParams.delete('__navlens_editor');
    url.searchParams.delete('__variant');
    url.searchParams.delete('__ts');
    url.searchParams.delete('__sig');
    window.location.href = url.toString();
  });

  // Prevent clicks from propagating while dragging toolbar
  toolbar.addEventListener('mousedown', () => { isDragging = true; });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // ============================================
  // MODE TOGGLE (EDIT vs DRAG vs NAVIGATE)
  // ============================================
  window.navlensInteractionMode = 'edit'; // 'edit', 'drag', 'navigate'
  let draggedElement = null;
  let draggedSelector = null;
  
  function updateModeButtons(activeMode) {
    const modes = ['edit', 'drag', 'navigate'];
    modes.forEach(mode => {
      const btn = document.getElementById(`nv-mode-${mode}`);
      if (btn) {
        if (mode === activeMode) {
          btn.style.background = '#3b82f6';
          btn.style.color = 'white';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = '#9ca3af';
        }
      }
    });
    highlight.style.display = 'none';
  }
  
  document.getElementById('nv-mode-edit').addEventListener('click', () => {
    window.navlensInteractionMode = 'edit';
    updateModeButtons('edit');
    disableDragMode();
  });
  
  document.getElementById('nv-mode-drag').addEventListener('click', () => {
    window.navlensInteractionMode = 'drag';
    updateModeButtons('drag');
    enableDragMode();
  });
  
  document.getElementById('nv-mode-navigate').addEventListener('click', () => {
    window.navlensInteractionMode = 'navigate';
    updateModeButtons('navigate');
    disableDragMode();
  });
  
  // ============================================
  // DRAG MODE FUNCTIONS
  // ============================================
  function enableDragMode() {
    // Make all major elements draggable
    document.querySelectorAll('div, section, article, aside, header, footer, nav, main, p, h1, h2, h3, h4, h5, h6, ul, ol, li, a, button, img').forEach(el => {
      if (isEditorElement(el)) return;
      el.setAttribute('draggable', 'true');
      el.style.cursor = 'grab';
    });
    console.log('[navlens-editor] Drag mode enabled');
  }
  
  function disableDragMode() {
    document.querySelectorAll('[draggable="true"]').forEach(el => {
      if (isEditorElement(el)) return;
      el.removeAttribute('draggable');
      el.style.cursor = '';
    });
  }
  
  // Drag event handlers
  document.addEventListener('dragstart', (e) => {
    if (window.navlensInteractionMode !== 'drag' || isEditorElement(e.target)) return;
    
    draggedElement = e.target;
    draggedSelector = getSelector(draggedElement);
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    console.log('[navlens-editor] Dragging:', draggedSelector);
  });
  
  document.addEventListener('dragend', (e) => {
    if (window.navlensInteractionMode !== 'drag') return;
    e.target.style.opacity = '';
    draggedElement = null;
    // Remove drop indicators
    document.querySelectorAll('.nv-drop-indicator').forEach(el => el.remove());
  });
  
  document.addEventListener('dragover', (e) => {
    if (window.navlensInteractionMode !== 'drag' || !draggedElement) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Show drop indicator
    const target = e.target;
    
    // Invalid drop zones - never allow
    const invalidTags = ['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'IFRAME'];
    if (target === draggedElement || isEditorElement(target) || invalidTags.includes(target.tagName)) {
      document.querySelectorAll('.nv-drop-indicator').forEach(el => el.remove());
      return;
    }
    
    // Remove old indicators
    document.querySelectorAll('.nv-drop-indicator').forEach(el => el.remove());
    
    // Smart drop zone detection
    const dropZoneType = analyzeDropZone(target, draggedElement);
    
    // Determine indicator color based on drop zone quality
    // Green = great, Blue = good, Yellow = works, Red = probably bad
    const colors = {
      container: '#22c55e',   // Green - target is a container
      sibling: '#3b82f6',     // Blue - same parent
      similar: '#3b82f6',     // Blue - similar structure
      generic: '#eab308',     // Yellow - will work but might be odd
      risky: '#ef4444'        // Red - probably shouldn't
    };
    
    // Add new indicator
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    
    const indicator = document.createElement('div');
    indicator.className = 'nv-drop-indicator';
    indicator.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: 4px;
      background: ${colors[dropZoneType] || colors.generic};
      z-index: 10000;
      pointer-events: none;
      top: ${position === 'before' ? rect.top + window.scrollY : rect.bottom + window.scrollY}px;
      box-shadow: 0 0 6px ${colors[dropZoneType] || colors.generic};
    `;
    document.body.appendChild(indicator);
    target.dataset.nvDropPosition = position;
    target.dataset.nvDropType = dropZoneType;
  });
  
  // Analyze if target is a valid drop zone for the dragged element
  function analyzeDropZone(target, dragged) {
    const targetParent = target.parentNode;
    const draggedParent = dragged.parentNode;
    
    // Same parent = sibling move (always good)
    if (targetParent === draggedParent) {
      return 'sibling';
    }
    
    // Check if target is a container (could receive children)
    const targetStyle = window.getComputedStyle(target);
    const isContainer = (
      targetStyle.display === 'flex' ||
      targetStyle.display === 'grid' ||
      targetStyle.display === 'block' ||
      target.tagName === 'DIV' ||
      target.tagName === 'SECTION' ||
      target.tagName === 'MAIN' ||
      target.tagName === 'ARTICLE' ||
      target.tagName === 'UL' ||
      target.tagName === 'OL'
    );
    
    // Check if dragged element and target have similar structure
    const isSimilar = (
      target.tagName === dragged.tagName ||
      (target.className && dragged.className && 
       target.className.split(' ').some(c => dragged.className.includes(c)))
    );
    
    // Check if target's parent is similar to dragged's parent (moving between similar containers)
    const parentsSimilar = (
      targetParent && draggedParent &&
      (targetParent.tagName === draggedParent.tagName ||
       (targetParent.className && draggedParent.className &&
        targetParent.className.split(' ').some(c => draggedParent.className.includes(c))))
    );
    
    // Inline elements shouldn't receive block elements
    const draggedStyle = window.getComputedStyle(dragged);
    const isInlineTarget = ['inline', 'inline-block'].includes(targetStyle.display);
    const isBlockDragged = ['block', 'flex', 'grid'].includes(draggedStyle.display);
    if (isInlineTarget && isBlockDragged) {
      return 'risky';
    }
    
    // Score the drop zone
    if (isContainer && (isSimilar || parentsSimilar)) {
      return 'container';
    }
    if (isSimilar) {
      return 'similar';
    }
    if (isContainer) {
      return 'generic';
    }
    
    return 'generic';
  }
  
  document.addEventListener('drop', (e) => {
    if (window.navlensInteractionMode !== 'drag' || !draggedElement) return;
    e.preventDefault();
    
    const target = e.target;
    if (target === draggedElement || isEditorElement(target)) return;
    
    // Get drop info from dataset
    const position = target.dataset.nvDropPosition || 'after';
    const dropType = target.dataset.nvDropType || 'generic';
    delete target.dataset.nvDropPosition;
    delete target.dataset.nvDropType;
    
    // Clean up indicators
    document.querySelectorAll('.nv-drop-indicator').forEach(el => el.remove());
    
    // Allow all drops - smart system already shows quality with colors
    console.log(`[navlens-editor] Dropping with zone type: ${dropType}`);
    
    // Perform the move
    const parent = target.parentNode;
    if (position === 'before') {
      parent.insertBefore(draggedElement, target);
    } else {
      parent.insertBefore(draggedElement, target.nextSibling);
    }
    
    // Save as modification
    saveUndoState();
    const mod = {
      id: 'mod_' + Date.now(),
      variant_id: variantId || 'variant_0',
      selector: draggedSelector,
      type: 'dragMove',
      changes: {
        targetSelector: getSelector(target),
        position: position
      }
    };
    modifications.push(mod);
    updateModList();
    
    console.log('[navlens-editor] Moved element:', draggedSelector, position, 'target');
  });

  // ============================================
  // UNDO/REDO
  // ============================================
  const undoStack = [];
  const redoStack = [];
  
  function saveUndoState() {
    undoStack.push(JSON.parse(JSON.stringify(modifications)));
    redoStack.length = 0; // Clear redo on new action
    updateUndoRedoButtons();
  }
  
  function updateUndoRedoButtons() {
    document.getElementById('nv-undo').disabled = undoStack.length === 0;
    document.getElementById('nv-redo').disabled = redoStack.length === 0;
  }
  
  function undo() {
    if (undoStack.length === 0) return;
    
    // Store current state for redo
    redoStack.push(JSON.parse(JSON.stringify(modifications)));
    
    // Restore previous state
    const prevState = undoStack.pop();
    
    // Store in sessionStorage and refresh to apply clean state
    sessionStorage.setItem('nv-pending-mods', JSON.stringify(prevState));
    sessionStorage.setItem('nv-redo-stack', JSON.stringify(redoStack));
    sessionStorage.setItem('nv-undo-stack', JSON.stringify(undoStack));
    
    // Refresh page to get clean DOM and reapply only remaining mods
    location.reload();
  }
  
  function redo() {
    if (redoStack.length === 0) return;
    
    // Store current state for undo
    undoStack.push(JSON.parse(JSON.stringify(modifications)));
    
    // Get next state
    const nextState = redoStack.pop();
    
    // Store in sessionStorage and refresh
    sessionStorage.setItem('nv-pending-mods', JSON.stringify(nextState));
    sessionStorage.setItem('nv-redo-stack', JSON.stringify(redoStack));
    sessionStorage.setItem('nv-undo-stack', JSON.stringify(undoStack));
    
    location.reload();
  }
  
  // Restore undo/redo stacks from sessionStorage (after refresh)
  const pendingMods = sessionStorage.getItem('nv-pending-mods');
  if (pendingMods) {
    try {
      const restored = JSON.parse(pendingMods);
      modifications.length = 0;
      restored.forEach(m => modifications.push(m));
      updateModList();
      modifications.forEach(applyModification);
      
      // Restore stacks
      const storedUndo = sessionStorage.getItem('nv-undo-stack');
      const storedRedo = sessionStorage.getItem('nv-redo-stack');
      if (storedUndo) undoStack.push(...JSON.parse(storedUndo));
      if (storedRedo) redoStack.push(...JSON.parse(storedRedo));
      updateUndoRedoButtons();
      
      // Clear sessionStorage
      sessionStorage.removeItem('nv-pending-mods');
      sessionStorage.removeItem('nv-undo-stack');
      sessionStorage.removeItem('nv-redo-stack');
      
      console.log('[navlens-editor] Restored state after undo/redo');
    } catch (e) {
      console.warn('[navlens-editor] Failed to restore pending mods:', e);
    }
  }
  
  document.getElementById('nv-undo').addEventListener('click', undo);
  document.getElementById('nv-redo').addEventListener('click', redo);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
    }
  });
  
  // Hook into add modification to save undo state
  const origAddHandler = document.getElementById('nv-add-mod').onclick;
  document.getElementById('nv-add-mod').addEventListener('click', () => {
    saveUndoState();
  }, true);

  // ============================================
  // MINIMIZE/MAXIMIZE TOOLBAR
  // ============================================
  let isMinimized = false;
  
  // Create floating button for minimized state
  const floatingBtn = document.createElement('button');
  floatingBtn.id = 'nv-floating-btn';
  floatingBtn.innerHTML = '🧪';
  floatingBtn.title = 'Open Navlens Editor';
  floatingBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    z-index: 10002;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: none;
  `;
  overlay.appendChild(floatingBtn);
  
  document.getElementById('nv-minimize').addEventListener('click', () => {
    toolbar.style.display = 'none';
    floatingBtn.style.display = 'block';
    isMinimized = true;
  });
  
  floatingBtn.addEventListener('click', () => {
    toolbar.style.display = 'block';
    floatingBtn.style.display = 'none';
    isMinimized = false;
  });

  console.log('[navlens-editor] Visual editor loaded with 23 modification types + UX controls');
  }); // End of verifyAndLoadEditor().then()
})();
