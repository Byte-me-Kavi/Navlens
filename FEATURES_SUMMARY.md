# Navlens - Features Quick Reference

## 🎯 Core Features

### 1. **Heatmaps** 🗺️

- **Click Heatmaps** - Where users click most
- **Scroll Heatmaps** - How far users scroll
- **Hover Heatmaps** - Attention/focus areas
- **Multi-Device** - Desktop, tablet, mobile views

### 2. **Session Replay** 📹

- Pixel-perfect playback with rrweb
- Video controls (play, pause, speed)
- Timeline with event markers
- DevTools panel (console logs, network)
- Frustration signal overlays

### 3. **Form Analytics** 📝

- Field-level drop-off analysis
- Refill detection (user confusion)
- Time spent per field
- Completion vs abandonment rates
- Problem field identification

### 4. **Frustration Detection** 😤

- **Rage Clicks** - 3+ rapid clicks
- **Dead Clicks** - Clicks with no response
- **Confusion Scrolling** - Rapid up/down scrolling
- **Erratic Movement** - Frantic mouse behavior
- **Quick Exits** - Leave within 3 seconds

### 5. **A/B Testing** 🧪

- Visual editor (no code required)
- 18 modification types
- Statistical significance testing
- Real-time results
- Winner declaration with confidence levels

### 6. **Funnels** 🔀

- Multi-step conversion tracking
- Drop-off analysis at each step
- Time between steps
- ClickHouse windowFunnel optimization
- Sankey diagram visualization

### 7. **User Journeys** 🛤️

- Sankey diagram of page flows
- Common navigation patterns
- Dead-end identification
- Path optimization insights

### 8. **Cohorts** 👥

- User segmentation by behavior
- Custom rule creation
- Cohort comparison
- Behavioral metrics per cohort

### 9. **Feedback & Surveys** 💬

- In-page feedback widget
- Star ratings (1-5)
- NPS surveys (0-10)
- Screenshot capture
- Trigger-based surveys

### 10. **Performance Monitoring** ⚡

- Core Web Vitals (LCP, FCP, CLS, INP, TTFB)
- Page load times
- Performance by device/location
- Percentile distribution

### 11. **Element Tracking** 🎯

- Specific button/link analysis
- Click-through rates
- Engagement metrics
- Dead click detection per element

### 12. **Developer Tools** 🛠️

- Console log capture
- Network request monitoring
- JavaScript error tracking
- Debug information per session

---

## 📊 Technical Specifications

### Architecture

```
Client (tracker.js) → API Routes → ClickHouse/Supabase → Dashboard
```

### Stack

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind
- **Backend:** Next.js API Routes (26+ endpoints)
- **Analytics DB:** ClickHouse (time-series)
- **App DB:** Supabase (PostgreSQL)
- **Session Replay:** rrweb
- **Visualization:** heatmap.js, D3.js, d3-sankey

### Key Metrics

- **Lines of Code (tracker.js):** 4,585 lines
- **API Endpoints:** 26+
- **Feature Modules:** 9
- **Event Types:** 15+
- **Database Tables:** 10+
- **Max Events/Request:** 100
- **Session Timeout:** 30 minutes
- **Rate Limit:** 1,000 req/min per IP

---

## 🔐 Security Features

✅ JWT Authentication  
✅ Row-Level Security (RLS)  
✅ CORS Whitelist Protection  
✅ Rate Limiting (IP + Site)  
✅ PII Scrubbing (email, phone, CC)  
✅ Input Validation & Sanitization  
✅ SQL Injection Prevention  
✅ HTTPS/TLS Encryption  
✅ Request Size Limits (1MB)

---

## ⚡ Performance Optimizations

✅ ClickHouse Query Optimization  
✅ Next.js Caching Layer  
✅ Gzip Compression (70% reduction)  
✅ Event Batching  
✅ Connection Pooling  
✅ Lazy Loading  
✅ Debouncing/Throttling  
✅ Materialized Views  
✅ CDN for Static Assets

---

## 🎨 Dashboard Pages

