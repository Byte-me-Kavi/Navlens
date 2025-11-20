# DOM Reconstruction Console Errors - Root Cause Analysis

## Problems Identified

### 1. ❌ Failed to Load CSS (404 Error)

**Error:**

```
e491d783038ba558.css:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Root Cause:**
The snapshot HTML contains `<link>` tags with external stylesheets that are being included in the DOM reconstruction. These are relative or absolute URLs that:

- Point to resources on the **original website** (not your heatmap viewer)
- Are being loaded in the **iframe** context
- The browser tries to fetch them but they return 404 because:
  - The URLs are relative to the original domain (e.g., `/_next/static/...`)
  - The iframe is on YOUR domain (heatmap viewer)
  - The original website's assets aren't available

**Why It Happens:**

```
Snapshot HTML contains:
  <link href="/_next/static/chunks/e491d783038ba558.css" rel="stylesheet">

Browser tries to load:
  https://navlens-git-v2-dom-recreation-kavishas-projects-947ef8e4.vercel.app/_next/static/...

Should be loading:
  https://example-tracked-website.com/_next/static/...
```

**Impact:** ⚠️ MEDIUM - CSS doesn't load, but the page structure renders. Styling just won't display.

---

### 2. ❌ Iframe Body HTML: undefined

**Error:**

```
console.log("Iframe body HTML:", doc.body?.innerHTML.substring(0, 500));
// Output: undefined
```

**Root Cause:**
The `doc.body?.innerHTML.substring(0, 500)` call tries to get a substring of potentially undefined:

- `doc.body` might exist but is empty initially after `doc.write(htmlContent)`
- OR `doc.body?.innerHTML` might be null/undefined
- When calling `.substring()` on undefined, it fails silently

**Code Issue:**

```typescript
console.log(
  "Iframe body HTML:",
  doc.body?.innerHTML.substring(0, 500) // ❌ Can't call substring on undefined
);
```

**Why It's Undefined:**

- After `doc.write()` and `doc.close()`, the iframe document is still being parsed
- `doc.body` might not be fully initialized yet
- The content hasn't been rendered to the DOM yet

**Fix:**

```typescript
console.log(
  "Iframe body HTML:",
  doc.body?.innerHTML ? doc.body.innerHTML.substring(0, 500) : "Body not ready"
);
```

**Impact:** ⚠️ LOW - Just a logging issue, doesn't affect functionality.

---

### 3. ❌ SCRIPT_PLACEHOLDER is not defined

**Error:**

```
Uncaught ReferenceError: SCRIPT_PLACEHOLDER is not defined
    at heatmap-viewer:1:105962
