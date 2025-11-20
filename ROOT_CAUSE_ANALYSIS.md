# CSS Not Applied in iFrame - Root Cause Analysis

## Problem Summary

The iframe displays HTML content but CSS styling is not applied. Only the raw HTML structure is visible.

## Root Cause: CSS is Being Lost Between Capture and Reconstruction

### 1. **Snapshot Capture Issue (tracker.js, lines 409-445)**

```javascript
const snap = rrwebSnapshot.snapshot(document);
```

**Problem**: The `rrweb-snapshot` library captures only **structural DOM nodes**, not CSS:

- ✅ Captures: HTML elements (div, p, span, etc.)
- ✅ Captures: Inline styles via `attributes.style`
- ❌ Does NOT Capture: `<style>` tags in the `<head>`
- ❌ Does NOT Capture: External `<link>` stylesheets
- ❌ Does NOT Capture: CSS computed from external files

When rrwebSnapshot.snapshot() is called, it creates a lean snapshot optimized for session replay, **not for styling reproduction**.

---

### 2. **HTML Reconstruction Issue (DomHeatmapViewer.tsx, lines 130-220)**

The reconstruction process has **three critical flaws**:

#### Flaw A: CSS Content Not Being Extracted

```typescript
const nodeToHTML = (sn: SnapshotNode): string => {
  if (sn.type === 2) {
    // Element node
    let html = `<${sn.tagName}`;

    // Adds attributes (including inline style)
    if (sn.attributes) {
      Object.entries(sn.attributes).forEach(([key, value]) => {
        html += ` ${key}="${escaped}"`; // ✅ Sets style="" attributes
      });
    }
    // ...
  }
};
```

**The Problem**:

- Even though inline `style` attributes are added, **CSS rules from `<style>` tags are lost**
- The snapshot doesn't contain the actual `<style>` tag content because rrweb captures it as a comment or reference, not the full CSS

#### Flaw B: Doc.write() Overwrites CSS After Injection

```typescript
// Write HTML to document
doc.open();
doc.write(htmlContent);
doc.close();

// Inject default styles AFTER writing
const style = doc.createElement("style");
style.textContent = `...`;
doc.head?.appendChild(style); // ← Only adds margin/padding reset
```

**The Problem**:

- After `doc.write()` and `doc.close()`, any CSS from the original `<style>` tags is already gone
- The injected default style only adds **box-sizing and margin/padding resets**
- It doesn't restore the **actual page styling** (colors, fonts, layouts, etc.)

#### Flaw C: No Source Map for Original CSS

The snapshot doesn't include:

- Reference to external CSS files (href links)
- Original `<style>` tag content as separate nodes
- CSS rules needed for styling

---

### 3. **Data Flow Breakdown**

```
[Original Website with CSS]
         ↓
[rrweb-snapshot.snapshot(document)]
         ↓
[Snapshot object - MISSING: <style> tags, external CSS]
         ↓
[Stored in Supabase snapshots bucket]
         ↓
[Fetched by DomHeatmapViewer]
         ↓
[Reconstructed via doc.write()]
         ↓
[HTML-only iframe with no styling]
         ❌ CSS Lost at Step 2!
```

---

## Why This Happens

**rrweb-snapshot Design Philosophy:**

- rrweb is built for **session replay with video-like playback**
- It captures DOM **mutations and interactions**, not styling
- It optimizes for **file size and speed**, not fidelity
- It assumes CSS can be **re-fetched from original site** during replay

**When you try to reconstruct a snapshot:**

1. The original CSS files are still accessible from the original site
2. But when viewed in isolation, the CSS is missing
3. The iframe doesn't have access to the original stylesheets

---

## Solution Options

### Option 1: Capture CSS During Snapshot (RECOMMENDED)

Modify tracker.js to capture CSS:

```javascript
function captureSnapshotForDevice(deviceType) {
  const snap = rrwebSnapshot.snapshot(document);

  // Extract all CSS
  const styles = [];

  // Collect <style> tags
  document.querySelectorAll("style").forEach((style) => {
    styles.push({
      type: "inline",
      content: style.textContent,
    });
  });

  // Collect <link> stylesheets
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styles.push({
      type: "external",
      href: link.href,
    });
  });

  const payload = {
    site_id: SITE_ID,
    snapshot: snap,
    styles: styles, // ← Add this
    // ...
  };

  fetch(SNAPSHOT_ENDPOINT, {
    /* ... */
  });
}
```

### Option 2: Inject CSS from Original Site

Modify DomHeatmapViewer.tsx to fetch CSS:

```typescript
// Fetch original HTML to extract CSS
const htmlResponse = await fetch(page_url);
const html = await htmlResponse.text();
const parser = new DOMParser();
const doc = parser.parseFromString(html, "text/html");

// Extract all styles
const cssRules = Array.from(doc.querySelectorAll("style"))
  .map((s) => s.textContent)
  .join("\n");

// Apply to iframe
const style = iframeDoc.createElement("style");
style.textContent = cssRules;
iframeDoc.head.appendChild(style);
```

### Option 3: Use rrweb Replayer (Alternative)

Instead of manual reconstruction, use rrweb's built-in Replayer:

```typescript
import { Replayer } from "rrweb";

const replayer = new Replayer(events, {
  root: containerElement,
  triggerFocus: false,
  autoPlay: false,
});
replayer.pause();
```

This would maintain CSS because Replayer reconstructs the original styling.

---

## Files Involved

1. **tracker.js** (line 409): `rrwebSnapshot.snapshot()` - Captures snapshot WITHOUT CSS
2. **DomHeatmapViewer.tsx** (line 220): `doc.write(htmlContent)` - Writes HTML-only
3. **DomHeatmapViewer.tsx** (line 227): Default style injection - Only adds resets, not original CSS

---

## Current Status

✅ HTML structure is correctly reconstructed  
❌ CSS styling is completely lost in snapshot capture phase  
⚠️ Default styles injected don't replace lost CSS