| Page           | Route                            | Purpose                          |
| -------------- | -------------------------------- | -------------------------------- |
| Overview       | `/dashboard`                     | Key metrics, real-time activity  |
| Heatmaps       | `/dashboard/heatmaps`            | Click/scroll/hover visualization |
| Sessions       | `/dashboard/sessions`            | Session list with replay         |
| Form Analytics | `/dashboard/form-analytics`      | Form completion analysis         |
| Funnels        | `/dashboard/funnels`             | Conversion funnel tracking       |
| A/B Tests      | `/dashboard/experiments`         | Experiment management            |
| Frustration    | `/dashboard/frustration-signals` | Frustration hotspots             |
| Feedback       | `/dashboard/feedback`            | User feedback inbox              |
| Journeys       | `/dashboard/journey`             | User navigation flows            |
| Cohorts        | `/dashboard/cohorts`             | User segmentation                |
| Performance    | `/dashboard/performance`         | Web Vitals metrics               |
| Sites          | `/dashboard/my-sites`            | Site configuration               |
| Settings       | `/dashboard/settings`            | Account management               |

---

## 📦 Tracker.js Capabilities

### Data Collection

✅ Click tracking (with dead click detection)  
✅ Scroll tracking (with confusion detection)  
✅ Mouse movement & hover attention  
✅ Session recording (rrweb)  
✅ DOM snapshot capture  
✅ Form field interactions  
✅ Console logs & network requests  
✅ Web Vitals (Core & Custom)  
✅ Frustration signal detection  
✅ A/B test bucketing  
✅ Feedback widget display  
✅ Survey triggering

### Smart Features

🧠 Hash-based DOM change detection  
🧠 MutationObserver for dead clicks  
🧠 Douglas-Peucker path simplification  
🧠 Attention zone classification  
🧠 PII scrubbing (automatic)  
🧠 Event batching & retry queue  
🧠 FNV-1a deterministic bucketing  
🧠 Client-side compression

---

## 🎯 Use Cases

### For Product Managers

- Understand user behavior patterns
- Identify drop-off points in funnels
- A/B test new features
- Collect user feedback
- Track feature adoption

### For UX Designers

- Visualize attention hotspots
- Find frustrating UI elements
- Optimize form layouts
- Test design variations
- Improve navigation flows

### For Developers

- Debug user-reported issues
- Monitor JavaScript errors
- Track performance regressions
- View console logs per session
- Analyze network requests

### For Marketing Teams

- Optimize conversion funnels
- Test different messaging
- Track campaign performance
- Analyze user journeys
- Improve landing pages

### For Data Analysts

- Deep-dive into user segments
- Cohort analysis
- Custom event tracking
- Export data for analysis
- Statistical significance testing

---

## 🚀 Quick Start

### 1. Add Tracker to Website

```html
<script
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-key="YOUR_API_KEY"
></script>
```

### 2. Start Collecting Data

Tracker automatically captures:

- All clicks
- Scroll behavior
- Form interactions
- Session recordings
- Performance metrics

### 3. View Dashboard

Visit dashboard to see:

- Real-time analytics
- Heatmaps
- Session replays
- Form analytics
- And more!

---

## 📈 Competitive Advantages

| Feature               | Navlens | Hotjar | FullStory | Crazy Egg |
| --------------------- | ------- | ------ | --------- | --------- |
| Heatmaps              | ✅      | ✅     | ✅        | ✅        |
| Session Replay        | ✅      | ✅     | ✅        | ❌        |
| A/B Testing           | ✅      | ❌     | ❌        | ❌        |
| Form Analytics        | ✅      | ✅     | ✅        | ❌        |
| Funnels               | ✅      | ✅     | ✅        | ❌        |
| Cohorts               | ✅      | ❌     | ✅        | ❌        |
| Frustration Detection | ✅      | ⚠️     | ✅        | ❌        |
| DevTools Data         | ✅      | ❌     | ✅        | ❌        |
| Self-Hosted Option    | ✅      | ❌     | ❌        | ❌        |
| Unlimited Events      | ✅      | ❌     | ❌        | ❌        |
| Open Source           | 🔄      | ❌     | ❌        | ❌        |

✅ = Full Support | ⚠️ = Partial | ❌ = Not Available | 🔄 = Coming Soon

---

## 📞 Support & Resources

- **Documentation:** Full guide in `FEATURES_REPORT.md`
- **API Reference:** `API_REFERENCE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Migration Guide:** `MIGRATION_GUIDE.md`

---

**Version:** 2.1.0  
**Last Updated:** December 14, 2025
