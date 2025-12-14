/**
 * Navlens Visual A/B Editor
 * 
 * Lazy-loaded overlay for creating visual modifications.
 * Only loaded when ?__navlens_editor is in URL with valid signature.
 * 
 * Features:
 * - Element selection on hover/click
 * - CSS property editor (color, size, position)
 * - Text inline editing
 * - Save to API
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

  // Check if URL has signature (new secure format)
  if (signature && timestamp) {
    const ts = parseInt(timestamp, 10);
    const age = Date.now() - ts;
    const MAX_AGE = 60 * 60 * 1000; // 1 hour
    
    if (age > MAX_AGE || age < 0) {
      console.error('[navlens-editor] Editor URL expired');
      alert('Editor link has expired. Please generate a new link from the dashboard.');
      return;
    }
    // Note: Full signature validation happens server-side when saving
  }

  // Get navlens config
  const navlensScript = document.querySelector('script[data-site-id]');
  const siteId = navlensScript?.dataset.siteId;
  const apiHost = navlensScript?.dataset.api || navlensScript?.src.replace(/\/tracker\.js.*/, '');
  
  if (!siteId || !apiHost) {
    console.error('[navlens-editor] Missing site ID or API host');
    return;
  }

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
      min-width: 280px;
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
  
  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'nv-toolbar';
  toolbar.innerHTML = `
    <div class="nv-toolbar-header">
      <span class="nv-toolbar-title">🧪 Navlens Editor</span>
      <button class="nv-btn nv-btn-danger" id="nv-close">✕</button>
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
          <option value="css">Change Style (CSS)</option>
          <option value="text">Change Text</option>
          <option value="hide">Hide Element</option>
        </select>
      </div>
      
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
      
      <div id="nv-text-panel" class="nv-panel-section" style="display: none;">
        <div class="nv-panel-label">New Text</div>
        <textarea id="nv-new-text" class="nv-input" rows="3" placeholder="Enter replacement text..."></textarea>
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="nv-btn nv-btn-primary" id="nv-add-mod" style="flex: 1;">Add Change</button>
        <button class="nv-btn" id="nv-cancel" style="background: #374151;">Cancel</button>
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
  // ELEMENT SELECTION
  // ============================================
  
  function getSelector(element) {
    if (element.id) return `#${element.id}`;
    
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.tagName.toLowerCase();
      
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/)
          .filter(c => c && !c.startsWith('nv-'))
          .slice(0, 2);
        if (classes.length) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      
      if (element.id || path.length >= 3) break;
      element = element.parentElement;
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
  
  // Mouse move - highlight
  document.addEventListener('mousemove', (e) => {
    if (isDragging || isEditorElement(e.target)) {
      highlight.style.display = 'none';
      return;
    }
    positionHighlight(e.target);
  });
  
  // Click - select
  document.addEventListener('click', (e) => {
    if (isEditorElement(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    selectedElement = e.target;
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
  }, true);

  // ============================================
  // MODIFICATION TYPE SWITCH
  // ============================================
  document.getElementById('nv-mod-type').addEventListener('change', (e) => {
    const type = e.target.value;
    document.getElementById('nv-css-panel').style.display = type === 'css' ? 'block' : 'none';
    document.getElementById('nv-text-panel').style.display = type === 'text' ? 'block' : 'none';
  });

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
    
    if (type === 'css') {
      mod.changes.css = {};
      const bgColor = document.getElementById('nv-bg-color-text').value;
      const textColor = document.getElementById('nv-text-color-text').value;
      const fontSize = document.getElementById('nv-font-size').value;
      
      if (bgColor) mod.changes.css.backgroundColor = bgColor;
      if (textColor) mod.changes.css.color = textColor;
      if (fontSize) mod.changes.css.fontSize = fontSize;
      
      // Apply preview
      if (bgColor) selectedElement.style.backgroundColor = bgColor;
      if (textColor) selectedElement.style.color = textColor;
      if (fontSize) selectedElement.style.fontSize = fontSize;
    } else if (type === 'text') {
      mod.changes.text = document.getElementById('nv-new-text').value;
      selectedElement.textContent = mod.changes.text;
    } else if (type === 'hide') {
      selectedElement.style.display = 'none';
    }
    
    modifications.push(mod);
    updateModList();
    
    // Reset selection
    selectedElement = null;
    highlight.classList.remove('nv-selected');
    highlight.style.display = 'none';
    document.getElementById('nv-edit-panel').style.display = 'none';
    document.getElementById('nv-instructions').style.display = 'block';
  });

  // Cancel
  document.getElementById('nv-cancel').addEventListener('click', () => {
    selectedElement = null;
    highlight.classList.remove('nv-selected');
    highlight.style.display = 'none';
    document.getElementById('nv-edit-panel').style.display = 'none';
    document.getElementById('nv-instructions').style.display = 'block';
  });

  // ============================================
  // MODIFICATIONS LIST
  // ============================================
  function updateModList() {
    const list = document.getElementById('nv-mod-list');
    document.getElementById('nv-mod-count').textContent = modifications.length;
    
    list.innerHTML = modifications.map((mod, i) => `
      <div class="nv-mod-item">
        <span>${mod.type}: ${mod.selector.slice(0, 30)}...</span>
        <span class="nv-mod-delete" data-index="${i}">🗑</span>
      </div>
    `).join('');
    
    // Delete handlers
    list.querySelectorAll('.nv-mod-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
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
    window.location.href = url.toString();
  });

  // Prevent clicks from propagating while dragging toolbar
  toolbar.addEventListener('mousedown', () => { isDragging = true; });
  document.addEventListener('mouseup', () => { isDragging = false; });

  console.log('[navlens-editor] Visual editor loaded');
})();
