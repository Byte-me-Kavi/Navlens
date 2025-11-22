# Heatmap Visualization Guide

## Overview

The heatmap viewer now provides three layers of visualization:

1. **Heatmap Blobs** - Shows click density with color gradients
2. **Element Highlights** - Traces and highlights actual DOM elements
3. **Click Point Markers** - Shows exact click positions

## Visual Layers

### Layer 1: DOM Snapshot (z-index: 1)

- Reconstructed webpage in iframe
- Base layer showing the original page structure

### Layer 2: Heatmap Blobs (z-index: 50)

- **Library**: heatmap.js
- **Purpose**: Shows click density with smooth color gradients
- **Configuration**:
  - Radius: 40px
  - Blur: 0.75 (smooth blending)
  - Gradient: Blue → Cyan → Green → Yellow → Orange → Red
  - Max Opacity: 80%

**Color Legend**:

- 🔵 **Blue/Cyan** (0-20%): Low activity
- 🟢 **Green** (20-40%): Moderate activity
- 🟡 **Yellow** (40-60%): Medium activity
- 🟠 **Orange** (60-80%): High activity
- 🔴 **Red** (80-100%): Maximum activity

### Layer 3: Element Highlights (z-index: 99)

- **Color**: Red border with red glow
- **Purpose**: Highlights actual DOM elements that received clicks
- **Features**:
  - 3px solid red border (`rgba(255, 50, 50, 0.9)`)
  - 15% red background overlay
  - Red glow effect (box-shadow)
  - Element label showing tag name and click count
  - Auto-finds elements using smart CSS selectors
  - **Smart Filtering**: Only highlights important clickable elements

**Important Elements Highlighted**:

- ✅ `BUTTON` - Interactive buttons
- ✅ `A` - Links and anchors
- ✅ `INPUT` - Form inputs
- ✅ `SELECT` - Dropdown menus
- ✅ `TEXTAREA` - Text areas
- ✅ `IMG` - Images
- ✅ `SVG` - SVG graphics
- ✅ `VIDEO` / `AUDIO` - Media elements
- ✅ `LABEL` - Form labels
- ✅ `FORM` - Form containers
- ✅ `NAV` / `HEADER` / `FOOTER` - Semantic landmarks
- ❌ Generic `DIV` / `SPAN` / `BODY` - Skipped to avoid highlighting entire page

**Element Tracing**:

1. Tracker.js captures `element_selector` using smart selector algorithm
2. ElementOverlay checks if element tag is in important elements list
3. If important, finds the element using `querySelector(selector)`
4. Creates red overlay box matching element dimensions
5. Adds red label with element info

### Layer 4: Click Point Markers (z-index: 102)

- **Color**: Darker blue circles
- **Purpose**: Shows exact click positions
- **Features**:
  - 40px circular markers at precise click coordinates
  - Darker blue styling (`rgba(0, 100, 200, 0.5)`) for better visibility
  - Click count badge with blue gradient (top-right corner)
  - Interactive tooltips on hover
  - Scale animation on hover (1.3x)

**Positioning**:

- Uses relative coordinates: `x_relative * documentWidth`
- Ensures accuracy across different viewport sizes
- Centered on actual click point

## Coordinate System

### Data Captured by tracker.js

```javascript
{
  x: 500,                    // Absolute pixel X
  y: 300,                    // Absolute pixel Y
  x_relative: 0.5,           // Relative X (0-1)
  y_relative: 0.3,           // Relative Y (0-1)
  document_width: 1000,      // Document width at capture
  document_height: 1000,     // Document height at capture
  element_selector: "BODY > DIV.container > BUTTON:nth-of-type(1)"
}
```

### Rendering Process

1. **Heatmap Blobs**: `x_relative * currentDocWidth`, `y_relative * currentDocHeight`
2. **Element Highlights**: Use `querySelector(element_selector)` → `getBoundingClientRect()`
3. **Click Markers**: `x_relative * currentDocWidth`, `y_relative * currentDocHeight`

## Color Coding

