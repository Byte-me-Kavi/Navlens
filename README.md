# Navlens Analytics

Navlens Analytics is a comprehensive, feature-based modular web analytics application that provides deep insights into user behavior. Built with a modern tech stack, Navlens goes beyond traditional pageview tracking by offering heatmaps, pixel-perfect session replays, frustration signal detection, form analytics, and client-side A/B testing. 

## 🚀 Features

### 1. Heatmap Visualizations
- **Click Heatmaps:** See exactly where users are clicking, categorized by frequency and viewport.
- **Scroll Heatmaps:** Understand how far users scroll and where they drop off (the "fold").
- **Hover/Attention Heatmaps:** See where users focus their mouse, indicating areas of high engagement.

### 2. Session Recording & Replay
- Pixel-perfect playback of user sessions using `rrweb`.
- Video-like controls (play, pause, seek, speed adjustment).
- Captures console logs, network requests, and web vitals.
- Privacy-first approach with automatic masking of sensitive inputs (passwords, credit cards, emails).

### 3. Frustration Signal Detection
Automatically identifies when users are struggling on your site:
- **Rage Clicks:** Multiple clicks on the same element in rapid succession.
- **Dead Clicks:** Clicks that result in no DOM change or response.
- **Confusion Scrolling:** Rapid up/down scrolling indicating user confusion.
- **Erratic Movement:** High velocity and unpredictable mouse movements.
- **Quick Exits & U-Turns:** Bouncing off a page quickly or hitting the back button immediately.

### 4. Form Analytics
Deep insights into how users interact with your forms:
- Form completion and drop-off rates.
- Field-level focus and blur tracking.
- Refill detection (identifying when users retype content).
- Average time spent per field.

### 5. A/B Testing & Experiments Engine
Run client-side visual tests without code deployment:
- Deterministic bucketing algorithm.
- 18 modification types supported (CSS changes, text replacement, element hiding, etc.).
- MutationObserver integration for dynamic content support.

### 6. User Feedback & Surveys
- Embedded feedback widget for bug reports, feature requests, and ratings (NPS).
- Timed surveys triggered by time on page, scroll depth, or exit intent.
- Built-in screenshot capture using `html2canvas`.

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router), React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Headless UI, Framer Motion
- **Visualization:** heatmap.js, D3.js (d3-sankey), Recharts
- **Icons:** Heroicons, Lucide React, React Icons

### Backend
- **Framework:** Next.js API Routes (26+ modular endpoints)
- **Primary Database:** Supabase (PostgreSQL with Row Level Security)
- **Analytics Database:** ClickHouse (Optimized for time-series events)

### Tracking & Recording
- **Session Replay:** rrweb, rrweb-player, rrweb-snapshot
- **Client Script:** Custom `tracker.js` (minified via Terser)

### Utilities
- PDF Generation: `@react-pdf/renderer`, `jspdf`
- Image Capture: `html-to-image`, `dom-to-image-more`
- Email integration: `nodemailer`

## 🏗️ Architecture

Navlens follows a Feature-based modular architecture utilizing SOLID principles.

```
heatmap-app/
├── app/api/              # API route handlers
├── features/             # Modular feature packages (Heatmaps, Forms, etc.)
├── components/           # Shared UI components
├── lib/                  # Core utilities (Auth, ClickHouse client, Encryption)
├── public/tracker.js     # Minified Client-side tracking script
└── supabase/             # Database schemas & configurations
```

### Data Flow
1. **Client Tracking:** The `tracker.js` script is embedded on the client website.
2. **Data Ingestion:** User interactions (clicks, scrolls, mouse movements) are batched and sent to the Next.js API Endpoints.
3. **Data Storage:** Time-series events are stored in ClickHouse, while user/application data is managed in Supabase.
4. **Visualization:** The Dashboard queries this data to generate heatmaps, replays, and insights.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v20+)
- Supabase Account
- ClickHouse Instance

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd heatmap-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory and add your ClickHouse and Supabase credentials.

4. **Build the tracker script:**
   Minify the client-side tracking scripts before deploying:
   ```bash
   npm run minify:tracker
   npm run minify:editor
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📊 Integration

To integrate Navlens tracking into a target website, simply include the minified tracker script in the `<head>` of the HTML:

```html
<script
  src="https://your-navlens-domain.com/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-key="YOUR_API_KEY"
></script>
```