```

**Root Cause:**
`SCRIPT_PLACEHOLDER` appears **6 times** in the console. This is coming from the **snapshot HTML itself**, not our code.

**Why:**

1. The tracked website contains JavaScript code with `SCRIPT_PLACEHOLDER` as a variable
2. When the snapshot is captured, **scripts are included in the HTML** (rrweb captures `<script>` tags)
3. When the iframe loads the HTML, it parses and executes the scripts
4. The scripts reference `SCRIPT_PLACEHOLDER` which doesn't exist in the iframe context
5. Error occurs

**Proof in Snapshot:**
The "HTML preview" shows Next.js Tailwind CSS initialization code - this is legitimate snapshot content. Somewhere in that HTML are script tags that reference undefined variables.

**Impact:** ⚠️ MEDIUM - Scripts from original page fail, but don't crash the heatmap overlay.

---

### 4. ❌ Cannot use 'in' operator to search for 'attachShadow' in null

**Error:**

```
VM675 feedback.js:1 Uncaught TypeError: Cannot use 'in' operator to search for 'attachShadow' in null
```

**Root Cause:**
Some library (feedback.js) is trying to detect browser capabilities by checking if certain properties exist in an object. It's checking:

```javascript
if ('attachShadow' in window.document.documentElement) { ... }
```

But the object is `null` instead of the expected DOM element.

**Why:**

1. `feedback.js` is running in the main page context (not iframe)
2. It's trying to check for Shadow DOM support
3. For some reason, `document.documentElement` is returning null
4. This happens rarely and indicates a timing issue

**Impact:** ⚠️ LOW - Only affects feedback functionality, not heatmap core.

---

## Summary of Issues

| Issue               | Severity | Impact                        | Root Cause                                                      |
| ------------------- | -------- | ----------------------------- | --------------------------------------------------------------- |
| CSS 404 Errors      | MEDIUM   | Styling not applied to iframe | External stylesheets loaded with relative URLs in wrong context |
| Body HTML undefined | LOW      | Logging issue only            | Timing issue, body not ready when logged                        |
| SCRIPT_PLACEHOLDER  | MEDIUM   | Scripts fail silently         | Original website scripts executed in iframe                     |
| attachShadow null   | LOW      | Feedback lib error            | Timing/initialization issue                                     |

---

## Real Issue: What's Actually Broken?

Looking at the console output more carefully:

✅ **WORKING:**

- DOM reconstruction completed successfully
- HTML content captured (107,623 bytes)
- Heatmap instance created
- Page renders in iframe

❌ **NOT WORKING:**

- External CSS not loading (404)
- Original website scripts try to execute (SCRIPT_PLACEHOLDER errors)
- Some timing issues with DOM access

---

## The Core Problem

### Flaw in Our Implementation: We're Including Script Tags and External CSS References

**Current Flow:**

1. ✅ Tracker captures snapshot (includes scripts and external CSS links)
2. ✅ Tracker captures CSS content (inline and external URLs)
3. ✅ API stores both
4. ❌ **We apply BOTH:**
   - The original HTML (which has `<link>` tags and `<script>` tags)
   - PLUS we try to apply the extracted CSS separately

**The Problem:**

- The original HTML already contains `<link href="...">` tags
- We're trying to load these same stylesheets when the iframe reconstructs
- The URLs are relative to the original website
- The iframe is on a different domain
- Result: 404 errors

**Plus:**

- The HTML also contains `<script>` tags from the original website
- When iframe executes these scripts, they fail because they expect the original page context
- Variables like `SCRIPT_PLACEHOLDER`, `window.next`, etc. don't exist

---

## Solution Strategy

### Option 1: Remove External Script Tags (RECOMMENDED)

Strip out all `<script>` tags from the snapshot during reconstruction:

```typescript
const nodeToHTML = (sn: SnapshotNode): string => {
  // ...
  if (sn.type === 2) {
    // Element node
    // ❌ Skip script tags
    if (sn.tagName?.toLowerCase() === "script") {
      return ""; // Don't include scripts
    }
    // ... rest of code
  }
};
```

**Impact:**

- ✅ Eliminates SCRIPT_PLACEHOLDER errors
- ✅ Cleans up the DOM
- ⚠️ Removes event tracking scripts (okay for heatmap view)
- ✅ Fixes 6 console errors

---

### Option 2: Handle External Stylesheets with CORS Proxy

When applying external CSS, use a CORS proxy:

```typescript
else if (styleObj.type === "external" && styleObj.href) {
  const linkTag = doc.createElement("link");
  linkTag.rel = "stylesheet";
  // ✅ Use a CORS proxy or absolute URL
  linkTag.href = `https://api.allorigins.win/raw?url=${encodeURIComponent(styleObj.href)}`;
  doc.head?.appendChild(linkTag);
}
```

**Impact:**

- ✅ External stylesheets might load
- ⚠️ Adds third-party dependency
- ⚠️ May have latency/reliability issues
- ✅ Fixes CSS 404 errors

---

### Option 3: Remove External Links and Keep Only Inline Styles (SIMPLEST)

Strip out external `<link>` tags, keep only inline CSS:

```typescript
// Skip external stylesheet links
if (sn.tagName?.toLowerCase() === "link") {
  return ""; // Don't include links
}
```

Then only apply inline CSS from the captured styles.

**Impact:**

- ✅ Eliminates 404 errors
- ✅ Simplest implementation
- ⚠️ Only keeps captured inline styles
- ✅ Fixes primary CSS error

---

## Recommended Fix: Combination of Options 1 & 3

**Implement Both:**

1. Skip `<script>` tags during DOM reconstruction
2. Skip `<link>` tags during DOM reconstruction
3. Apply only inline CSS from captured styles

**Why:**

- Eliminates external resource loading issues
- Removes script execution errors
- Keeps the snapshot clean and focused
- Only uses CSS we explicitly captured and stored

**Implementation:**

```typescript
const nodeToHTML = (sn: SnapshotNode): string => {
  // ...
  if (sn.type === 2) {
    // Element node
    // ❌ Skip problematic tags
    const tagName = sn.tagName?.toLowerCase();
    if (tagName === "script" || tagName === "link") {
      return ""; // Don't include scripts or external links
    }
    // ... continue with rest of code
  }
};
```

---

## Why These Errors Weren't Caught Before

1. **CSS 404s**: Expected behavior with relative URLs in iframe - standard CORS/domain issue
2. **Script errors**: Original website scripts run because snapshot includes them - not obvious until tested
3. **Body HTML undefined**: Timing issue, only shows up in logs, doesn't break functionality
4. **attachShadow null**: Edge case, rare occurrence

These are all **expected side effects** of reconstructing an entire website snapshot in an iframe without proper isolation.

---

## Action Items

- [ ] Modify `nodeToHTML()` to skip `<script>` and `<link>` tags
- [ ] Test with new implementation
- [ ] Verify console errors are gone
- [ ] Check that heatmap still renders correctly
- [ ] Verify CSS from `styles` array is properly applied
- [ ] Check that page structure is visible even without external CSS
