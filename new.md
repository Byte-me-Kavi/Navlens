# Navlens Analytics - Comprehensive Functionality Report

This report details every feature within the Navlens Analytics platform, explaining how they work, what users see, and the underlying technical implementation.

---

## 1. Dashboard Overview
**What Users See:**
Upon logging in, users are greeted by a "Welcome" section and a real-time overview of their site's performance.
-   **Key Stats Cards**: Total Sites, Total Clicks, Active Sessions (24h), and Heatmaps Generated. Each card shows a trend percentage (e.g., "+5% vs last week") with color-coded arrow indicators.
-   **Live Activity**: A pulsing "Live Now" widget shows the number of users currently on the site (within the last 5 minutes).
-   **Frustration Alerts**: A dedicated widget highlights immediate issues: Rage Clicks, Dead Clicks, and JS Errors. If issues are detected, it links directly to "Watch Sessions" filtered for those frustration signals.
-   **Device Breakdown**: A donut chart visualizing the split between Desktop, Mobile, and Tablet users.
-   **Click Activity**: A bar chart showing click volume over the last 7 days.
-   **Top Pages**: A dedicated section listing the most visited pages with a visual distribution chart.

**How It Works:**
-   **Data Source**: The dashboard pulls aggregated data from a **ClickHouse** database (`dashboard_stats_hourly` materialized view) for extreme speed.
-   **Real-time Updates**: Uses `SWR` (Stale-While-Revalidate) to poll for updates every 30 seconds while keeping the UI responsive.
-   **Caching**: Implements intelligent localized caching (60s deduplication) to prevent API spam when navigating between tabs.

## 2. Heatmaps
**What Users See:**
Users can generate and view three types of interactive heatmaps overlaid on their actual website content:
1.  **Click Heatmaps**: Visualizes where users are clicking. Hot (red) areas indicate high engagement, while cold (blue) areas show low interaction.
2.  **Scroll Heatmaps**: Shows how far down the page users scroll. It marks the "Average Fold" line to indicate what percentage of users see specific content without scrolling.
3.  **Attention (Hover) Heatmaps**: Tracks mouse movement and dwell time to show where users are looking, even if they don't click.

**How It Works:**
-   **Capture**: The `tracker.js` script takes a "snapshot" of the DOM (HTML/CSS) to recreate the page structure accurately, regardless of login state or dynamic content.
-   **Rendering**: The viewer uses `heatmap.js` to draw the gradient overlay on top of an `iframe` containing the captured DOM snapshot.
-   **Device Toggles**: Users can switch viewports (Desktop, Tablet, Mobile) to see how behavior changes across devices.

## 3. Session Replay
**What Users See:**
A video-like player that recreates exactly what a visitor did on the site.
-   **Playback Controls**: Play/Pause, speed controls (1x, 2x, 4x, 8x), and a "Skip Inactivity" toggle.
-   **Timeline**: A visual timeline populated with color-coded markers for events:
    -   🔵 Page Visits
    -   🔴 Rage Clicks
    -   🟡 Dead Clicks
    -   ⚠️ Errors
-   **User Metadata**: Sidebar showing the user's Location (Country/City), Device, OS, Browser, and Screen Resolution.
-   **DevTools Panel**: A developer-focused panel showing **Console Logs** (info, warn, error) and **Network Requests** (XHR/Fetch) captured during the session.

**How It Works:**
-   **rrweb**: The core technology is `rrweb` (Record and Replay Web), which records DOM mutations (changes to the page structure) rather than video. This makes recordings lightweight and pixel-perfect.
-   **Privacy**: All sensitive input fields (passwords, credit cards) and text marked with `.monitor-mask` are automatically masked to `***` before leaving the user's browser, ensuring GDPR/CCPA compliance.

## 4. Frustration Signals
**What Users See:**
Navlens automatically detects and highlights moments of user struggle.
-   **Rage Clicks**: Rapidly clicking the same element (3+ times) in frustration.
-   **Dead Clicks**: Clicking elements that look interactive but do nothing (broken links/buttons).
-   **Confusion Scrolling**: Rapidly scrolling up and down, indicating the user can't find what they need.
-   **Javascript Errors**: Frontend crashes or bugs that interrupt the user experience.

**How It Works:**
-   **Heuristics**: The tracking script monitors mouse velocity, click cadence, and scroll patterns in real-time.
-   **Thresholds**:
    -   Rage Click: >3 clicks within 1s on the same target.
    -   Dead Click: Click on non-interactive element with no subsequent DOM change for 300ms.
-   **Alerting**: These events are tagged onto the session immediately, allowing the "Frustration" widgets on the dashboard to update in real-time.

