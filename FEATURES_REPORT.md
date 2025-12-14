# Navlens Heatmap Application - Complete Features Report

**Generated:** December 14, 2025  
**Version:** 2.1.0  
**Architecture:** Feature-based modular architecture with SOLID principles

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Client-Side Tracking (tracker.js)](#client-side-tracking)
3. [Core Analytics Features](#core-analytics-features)
4. [Advanced Features](#advanced-features)
5. [Dashboard & UI](#dashboard--ui)
6. [API Endpoints](#api-endpoints)
7. [Data Storage](#data-storage)
8. [Security & Performance](#security--performance)

---

## Architecture Overview

### Technology Stack

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (26+ endpoints)
- **Analytics Database:** ClickHouse (time-series events)
- **Application Database:** Supabase (PostgreSQL with RLS)
- **Session Recording:** rrweb library
- **Visualization:** heatmap.js, D3.js, d3-sankey

### Project Structure

```
heatmap-app/
├── app/api/              # 26+ API route handlers
├── features/             # 9 modular feature packages
├── components/           # Shared UI components
├── lib/                  # Core utilities (auth, ClickHouse, encryption)
├── public/tracker.js     # Client-side tracking script (4585 lines)
└── supabase/            # Database schemas
```

### Data Flow

```
User's Website → tracker.js → API Endpoints → ClickHouse/Supabase → Dashboard
```

---

## Client-Side Tracking

### Overview

The `tracker.js` script (4585 lines) is embedded on client websites and captures all user behavior in real-time.

### Installation

```html
<script
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-key="YOUR_API_KEY"
></script>
```

### 1. Session Management

**How It Works:**

- Generates unique `session_id` and `visitor_id` on first visit
- 30-minute timeout with automatic renewal
- Persisted in localStorage for cross-page tracking
- Updates `lastActivity` on every interaction

**Session Logic:**

```javascript
// Checks if session expired
if (now - lastActivity > 30 * 60 * 1000) {
  // Create new session
  session_id = generateUUID();
}
```

**Data Stored:**

- `session_id`: Unique session identifier
- `visitor_id`: Persistent user identifier
- `lastActivity`: Timestamp of last interaction
- Session context: referrer, landing page, UTM parameters

---

### 2. Click Tracking

**Comprehensive Click Data Capture:**

| Data Point               | Description                      |
| ------------------------ | -------------------------------- |
| `x, y`                   | Absolute page coordinates        |
| `x_relative, y_relative` | Percentage-based coordinates     |
| `element_selector`       | Full CSS selector path           |
| `element_tag`            | HTML tag name                    |
| `element_id`             | Element ID attribute             |
| `element_classes`        | Space-separated class list       |
| `element_text`           | Visible text content             |
| `element_href`           | Link URL (for <a> tags)          |
| `is_interactive`         | Boolean - clickable element      |
| `is_dead_click`          | Boolean - click had no effect    |
| `click_count`            | Click counter for rage detection |

**Dead Click Detection:**
Uses MutationObserver to detect clicks with no response:

```javascript
// Flow:
Click Event
  → Start MutationObserver
  → Wait 300ms for DOM changes
  → If no changes AND element not interactive
    → Mark as is_dead_click=true
    → Send event
```

**Interactive Elements:**

- Links (`<a>`)
- Buttons (`<button>`)
- Inputs, selects, textareas
- Elements with onclick handlers
- Elements with cursor:pointer

---

### 3. Scroll Tracking

**Scroll Depth Monitoring:**

- Tracks maximum scroll depth as percentage (0-100%)
- Calculates `document_height` and `viewport_height`
- Debounced to prevent excessive events (250ms)

**Confusion Scroll Detection:**

Identifies frustrated scrolling behavior:

```javascript
// Configuration
CONFUSION_THRESHOLD: 5              // Direction changes required
TIME_WINDOW_MS: 2000                // Detection window

// Algorithm:
Monitor scroll direction changes (up/down)
If ≥5 direction changes within 2 seconds
  → Calculate confusion_score (0-1)
  → Send event with type='confusion_scroll'
```

**Confusion Score Calculation:**

- Based on rapid direction changes
- Number of changes / threshold
- Clamped between 0-1

---

### 4. Mouse Movement & Hover Tracking

**Attention Heatmap Generation:**

Tracks mouse position to build attention maps:

| Feature              | Configuration               |
| -------------------- | --------------------------- |
| Sampling Rate        | Every 50ms                  |
| Minimum Dwell Time   | 500ms to count as attention |
| Path Simplification  | Douglas-Peucker algorithm   |
| Max Points per Batch | 500 points                  |

**Attention Zones:**

Automatically categorizes mouse attention:

- `heading`: h1-h6 tags
- `content`: p, div, article, section
- `interactive`: buttons, links, inputs
- `media`: img, video, canvas, svg
- `navigation`: nav, header, footer
- `form`: form, input, textarea, select

**Hover Tracking:**

```javascript
// Measures dwell time on each element
hover_duration_ms: Time spent hovering
attention_zone: Classified element type
cursor_path_distance: Total pixels traveled
cursor_direction_changes: Direction change count
```

---

### 5. Session Recording (rrweb)

**Full Session Replay:**

Uses rrweb library for pixel-perfect session playback:

```javascript
rrweb.record({
  sampling: {
    mousemove: 50, // Sample mouse every 50ms
    mouseInteraction: true, // Capture all interactions
    scroll: 150, // Sample scroll every 150ms
    input: "last", // Only record final input value
  },
  maskAllInputs: true, // Privacy: mask sensitive fields
  blockClass: "rr-block", // Block elements with this class
  ignoreClass: "rr-ignore", // Ignore elements with this class
});
```

**Buffer Management:**

- Max 100 events per batch
- Auto-flush every 10 seconds
- Throttled to prevent flooding (min 5s between flushes)
- Queues events if API fails, retries later

**Privacy Protection:**

- All password fields masked
- Credit card inputs masked
- Email/phone patterns detected and masked
- Custom mask classes supported

---

### 6. DOM Snapshot Capture

**Automated Page Structure Capture:**

Captures complete page DOM for heatmap overlay:

| Device Type | Width  | Height | Use Case         |
| ----------- | ------ | ------ | ---------------- |
| Mobile      | 375px  | 667px  | iPhone viewport  |
| Tablet      | 768px  | 1024px | iPad viewport    |
| Desktop     | 1440px | 900px  | Standard desktop |

**Hash-Based Change Detection:**

```javascript
// Algorithm:
Generate DOM hash using djb2 algorithm
Check every 30 minutes for changes
If hash changed:
  → Re-capture snapshot
  → Send to API
  → Update local hash
```

**Snapshot Data:**

- Complete HTML structure (rrweb-snapshot format)
- Applied CSS styles
- Element positioning
- Viewport dimensions
- Timestamp of capture

---

### 7. Form Analytics

**Comprehensive Form Tracking:**

Tracks every form interaction:

| Event Type         | Trigger              | Data Captured                |
| ------------------ | -------------------- | ---------------------------- |
| `form_field_focus` | Field entry          | Field name, timestamp        |
| `form_field_blur`  | Field exit           | Time spent, changes, refills |
| `form_submit`      | Form submission      | Success status, total time   |
| `form_abandon`     | Leave without submit | Completion percentage        |

**Refill Detection:**

Identifies when users retype content:

```javascript
// Logic:
Track original field length on blur
If user deletes >50% of content
AND then retypes
  → Mark as was_refilled=true
  → Increment refill_count
```

**Metrics Calculated:**

- Field completion rate
- Average time per field
- Refill rate (friction indicator)
- Drop-off points
- Overall form completion rate

---

### 8. Developer Tools Data

**Debug Information Capture:**

For troubleshooting user issues:

**Console Logs:**

```javascript
// Captured levels:
-log, warn, error, info, debug;
// Limits: Max 100 events
// Sanitized: PII scrubbed automatically
```

**Network Requests:**

```javascript
// Monitors:
- fetch() calls
- XMLHttpRequest
// Captures:
- URL, method, status, duration
// Limits: Max 200 events
```

**Web Vitals:**

- LCP (Largest Contentful Paint)
- FCP (First Contentful Paint)
- CLS (Cumulative Layout Shift)
- INP (Interaction to Next Paint)
- TTFB (Time to First Byte)

---

### 9. A/B Testing / Experiments Engine

**Client-Side Visual Testing:**

Runs A/B tests without code deployment:

**Configuration Loading:**

```javascript
// Loads from API on page load
GET /api/experiments/config?siteId=xxx
// Returns active experiments with modifications
```

**Bucketing Algorithm:**

Deterministic user assignment using FNV-1a hash:

```javascript
function getBucketForVisitor(visitorId, experimentId, totalVariants) {
  const key = `${visitorId}-${experimentId}`;
  const hash = fnv1aHash(key); // Fast hash function
  return hash % totalVariants; // Bucket assignment
}
```

**18 Modification Types Supported:**

| Type           | Description          | Use Case                      |
| -------------- | -------------------- | ----------------------------- |
| `css`          | Apply CSS styles     | Change colors, fonts, spacing |
| `text`         | Replace text content | Test different headlines      |
| `hide`         | Hide element         | Remove distractions           |
| `remove`       | Delete element       | A/B test removing features    |
| `clone`        | Duplicate element    | Test multiple CTAs            |
| `image`        | Replace image        | Test different visuals        |
| `link`         | Change link URL      | Test different destinations   |
| `insertHtml`   | Inject HTML          | Add new elements              |
| `setAttribute` | Modify attributes    | Change data attributes        |
| `addClass`     | Add CSS class        | Toggle styles                 |
| `removeClass`  | Remove CSS class     | Disable styles                |
| `reorder`      | Change element order | Test layout variations        |
| `swap`         | Swap two elements    | Switch positions              |
| `resize`       | Change dimensions    | Test different sizes          |
| `move`         | Reposition element   | Test placements               |
| `animation`    | Apply animations     | Add motion                    |
| `redirect`     | URL redirect         | Test different pages          |
| `executeJs`    | Run JavaScript       | Advanced customization        |

**Performance Optimization:**

- Uses MutationObserver for dynamic content
- Caches applied modifications
- Prevents re-application loops
- Lazy evaluation (only runs when visible)

---

### 10. Frustration Signals Detection

**Automatic Frustration Identification:**

Detects signs of user frustration:

| Signal           | Detection Logic                          | Threshold       |
| ---------------- | ---------------------------------------- | --------------- |
| Rage Click       | 3+ clicks on same element in 1 second    | 3 clicks        |
| Dead Click       | Click with no response (300ms timeout)   | No DOM change   |
| Confusion Scroll | 5+ rapid direction changes               | 2 second window |
| Erratic Movement | High velocity + direction changes        | Score > 0.7     |
| Quick Exit       | Leave page within 3 seconds              | <3s session     |
| U-Turn           | Back button immediately after navigation | <2s on new page |

**Erratic Movement Detection:**

```javascript
// Calculates movement score:
score = (direction_changes / time_window) + (velocity / max_velocity)
if (score > 0.7) → is_erratic_movement = true
```

---

### 11. Feedback Widget

**In-Page Feedback Collection:**

Embedded widget for user feedback:

**Configuration:**

```javascript
// Loaded from: GET /api/feedback-config?siteId=xxx
{
  enabled: true,
  position: 'bottom-right',  // bottom-left, top-right, top-left
  trigger: 'button',         // button, automatic, exit-intent
  colors: {
    primary: '#3b82f6',
    background: '#ffffff'
  }
}
```

**Feedback Types:**

- Bug report
- Feature request
- General feedback
- Rating (1-5 stars)
- NPS score (0-10)

**Screenshot Capture:**
Uses html2canvas to capture current page state

---

### 12. Surveys

**Timed Survey Display:**

Shows surveys based on triggers:

**Trigger Types:**

- Time on page (e.g., after 30 seconds)
- Scroll depth (e.g., 50% scroll)
- Exit intent (mouse leaves viewport)
- On page load
- On specific event

**Survey Types:**

- Single choice
- Multiple choice
- Text input
- Rating scale
- NPS survey

---

## Core Analytics Features

### 1. Heatmap Visualization

**Module:** `features/heatmap/`

**Three Heatmap Types:**

#### Click Heatmap

- Shows where users click most
- Color intensity = click frequency
- Works across all device types
- Can filter by viewport (mobile/tablet/desktop)

**API Endpoint:** `POST /api/heatmap-clicks`

**Query Parameters:**

```typescript
{
  siteId: string,
  pagePath: string,
  deviceType: 'desktop' | 'mobile' | 'tablet',
  startDate: ISO timestamp,
  endDate: ISO timestamp
}
```

**Returns:**

```typescript
{
  clicks: Array<{
    x_relative: number; // 0-100%
    y_relative: number; // 0-100%
    click_count: number;
    element_selector: string;
  }>;
}
```

#### Scroll Heatmap

- Visualizes scroll depth distribution
- Shows "fold" line (where users stop scrolling)
- Identifies content that's rarely seen

**API Endpoint:** `POST /api/heatmap-scrolls`

#### Hover Heatmap (Attention Map)

- Shows where users focus attention
- Based on mouse dwell time
- Identifies engaging content

**API Endpoint:** `POST /api/hover-heatmap`

**Implementation:**

```typescript
// Uses heatmap.js library
const heatmap = h337.create({
  container: containerElement,
  radius: 20,
  maxOpacity: 0.6,
  minOpacity: 0,
  blur: 0.75,
});

heatmap.setData({
  max: maxValue,
  data: clickPoints,
});
```

---

### 2. Session Replay

**Module:** `components/SessionPlayer.tsx`

**Features:**

- Pixel-perfect playback of user sessions
- Video-like controls (play, pause, seek, speed)
- Timeline with event markers
- DevTools panel with console logs
- Network request timeline
- Session intelligence signals overlay

**API Endpoints:**

- `POST /api/sessions` - List sessions
- `POST /api/sessions/replay` - Get session events
- `GET /api/sessions/[session-id]/debug-data` - Get debug data

**Playback Controls:**

- Speed: 0.5x, 1x, 2x, 4x
- Skip inactivity (auto-advances during idle time)
- Jump to event (click on timeline marker)
- Full screen mode

**Session Metadata Display:**

- User agent
- Device type
- Screen resolution
- Location (country/city)
- Session duration
- Page views
- Frustration signals

**Intelligence Signals:**
Overlays detected signals on timeline:

- 🔴 Rage clicks
- ⚠️ Dead clicks
- 🔄 Confusion scrolling
- ⚡ JavaScript errors
- 🔙 U-turns
- 🚪 Quick exits

---

### 3. Form Analytics

**Module:** `features/form-analytics/`

**Dashboard View:** `/dashboard/form-analytics`

**Metrics Displayed:**

| Metric                | Calculation                             | Use Case                |
| --------------------- | --------------------------------------- | ----------------------- |
| Completion Rate       | (Submits / Starts) × 100%               | Overall success rate    |
| Drop-off Rate         | (1 - (Last field / First field)) × 100% | Where users abandon     |
| Avg. Time to Complete | Sum(field_times) / completions          | Form friction           |
| Refill Rate           | (Refills / Total fields) × 100%         | Field confusion         |
| Field-Level Metrics   | Per-field focus/blur analysis           | Identify problem fields |

**API Endpoint:** `GET /api/insights/forms`

**Query Parameters:**

```typescript
{
  siteId: string,
  formId?: string,      // Optional: specific form
  days: number,         // Default: 7
  fields: boolean       // Include field-level data
}
```

**Returns:**

```typescript
{
  forms: Array<{
    form_id: string;
    form_name: string;
    page_path: string;
    start_count: number;
    submit_count: number;
    abandon_count: number;
    completion_rate: number;
    avg_completion_time_ms: number;
    fields?: Array<{
      field_name: string;
      focus_count: number;
      blur_count: number;
      avg_time_ms: number;
      refill_count: number;
      refill_rate: number;
    }>;
  }>;
}
```

**Field Analysis:**

- Time spent per field (identifies friction)
- Refill count (indicates confusion)
- Drop-off at each field
- Focus without blur (users clicked away)

**Visual Components:**

- Form funnel chart (step-by-step drop-off)
- Field-level heatmap (color-coded by friction)
- Time distribution graph
- Refill rate bars

---

### 4. Element Tracking

**Module:** `features/element-tracking/`

**Purpose:** Analyze specific UI elements

**API Endpoints:**

- `POST /api/element-clicks` - Click data for specific elements
- `POST /api/element-clicks-all-viewports` - Cross-viewport analysis

**Use Cases:**

- Button click rates
- Link engagement
- CTA performance
- Navigation usage

**Metrics:**

```typescript
{
  element_selector: string,
  total_clicks: number,
  unique_users: number,
  click_rate: number,           // Clicks per session
  avg_time_to_click: number,    // From page load
  dead_click_rate: number       // % of ineffective clicks
}
```

**Element Overlay:**
Displays click counts directly on page snapshot:

```tsx
<ElementOverlay
  elements={elementData}
  snapshot={domSnapshot}
  onElementClick={handleAnalysis}
/>
```

---

### 5. Frustration Signals

**Module:** `features/frustration-signals/`

**Dashboard View:** `/dashboard/frustration-signals`

**Detected Signals:**

#### Rage Clicks

```typescript
// 3+ clicks within 1 second on same element
{
  type: 'rage_click',
  element_selector: string,
  click_count: number,
  time_window_ms: number,
  location: { x, y }
}
```

#### Dead Clicks

```typescript
// Click with no response
{
  type: 'dead_click',
  element_selector: string,
  had_response: false,
  wait_time_ms: 300
}
```

#### Confusion Scrolling

```typescript
// Rapid up/down scrolling
{
  type: 'confusion_scroll',
  direction_changes: number,
  confusion_score: number,  // 0-1
  scroll_distance: number
}
```

#### Erratic Mouse Movement

```typescript
{
  type: 'erratic_movement',
  cursor_direction_changes: number,
  cursor_path_distance: number,
  velocity: number,
  erratic_score: number
}
```

**API Endpoint:** `POST /api/frustration-signals`

**Returns:**

```typescript
{
  hotspots: Array<{
    x_relative: number,
    y_relative: number,
    signal_count: number,
    signal_type: string,
    severity: 'low' | 'medium' | 'high'
  }>,
  summary: {
    total_rage_clicks: number,
    total_dead_clicks: number,
    total_confusion_scrolls: number,
    affected_sessions: number,
    frustration_rate: number  // % of sessions with signals
  }
}
```

**Visualization:**

- Heatmap overlay of frustration hotspots
- Timeline of frustration events
- Session list filtered by signal type
- Element-level frustration analysis

---

### 6. Cursor Paths (User Journeys)

**Module:** `features/frustration-signals/components/CursorPathsPanel.tsx`

**Features:**

- Visualizes mouse movement paths
- Color-coded by velocity (fast = red, slow = blue)
- Shows attention zones
- Path simplification for performance

**API Endpoint:** `POST /api/cursor-paths`

**Data Structure:**

```typescript
{
  paths: Array<{
    session_id: string;
    points: Array<{
      x: number;
      y: number;
      timestamp: number;
      velocity: number;
      attention_zone: string;
    }>;
    simplified_path: Array<[x, y]>; // Douglas-Peucker
  }>;
}
```

**Use Cases:**

- Identify navigation patterns
- Find confusing layouts
- Discover unnoticed elements
- Optimize element placement

---

## Advanced Features

### 1. A/B Testing / Experiments

**Module:** `app/dashboard/experiments/`

**Complete Testing Platform:**

#### Experiment Creation

**Workflow:**

1. Create experiment (name, description, goal)
2. Define variants (Control + Variations)
3. Set traffic allocation (% of visitors)
4. Add modifications using visual editor
5. Set goal event (conversion metric)
6. Publish experiment

**API Endpoints:**

- `GET /api/experiments` - List experiments
- `POST /api/experiments` - Create experiment
- `PATCH /api/experiments/[id]` - Update experiment
- `DELETE /api/experiments/[id]` - Delete experiment
- `POST /api/experiments/publish` - Start experiment
- `GET /api/experiments/results` - Get results

**Experiment Schema:**

```typescript
interface Experiment {
  id: string;
  site_id: string;
  name: string;
  description?: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: Array<{
    id: string;
    name: string;
    weight: number; // Traffic percentage
  }>;
  traffic_percentage: number; // 0-100
  goal_event: string; // e.g., 'button_click', 'form_submit'
  created_at: string;
  started_at?: string;
  ended_at?: string;
}
```

#### Visual Editor

**Endpoint:** `POST /api/experiments/editor-url`

Generates secure URL with token for visual editing:

```
https://your-site.com?__navlens_editor&token=xxx
```

**Editor Features:**

- Point-and-click element selection
- Live preview of modifications
- Undo/redo support
- Modification library
- CSS selector validation

#### Modifications Management

**API Endpoint:** `POST /api/experiments/modifications`

**Modification Schema:**

```typescript
interface Modification {
  id: string;
  variant_id: string;
  selector: string; // CSS selector
  type: string; // One of 18 types
  changes: object; // Type-specific changes
  order_index: number; // Application order
}
```

**Examples:**

```typescript
// Change button color
{
  type: 'css',
  selector: '.cta-button',
  changes: {
    css: {
      backgroundColor: '#ff0000',
      fontSize: '18px'
    }
  }
}

// Replace headline text
{
  type: 'text',
  selector: 'h1.hero-title',
  changes: {
    text: 'New Compelling Headline'
  }
}

// Swap two elements
{
  type: 'swap',
  selector: '.element-a',
  changes: {
    targetSelector: '.element-b'
  }
}
```

#### Statistical Analysis

**API Endpoint:** `GET /api/experiments/results?experimentId=xxx`

**Returns:**

```typescript
interface ExperimentResults {
  experiment_id: string;
  total_users: number;
  variants: Array<{
    variant_id: string;
    variant_name: string;
    users: number;
    conversions: number;
    conversion_rate: number;
  }>;
  winner?: string; // Variant ID
  confidence_level?: number; // 0-100%
  z_score?: number; // Statistical significance
  lift_percentage?: number; // Improvement over control
  is_significant: boolean; // p < 0.05
  status_message?: string;
}
```

**Statistical Tests:**

- Z-test for proportions
- Chi-squared test
- Confidence intervals
- Sample size requirements

**Result Visualization:**

- Variant comparison table
- Conversion rate charts
- Confidence bar
- Winner declaration
- Lift calculation

#### Experiment Lifecycle

```
Draft → Running → (Paused) → Completed
   ↓        ↓         ↓           ↓
  Edit   Collect   Resume    Analyze
         Data
```

---

### 2. Funnels

**Module:** `features/funnels/`

**Dashboard View:** `/dashboard/funnels`

**Purpose:** Track multi-step conversion flows

#### Funnel Creation

**API Endpoint:** `POST /api/funnels`

**Funnel Schema:**

```typescript
interface Funnel {
  id: string;
  site_id: string;
  name: string;
  description?: string;
  steps: Array<{
    id: string;
    name: string;
    page_path: string;
    order_index: number;
    conditions?: Array<{
      type: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
      value: string;
    }>;
  }>;
  is_active: boolean;
}
```

**Example Funnel:**

```typescript
{
  name: "E-commerce Checkout",
  steps: [
    { name: "Product Page", page_path: "/products/*" },
    { name: "Add to Cart", page_path: "/cart" },
    { name: "Checkout", page_path: "/checkout" },
    { name: "Payment", page_path: "/payment" },
    { name: "Confirmation", page_path: "/order-confirmed" }
  ]
}
```

#### Funnel Analysis

**API Endpoint:** `GET /api/funnels?siteId=xxx&funnelId=xxx&startDate=xxx&endDate=xxx`

**Uses ClickHouse windowFunnel:**

```sql
SELECT
  windowFunnel(3600)(  -- 1 hour window
    timestamp,
    page_path = '/products',
    page_path = '/cart',
    page_path = '/checkout',
    page_path = '/payment',
    page_path = '/order-confirmed'
  ) AS step_reached
FROM events
WHERE site_id = 'xxx'
GROUP BY session_id
```

**Returns:**

```typescript
{
  funnel_id: string;
  steps: Array<{
    step_index: number;
    step_name: string;
    users: number;
    conversion_rate: number; // % of total
    drop_off_rate: number; // % lost from previous
    avg_time_to_next: number; // Seconds
  }>;
  overall_conversion: number; // % who complete all steps
  avg_completion_time: number; // Seconds
}
```

**Visualization:**

- Funnel chart (decreasing bar widths)
- Step-by-step conversion rates
- Drop-off analysis
- Time between steps
- Sankey diagram for paths

---

### 3. Cohorts

**Module:** `app/api/cohorts/`

**Dashboard View:** `/dashboard/cohorts`

**Purpose:** Segment users by behavior

#### Cohort Creation

**API Endpoint:** `POST /api/cohorts`

**Cohort Schema:**

```typescript
interface Cohort {
  id: string;
  site_id: string;
  name: string;
  description: string;
  rules: Array<{
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than" | "between";
    value: string | number;
    value2?: string | number; // For 'between'
  }>;
  created_at: string;
}
```

**Example Cohorts:**

```typescript
// High-value users
{
  name: "High-Value Customers",
  rules: [
    { field: "total_sessions", operator: "greater_than", value: 10 },
    { field: "avg_session_duration", operator: "greater_than", value: 300 }
  ]
}

// Mobile users from US
{
  name: "US Mobile Users",
  rules: [
    { field: "device_type", operator: "equals", value: "mobile" },
    { field: "country", operator: "equals", value: "US" }
  ]
}

// Frustrated users
{
  name: "Frustrated Users",
  rules: [
    { field: "rage_clicks", operator: "greater_than", value: 3 }
  ]
}
```

#### Cohort Analysis

**API Endpoint:** `POST /api/cohort-metrics`

**Returns:**

```typescript
{
  cohort_id: string;
  cohort_name: string;
  user_count: number;
  metrics: {
    avg_session_duration: number;
    avg_page_views: number;
    bounce_rate: number;
    conversion_rate: number;
    frustration_rate: number;
  }
  top_pages: Array<{
    page_path: string;
    visits: number;
  }>;
  common_journeys: Array<{
    path: string[];
    user_count: number;
  }>;
}
```

---

### 4. Performance Metrics

**Module:** `app/api/performance-metrics/`

**Dashboard View:** `/dashboard/performance`

**Web Vitals Tracking:**

| Metric                          | Good    | Needs Improvement | Poor     |
| ------------------------------- | ------- | ----------------- | -------- |
| LCP (Largest Contentful Paint)  | < 2.5s  | 2.5s - 4s         | > 4s     |
| FCP (First Contentful Paint)    | < 1.8s  | 1.8s - 3s         | > 3s     |
| CLS (Cumulative Layout Shift)   | < 0.1   | 0.1 - 0.25        | > 0.25   |
| INP (Interaction to Next Paint) | < 200ms | 200ms - 500ms     | > 500ms  |
| TTFB (Time to First Byte)       | < 800ms | 800ms - 1800ms    | > 1800ms |

**API Endpoint:** `POST /api/performance-metrics`

**Data Captured:**

- Core Web Vitals (above)
- Custom performance marks
- Navigation timing
- Resource loading times
- Long tasks (>50ms)

**Analysis Views:**

- Web Vitals trends over time
- Performance by page
- Performance by device type
- Performance by country
- Percentile distribution (p50, p75, p90, p95)

---

### 5. User Journeys

**Module:** `app/api/user-journeys/`

**Purpose:** Visualize navigation paths

#### Sankey Diagram

**Component:** `components/SankeyDiagram.tsx`

**Visualization:**

- Source → Target flow diagram
- Link thickness = number of users
- Color-coded by conversion status
- Interactive tooltips

**API Endpoint:** `POST /api/user-journeys`

**Query:**

```typescript
{
  siteId: string,
  startDate: string,
  endDate: string,
  maxDepth: number,      // Max pages to show
  minFlowSize: number    // Filter small paths
}
```

**Returns:**

```typescript
{
  nodes: Array<{
    id: string;
    name: string; // Page path
    visits: number;
  }>;
  links: Array<{
    source: string; // From page
    target: string; // To page
    value: number; // User count
  }>;
}
```

**Use Cases:**

- Identify common navigation patterns
- Find unexpected paths
- Optimize navigation structure
- Discover dead ends

---

### 6. Feedback & Surveys

**Module:** `features/feedback/`

#### Feedback System

**Dashboard View:** `/dashboard/feedback`

**API Endpoints:**

- `GET /api/feedback` - List feedback
- `POST /api/feedback` - Submit feedback (from tracker)
- `GET /api/feedback-config` - Get widget configuration
- `POST /api/feedback-config` - Update widget settings

**Feedback Types:**

- Text feedback
- Star ratings (1-5)
- NPS scores (0-10)
- Bug reports
- Feature requests

**Widget Configuration:**

```typescript
{
  enabled: boolean;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  trigger: "button" | "automatic" | "exit-intent";
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  }
  text: {
    title: string;
    placeholder: string;
    submitButton: string;
  }
}
```

**Feedback Schema:**

```typescript
{
  id: string;
  site_id: string;
  session_id: string;
  visitor_id: string;
  page_path: string;
  feedback_type: string;
  rating?: number;
  nps_score?: number;
  message: string;
  screenshot_url?: string;
  metadata: {
    user_agent: string;
    device_type: string;
    viewport: { width, height };
  };
  created_at: string;
}
```

#### Surveys

**API Endpoints:**

- `GET /api/surveys` - List surveys
- `POST /api/surveys` - Submit survey response

**Survey Triggers:**

- Time on page
- Scroll depth
- Exit intent
- On page load
- After specific event

**Survey Types:**

- Single choice
- Multiple choice
- Text input
- Rating scale (1-5)
- NPS (0-10)
- Likert scale

---

### 7. Session Intelligence

**Module:** Built into session replay

**Real-time Signal Detection:**

Automatically flags sessions with issues:

**Signal Types:**

```typescript
{
  session_signals: [
    { type: "rage_click", timestamp, location, element },
    { type: "dead_click", timestamp, location, element },
    { type: "js_error", timestamp, error_message },
    { type: "console_error", timestamp, message },
    { type: "network_error", timestamp, url, status },
    { type: "confusion_scroll", timestamp, score },
    { type: "u_turn", timestamp, from_page, to_page },
    { type: "quick_exit", timestamp, duration },
  ];
}
```

**Dashboard Features:**

- Filter sessions by signal type
- Sort by signal severity
- Session health score (0-100)
- Automatic issue prioritization

---

### 8. DOM Snapshot Storage

**Module:** `features/dom-snapshot/`

**Purpose:** Store page structure for accurate heatmap overlays

**API Endpoints:**

- `POST /api/dom-snapshot` - Store snapshot (from tracker)
- `POST /api/get-snapshot` - Retrieve snapshot (for dashboard)
- `GET /api/get-snapshot` - Legacy GET endpoint

**Storage:**

- ClickHouse table: `dom_snapshots`
- Compressed using gzip
- Deduplicated by hash
- Cached for performance

**Snapshot Schema:**

```typescript
{
  site_id: string;
  page_path: string;
  device_type: "desktop" | "mobile" | "tablet";
  snapshot_data: string; // rrweb-snapshot format
  viewport_width: number;
  viewport_height: number;
  document_width: number;
  document_height: number;
  hash: string; // For deduplication
  captured_at: string;
}
```

**Deduplication:**

- Generates hash of DOM structure
- Only stores if hash changed
- Reduces storage by ~80%

---

## Dashboard & UI

### Dashboard Pages

| Route                            | Purpose              | Features                                                  |
| -------------------------------- | -------------------- | --------------------------------------------------------- |
| `/dashboard`                     | Overview             | Total sessions, page views, top pages, real-time activity |
| `/dashboard/heatmaps`            | Heatmap viewer       | Click, scroll, hover heatmaps with device filters         |
| `/dashboard/sessions`            | Session list         | Filterable session table with replay links                |
| `/dashboard/form-analytics`      | Form analysis        | Form metrics, field-level insights                        |
| `/dashboard/funnels`             | Funnel analysis      | Create/edit funnels, view conversion rates                |
| `/dashboard/experiments`         | A/B testing          | Manage experiments, view results                          |
| `/dashboard/frustration-signals` | Frustration analysis | Rage clicks, dead clicks, confusion signals               |
| `/dashboard/feedback`            | User feedback        | View and manage feedback submissions                      |
| `/dashboard/journey`             | User journeys        | Sankey diagram of navigation flows                        |
| `/dashboard/cohorts`             | Cohort management    | Create/analyze user segments                              |
| `/dashboard/performance`         | Performance metrics  | Web Vitals, loading times                                 |
| `/dashboard/my-sites`            | Site management      | Add/edit sites, configure tracking                        |
| `/dashboard/settings`            | Account settings     | Profile, API keys, team management                        |

### Shared Components

#### LoadingSpinner

Simple loading indicator

#### Toast

Toast notifications for success/error messages

#### ErrorBoundary

Catches and displays component errors

#### Header / Footer

Site-wide navigation

#### Navbar / SideNavbar

Dashboard navigation

#### PageFilter

Filter by page path and device type

#### SessionPlayer

Full session replay with controls

#### HeatmapViewer

Renders heatmaps on DOM snapshot

#### SankeyDiagram

User journey visualization

#### VideoControls

Session replay controls (play, pause, speed)

#### SessionNotesPanel

Add notes to sessions

---

## API Endpoints

### Complete Endpoint List

| Endpoint                                | Method                | Purpose                                    |
| --------------------------------------- | --------------------- | ------------------------------------------ |
| `/api/v1/ingest`                        | POST                  | Main event ingestion (all tracker events)  |
| `/api/v1/form-events`                   | POST                  | Form interaction events                    |
| `/api/v1/debug-events`                  | POST                  | Console logs and network requests          |
| `/api/rrweb-events`                     | POST                  | Session recording events                   |
| `/api/dom-snapshot`                     | POST                  | Store DOM snapshots                        |
| `/api/site-details`                     | POST                  | Verify site ID and get configuration       |
| `/api/heatmap-clicks`                   | POST                  | Get click heatmap data                     |
| `/api/heatmap-clicks-all-viewports`     | POST                  | Click data across all devices              |
| `/api/heatmap-scrolls`                  | POST                  | Get scroll heatmap data                    |
| `/api/hover-heatmap`                    | POST                  | Get hover/attention heatmap data           |
| `/api/element-clicks`                   | POST                  | Get element-specific click data            |
| `/api/element-clicks-all-viewports`     | POST                  | Element clicks across devices              |
| `/api/elements-metrics-data`            | POST                  | Element performance metrics                |
| `/api/get-snapshot`                     | POST/GET              | Retrieve DOM snapshot                      |
| `/api/get-pages-list`                   | POST                  | Get list of tracked pages                  |
| `/api/sessions`                         | POST                  | List sessions with filters                 |
| `/api/sessions/replay`                  | POST                  | Get session replay data                    |
| `/api/sessions/[session-id]`            | POST                  | Get specific session details               |
| `/api/sessions/[session-id]/debug-data` | GET                   | Get debug data for session                 |
| `/api/session-notes`                    | GET/POST/PATCH/DELETE | Manage session notes                       |
| `/api/session-notes/query`              | POST                  | Query session notes                        |
| `/api/funnels`                          | GET/POST/PUT/DELETE   | CRUD operations for funnels                |
| `/api/experiments`                      | GET/POST              | List/create experiments                    |
| `/api/experiments/[id]`                 | GET/PATCH/DELETE      | Manage specific experiment                 |
| `/api/experiments/config`               | GET                   | Get experiment configuration (for tracker) |
| `/api/experiments/modifications`        | GET/POST              | Manage experiment modifications            |
| `/api/experiments/results`              | GET                   | Get experiment results                     |
| `/api/experiments/results/query`        | POST                  | Query experiment results                   |
| `/api/experiments/publish`              | POST                  | Publish/start experiment                   |
| `/api/experiments/editor-url`           | POST                  | Generate editor URL with token             |
| `/api/experiments/upload`               | POST                  | Upload assets for experiments              |
| `/api/feedback`                         | GET/POST              | Get/submit feedback                        |
| `/api/feedback-config`                  | GET/POST              | Get/update feedback widget config          |
| `/api/feedback/query`                   | POST                  | Query feedback with filters                |
| `/api/surveys`                          | GET/POST              | Get/submit surveys                         |
| `/api/cohorts`                          | GET/POST/DELETE       | Manage user cohorts                        |
| `/api/cohorts/query`                    | POST                  | Query cohort data                          |
| `/api/cohort-metrics`                   | POST                  | Get cohort analytics                       |
| `/api/frustration-signals`              | POST                  | Get frustration signal data                |
| `/api/frustration-hotspots`             | POST                  | Get frustration hotspot locations          |
| `/api/cursor-paths`                     | POST                  | Get cursor movement paths                  |
| `/api/user-journeys`                    | POST                  | Get user journey data                      |
| `/api/performance-metrics`              | POST                  | Get performance metrics                    |
| `/api/insights/forms`                   | GET                   | Get form analytics                         |
| `/api/dashboard-stats`                  | GET                   | Get dashboard overview stats               |
| `/api/dashboard/feedback`               | POST                  | Dashboard-specific feedback query          |
| `/api/page-paths`                       | POST                  | Get unique page paths                      |
| `/api/manage-page-paths`                | POST/DELETE           | Manage excluded page paths                 |
| `/api/excluded-paths`                   | POST/DELETE           | Manage path exclusions                     |

---

## Data Storage

### ClickHouse (Time-Series Events)

**Database:** `default`

**Main Table: `events`**

Schema (68+ columns):

```sql
CREATE TABLE default.events (
  -- Identifiers
  site_id String,
  event_id String,
  session_id String,
  client_id String,
  visitor_id String,
  user_id String,

  -- Event metadata
  event_type String,
  timestamp DateTime,
  created_at DateTime,

  -- Location data
  x Float64,
  y Float64,
  x_relative Float64,
  y_relative Float64,
  scroll_depth Float64,

  -- Page context
  page_url String,
  page_path String,
  referrer String,

  -- User agent
  user_agent String,
  user_language String,
  ip_address String,

  -- Viewport/Device
  viewport_width Int32,
  viewport_height Int32,
  screen_width Int32,
  screen_height Int32,
  device_type String,
  document_width Int32,
  document_height Int32,

  -- Element data
  element_id String,
  element_classes String,
  element_tag String,
  element_text String,
  element_selector String,
  element_href String,
  is_interactive Bool,

  -- Click data
  is_dead_click Bool,
  click_count Int32,

  -- Performance
  load_time Float64,

  -- A/B Testing
  variant_id String,
  experiment_ids Array(String),
  variant_ids Array(String),

  -- Frustration signals
  confusion_scroll_score Float64,
  is_erratic_movement Bool,
  cursor_direction_changes Int32,
  cursor_path_distance Float64,
  hover_duration_ms Int32,
  attention_zone String,

  -- Additional data
  data String  -- JSON for custom fields
)
ENGINE = SharedMergeTree(...)
PRIMARY KEY (site_id, event_type, timestamp, event_id)
ORDER BY (site_id, event_type, timestamp, event_id, session_id)
```

**Indexes:**

- Primary key on (site_id, event_type, timestamp)
- Optimized for time-range queries
- Session aggregations

**Additional Tables:**

- `dom_snapshots` - Stores page snapshots
- `form_events` - Form interaction tracking
- `debug_events` - Console logs and network data

### Supabase (PostgreSQL)

**Tables:**

#### `sites`

```sql
{
  id: uuid,
  user_id: uuid,              -- Owner
  name: text,
  domain: text,
  api_key: text,              -- For tracker authentication
  allowed_origins: text[],    -- CORS whitelist
  created_at: timestamptz
}
```

#### `rrweb_events`

```sql
{
  id: serial,
  site_id: text,
  session_id: text,
  page_path: text,
  visitor_id: text,
  events: jsonb,              -- rrweb events array
  session_signals: jsonb,     -- Detected frustration signals
  timestamp: timestamptz,
  user_agent: text,
  device_type: text,
  viewport_width: int,
  viewport_height: int,
  -- ... additional metadata
}
```

#### `funnels`

```sql
{
  id: uuid,
  site_id: uuid,
  name: text,
  description: text,
  steps: jsonb,               -- Array of funnel steps
  is_active: bool,
  created_at: timestamptz,
  updated_at: timestamptz
}
```

#### `feedback`

```sql
{
  id: uuid,
  site_id: text,
  session_id: text,
  visitor_id: text,
  page_path: text,
  feedback_type: text,
  rating: int,
  nps_score: int,
  message: text,
  screenshot_url: text,
  metadata: jsonb,
  created_at: timestamptz
}
```

#### `cohorts`

```sql
{
  id: uuid,
  site_id: uuid,
  name: text,
  description: text,
  rules: jsonb,               -- Array of cohort rules
  created_at: timestamptz,
  created_by: uuid
}
```

#### `experiments`

```sql
{
  id: uuid,
  site_id: uuid,
  name: text,
  description: text,
  status: text,               -- draft, running, paused, completed
  variants: jsonb,
  traffic_percentage: int,
  goal_event: text,
  created_at: timestamptz,
  started_at: timestamptz,
  ended_at: timestamptz
}
```

#### `experiment_modifications`

```sql
{
  id: uuid,
  experiment_id: uuid,
  variant_id: text,
  selector: text,
  type: text,                 -- css, text, hide, etc.
  changes: jsonb,
  order_index: int
}
```

---

## Security & Performance

### Security Features

#### 1. Authentication

- Supabase Auth integration
- JWT tokens for API authentication
- Row Level Security (RLS) on all tables
- User can only access their own sites

#### 2. Authorization

```typescript
// Server-side checks
const authResult = await authenticateAndAuthorize(request);
if (!authResult.isAuthorized) {
  return createUnauthorizedResponse();
}
```

#### 3. CORS Protection

- Whitelist-based origin validation
- Per-site allowed origins configuration
- Rejects requests from non-whitelisted domains

```typescript
// Validates origin against site's whitelist
const validation = await validateSiteAndOrigin(siteId, origin);
if (!validation.allowed) {
  return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
}
```

#### 4. Rate Limiting

**Implementation:** Redis (Upstash) or in-memory fallback

**Limits:**

- IP-based: 1000 requests per minute
- Site-based: 10,000 events per minute
- Feedback: 5 submissions per session per minute

```typescript
const rateLimitResult = await checkRateLimits(clientIP, siteId);
if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    { status: 429, headers: rateLimitResult.headers }
  );
}
```

#### 5. Input Validation

**Validator Library:** `lib/validation.ts`

```typescript
validators.isValidUUID(siteId);
validators.isValidURL(url);
validators.isValidIP(ipAddress);
validators.isValidJSON(jsonString);
validators.sanitizeString(input);
```

**SQL Injection Prevention:**

- Parameterized queries
- Input sanitization
- Whitelist validation

#### 6. PII Scrubbing

Automatically removes sensitive data:

- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers
- IP addresses (optionally)

```javascript
// In tracker.js
function scrubbPII(text) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CC]");
}
```

#### 7. Encryption

**Data at Rest:**

- ClickHouse encryption enabled
- Supabase encrypted storage

**Data in Transit:**

- HTTPS/TLS 1.3
- Encrypted API communication

**API Responses:**

```typescript
// Optional response encryption
return encryptedJsonResponse(data, status);
```

#### 8. Request Size Limits

```typescript
// Max 1MB per request
validateRequestSize(request, 1);
```

### Performance Optimizations

#### 1. Caching

**Next.js Cache:**

```typescript
import { unstable_cache } from "next/cache";

const getCachedData = unstable_cache(
  async (siteId, startDate, endDate) => {
    return await fetchDataFromClickHouse(siteId, startDate, endDate);
  },
  ["funnel-analysis"],
  { revalidate: 300 } // 5 minutes
);
```

**Custom Cache Layer:**

```typescript
// lib/cache.ts
export const cache = new Map();
export function getCached(key: string, ttl: number = 300) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl * 1000) {
    return cached.data;
  }
  return null;
}
```

#### 2. Compression

**Client → Server:**

- gzip compression for tracker payloads
- Reduces bandwidth by ~70%

```javascript
// In tracker.js
const compressed = pako.gzip(JSON.stringify(data));
fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Encoding": "gzip",
    "Content-Type": "application/json",
  },
  body: compressed,
});
```

**Server Decompression:**

```typescript
// lib/decompress.ts
const body = await parseRequestBody(request); // Auto-detects gzip
```

#### 3. ClickHouse Query Optimization

**Materialized Views:**

```sql
-- Pre-aggregated click counts
CREATE MATERIALIZED VIEW click_aggregates
ENGINE = SummingMergeTree()
ORDER BY (site_id, page_path, device_type, date)
AS SELECT
  site_id,
  page_path,
  device_type,
  toDate(timestamp) as date,
  count() as click_count
FROM events
WHERE event_type = 'click'
GROUP BY site_id, page_path, device_type, date;
```

**Query Patterns:**

- Always filter by `site_id` first
- Use time ranges in WHERE clause
- Leverage PRIMARY KEY ordering

#### 4. Batching

**Tracker Batching:**

- Groups events into batches (max 100)
- Sends every 10 seconds or when buffer full
- Reduces HTTP overhead

**ClickHouse Batching:**

```typescript
// Insert in batches of 1000
await clickhouse.insert({
  table: "events",
  values: eventBatch,
  format: "JSONEachRow",
});
```

#### 5. Connection Pooling

```typescript
// lib/clickhouse.ts
let clickhouseClient: ClickHouseClient | null = null;

export function getClickHouseClient() {
  if (!clickhouseClient) {
    clickhouseClient = createClient({
      url: process.env.CLICKHOUSE_URL,
      max_open_connections: 10,
      keep_alive: { enabled: true },
    });
  }
  return clickhouseClient;
}
```

#### 6. Lazy Loading

**Components:**

```tsx
const SessionPlayer = dynamic(() => import("./SessionPlayer"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});
```

**Data:**

- Pagination for large datasets
- Infinite scroll for session lists
- Load-on-demand for heavy visualizations

#### 7. Debouncing / Throttling

```javascript
// Tracker throttling
let lastFlushTime = 0;
const MIN_FLUSH_INTERVAL = 5000; // 5 seconds

function flushEvents() {
  const now = Date.now();
  if (now - lastFlushTime < MIN_FLUSH_INTERVAL) {
    return; // Skip flush
  }
  lastFlushTime = now;
  sendToAPI(eventBuffer);
}
```

---

## Summary Statistics

### Application Metrics

- **Total Features:** 12+ major features
- **API Endpoints:** 26+ routes
- **Feature Modules:** 9 modular packages
- **Client Script Size:** 4,585 lines (tracker.js)
- **Supported Device Types:** Mobile, Tablet, Desktop
- **Event Types Tracked:** 15+ types
- **A/B Test Modification Types:** 18 types
- **Database Tables:** 10+ tables
- **Average Response Time:** <100ms (cached), <500ms (database)
- **Max Events per Request:** 100 events
- **Session Timeout:** 30 minutes
- **Rate Limit:** 1,000 requests/min per IP

### Key Capabilities

✅ **Real-time Analytics** - Live event tracking and dashboard updates  
✅ **Session Recording** - Pixel-perfect playback with rrweb  
✅ **Heatmaps** - Click, scroll, and hover visualization  
✅ **Form Analytics** - Field-level drop-off and friction analysis  
✅ **Frustration Detection** - Rage clicks, dead clicks, confusion signals  
✅ **A/B Testing** - Visual editor with 18 modification types  
✅ **Funnels** - Multi-step conversion tracking  
✅ **Cohorts** - User segmentation and analysis  
✅ **User Journeys** - Sankey diagram visualization  
✅ **Feedback Collection** - In-page widget and surveys  
✅ **Performance Monitoring** - Core Web Vitals tracking  
✅ **Developer Tools** - Console logs and network requests  
✅ **Multi-device Support** - Desktop, mobile, tablet tracking  
✅ **Privacy-First** - PII scrubbing, data masking  
✅ **Enterprise Security** - CORS, rate limiting, encryption  
✅ **High Performance** - Caching, batching, compression

---

## Conclusion

Navlens is a **comprehensive web analytics platform** that combines:

- Traditional analytics (page views, sessions)
- Behavioral analytics (heatmaps, session replay)
- Conversion optimization (funnels, A/B testing)
- User insights (frustration signals, feedback)
- Performance monitoring (Web Vitals)

The platform is built with a **modern, scalable architecture** using:

- Feature-based modular design
- Time-series database (ClickHouse) for high-volume events
- Relational database (Supabase) for structured data
- Client-side tracking with privacy-first approach
- Real-time processing and caching

**Target Users:**

- Product managers (understand user behavior)
- UX designers (identify friction points)
- Developers (debug issues with session replay)
- Marketing teams (optimize conversions with A/B tests)
- Data analysts (deep-dive into user journeys)

**Competitive Advantages:**

- All-in-one platform (no need for multiple tools)
- Privacy-focused (PII scrubbing, data masking)
- Self-hosted option (full data control)
- Developer-friendly (comprehensive API)
- Affordable (no per-event pricing)

---

**Report Generated:** December 14, 2025  
**Contact:** support@navlens.com  
**Documentation:** https://docs.navlens.com