### Heatmap Blobs

- **Cold** (Blue/Cyan): Few clicks, low engagement
- **Warm** (Green/Yellow): Moderate clicks
- **Hot** (Orange/Red): Many clicks, high engagement

### Element Highlights

- **Red**: DOM elements that received clicks (buttons, links, images, etc.)
- Shows element boundaries precisely
- Only highlights important clickable elements

### Click Markers

- **Darker Blue**: Exact click positions with better visibility
- Badge shows number of clicks at that point

## Interaction Features

### Hover Effects

**Click Markers**:

- Tooltip appears showing:
  - Click count and percentage
  - Element tag and text content
  - Precise coordinates
- Circle scales to 1.3x
- Enhanced glow effect

### Click Actions

- Clicking any marker opens ElementAnalysisModal
- Shows detailed click analytics for that element
- Displays element properties and metrics

## Scroll Synchronization

All layers synchronize with iframe scroll:

- Uses `translate3d` for GPU acceleration
- `requestAnimationFrame` for smooth 60fps
- Both heatmap canvas and overlays move together

## Performance Optimizations

1. **Hardware Acceleration**: `willChange: transform`, `translate3d`
2. **Throttled Events**: Scroll sync at 60fps
3. **Lazy Rendering**: Only renders when iframe ready
4. **Batch Updates**: ResizeObserver prevents unnecessary re-renders

## Smart Selector Algorithm

Tracker.js uses a hierarchical selector strategy:

1. **ID**: `#button-submit` (highest priority)
2. **Classes**: `DIV.container.main`
3. **Position**: `:nth-of-type(2)` for siblings
4. **Path**: Full DOM path from BODY

Example: `BODY > DIV.header > NAV > BUTTON.primary:nth-of-type(1)`

## Visual Examples

### Low Activity Page

```
🔵🔵🔵 Blue/cyan heatmap
### Low Activity Page

```

🔵🔵🔵 Blue/cyan heatmap
🔴 Few red element highlights (buttons/links only)
🔵 Scattered darker blue click markers

```

### High Activity Page

```

🔴🔴🔴 Red/orange heatmap clusters
🔴🔴🔴 Many red element highlights (interactive elements)
🔵🔵🔵 Dense darker blue click markers

```

## Implementation Details

### Files Modified

1. **ElementOverlay.tsx**

   - Added smart element filtering (only buttons, links, images, etc.)
   - Red borders for clicked element highlights
   - Darker blue circles for click point markers
   - Enhanced hover effects with blue theme

2. **HeatmapCanvas.tsx**

   - z-index: 50 (below overlays)
   - Renders heatmap blobs

3. **heatmap.types.ts**

   - Enhanced gradient configuration
   - Larger radius (40px) for better visibility
   - More blur (0.75) for smooth blending

4. **SnapshotViewer.tsx**
   - Proper layer ordering
   - ScrollSync coordination

## Usage Tips

1. **Finding Hot Spots**: Look for red/orange heatmap areas
2. **Element Analysis**: Hover over darker blue circles for details
3. **Element Boundaries**: Red borders show clicked interactive elements
4. **Click Density**: Blue badge numbers show exact click counts
5. **Navigation**: All overlays scroll with the page content
6. **Element Filtering**: Only important elements (buttons, links, images) are highlighted to avoid clutter

## Troubleshooting

### Overlays Not Showing

- Check if iframe document is loaded
- Verify x_relative/y_relative data exists
- Check browser console for errors

### Heatmap Not Visible

- Ensure heatmapPoints data is populated
- Check z-index layering (should be 50)
- Verify canvas dimensions match content

### Element Highlights Missing

- Check if element_selector is captured by tracker.js
- Verify DOM elements exist in snapshot
- Check querySelector compatibility

## Future Enhancements

- [ ] Toggle individual layers on/off
- [ ] Adjust heatmap intensity slider
- [ ] Export heatmap as image
- [ ] Color-blind friendly modes
- [ ] Click path visualization (connecting clicks)
- [ ] Time-based playback animation
```
