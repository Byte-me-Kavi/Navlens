# Image Loading Fix for Reconstructed DOM

## Issue

Images in the reconstructed DOM (inside the iframe) were failing to load, displaying only alt text.
Console logs showed `❌ Image failed to load` errors for URLs pointing to `_next/image`.

## Root Cause Analysis

1.  **Next.js Image Optimization**: The `rrweb` snapshot captures `img` tags with `src` pointing to the Next.js optimized image endpoint (`/_next/image?...`).
2.  **Cross-Origin/Environment Issues**: When these URLs are accessed from within a sandboxed iframe (or a different origin like localhost), the Next.js image optimizer might fail or reject the request, or the browser might block it due to strict security policies.
3.  **Lazy Loading**: Next.js images use `loading="lazy"` and `srcset`, which can behave unpredictably in a reconstructed iframe environment where the viewport context is different.

## Fix Implementation

Modified `components/DomHeatmapViewer.tsx` to apply the following fixes to all `img` elements in the reconstructed DOM:

1.  **Bypass Next.js Optimization**:

    - Detects if an image `src` is a Next.js optimized URL (`/_next/image?url=...`).
    - Extracts the original image URL from the `url` query parameter.
    - Reconstructs the absolute URL to the original asset (e.g., `https://site.com/images/logo.png`).
    - Replaces the `src` with this direct URL, bypassing the optimization layer.

2.  **Network & Loading Attributes**:

    - Sets `loading="eager"` to force immediate loading.
    - Removes `decoding` attribute.
    - Sets `referrerpolicy="no-referrer"` to prevent the source server from blocking requests based on the iframe's referrer.
    - Removes `srcset` to prevent the browser from trying to load other optimized variants.

3.  **Style Cleanup**:
    - Removes `color: transparent` style which Next.js applies while the image is "loading" (which causes it to be invisible if the load event never triggers correctly).

## Verification

Check the console logs for:

- `🔄 Attempting to bypass Next.js optimization for image...`
- `✅ Image loaded successfully`