## 5. Performance Monitoring & Web Vitals
**What Users See:**
A dedicated performance dashboard focusing on Google's Core Web Vitals and network health.
-   **Core Web Vitals**:
    -   **LCP (Largest Contentful Paint)**: Loading speed.
    -   **CLS (Cumulative Layout Shift)**: Visual stability.
    -   **INP (Interaction to Next Paint)**: Responsiveness.
-   **Network Health**: A visualization of API call failures and slow requests.
-   **Map View**: A world map showing average latency by country.

**How It Works:**
-   **PerformanceObserver API**: The tracker uses the browser's native `PerformanceObserver` API to capture accurate metric scores directly from the user's device.
-   **Resource Timing**: Captures waterfall data for network requests to identify slow third-party scripts or API endpoints.

## 6. Form Analytics
**What Users See:**
Detailed insights into how users interact with forms (Signups, Checkout, Contact).
-   **Funnel View**: Visualization of the completion rate (Starters -> Completers).
-   **Field-Level Stats**:
    -   **Drop-off Rate**: Which specific field causes users to leave?
    -   **Refill Rate**: How often users have to delete and re-type (indicating validation errors or confusion).
    -   **Time Spent**: Average time spent on each field.

**How It Works:**
-   **Event Listeners**: Tracks `focus`, `blur`, `change`, and `submit` events on all `<form>`, `<input>`, and `<select>` elements.
-   **Abandonment**: If a user interacts with a form but leaves the page without a successful `submit` event, it's recorded as abandoned.

## 7. Funnels & User Journeys
**What Users See:**
-   **Custom Funnels**: Users can define a series of steps (e.g., "Home" -> "Pricing" -> "Signup" -> "Dashboard") and see the conversion rate between each step.
-   **Journey Map**: A Sankey diagram (flow chart) showing the most common paths users take from a specific starting page.

**How It Works:**
-   **Path Analysis**: Aggregates session page views to calculate the percentage of users who proceed from Step A to Step B.
-   **Flexible Definitions**: Steps can be defined by exact URL, "starts with", or "contains", allowing for broad or specific path tracking.

## 8. A/B Testing (Experiments)
**What Users See:**
A visual "No-Code" editor to modify their live website.
-   **Visual Editor**: Users enter their site URL and can point-and-click to:
    -   Change Text / Headlines.
    -   Change Colors / Styles.
    -   Hide Elements.
    -   Swap Images.
-   **Variant Management**: Define "Control" vs "Variant A/B".
-   **Results**: Statistical analysis of which variant performed better (e.g., "Variant B increased clicks by 15%").

**How It Works:**
-   **Client-Side Injection**: The `tracker.js` script fetches active experiments for the site.
-   **Deterministic Bucketing**: Users are assigned to a variant based on a hash of their anonymous Visitor ID, ensuring they always see the same version.
-   **DOM Manipulation**: The script applies the defined changes (CSS/Text) on the fly using `MutationObserver` to ensure they persist even if the framework (React/Vue) re-renders the component.

## 9. Comprehensive Reports (New Feature)
**What Users See:**
A "Generate Report" button that creates a professional PDF summary of the site's performance over the last 30 days.
-   **Executive Summary**: High-level stats, top pages list, and device breakdown.
-   **Visual Proof**: Embedded screenshots of the key Heatmaps directly in the PDF.
-   **Downloadable**: Generated instantly as a standard PDF file for sharing with stakeholders or clients.

**How It Works:**
-   **Hybrid Generation**:
    1.  **Client-Side**: Captures Heatmap visuals using `dom-to-image-more`.
    2.  **Server-Side**: Sends visuals to the API (`/api/reports/generate`).
    3.  **Assembly**: The API queries the database for the latest numbers and stitching them together with the images using `pdf-lib` to create a single document.

## 10. Pricing & Subscription (New Feature)
**What Users See:**
-   **Location-Based Pricing**: Pricing automatically adapts to the user's region. Users in **Sri Lanka** see prices in **LKR**, while others see **USD**.
-   **Tiered Plans**: Free, Starter, Pro, and Enterprise tiers with clear feature comparison.
-   **Billing Management**: A self-serve portal to view invoices, upgrade/downgrade plans, and manage payment methods (via PayHere integration).

**How It Works:**
-   **Geo-Detection**: Uses `ipapi` to detect the visitor's country code (e.g., "LK").
-   **Dynamic Currency**: Fetches live exchange rates and plan costs from the backend to display the correct currency context.

## 11. Technical Foundation
-   **Tracker Script**: A lightweight (~12KB gzipped) script optimized for loading speed. It uses `requestIdleCallback` to process data without blocking the main thread (checking UI responsiveness).
-   **Storage**:
    -   **ClickHouse**: For massive scale time-series data (events, clicks, performance metrics).
    -   **Supabase (PostgreSQL)**: For relational data (users, sites, plans, settings).
-   **Security**: All API endpoints are protected with strict CORS policies and authentication checks. Data is encrypted in transit and at rest.
