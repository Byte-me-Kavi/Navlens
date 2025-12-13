Navlens Heatmap Application - Functionality Report
This document provides a comprehensive overview of all implemented functionality in the Navlens Heatmap Application, explaining how each feature works and its implementation flow.

Table of Contents
Architecture Overview
Client-Side Tracker (tracker.js)
Dashboard Features
Heatmap Visualization
Session Replay
Form Analytics
Frustration Signals
Feedback System
Funnels
API Layer
Data Storage
Architecture Overview
The application follows a feature-based modular architecture with SOLID principles:

heatmap-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # 26 API routes
│   └── dashboard/         # Dashboard pages
├── features/              # 9 feature modules
│   ├── heatmap/          # Heatmap visualization
│   ├── form-analytics/   # Form tracking
│   ├── funnels/          # Funnel analysis
│   ├── frustration-signals/
│   ├── feedback/
│   ├── dom-snapshot/
│   ├── element-tracking/
│   ├── dev-tools/
│   └── customer-feedback/
├── components/            # Shared UI components
├── lib/                   # Core utilities (auth, clickhouse, encryption)
└── public/tracker.js      # Client-side tracking script
Data Flow:

tracker.js
Fetch
User's Website
API Endpoints
ClickHouse Database
Supabase
Dashboard
Client-Side Tracker
The tracker (
public/tracker.js
, 3824 lines) is embedded on client websites and captures all user behavior.

Configuration
<script 
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR_SITE_ID"
  data-api-key="YOUR_API_KEY"
></script>
Core Features
1. Session Management
30-minute timeout with automatic renewal
Generates unique session_id and visitor_id
Persisted in localStorage
Flow:

Page Load → Check localStorage for existing session
         → If expired (>30min), create new session
         → Update lastActivity on every interaction
2. Click Tracking
Captures every click with comprehensive metadata:

Data Captured	Description
x, y	Page coordinates
click_x, click_y	Relative coordinates
element_selector	CSS selector path
element_tag/id/classes	Element metadata
is_dead_click	Click had no effect
is_interactive	Element is clickable
Dead Click Detection Flow:

Click Event → Start MutationObserver
           → Wait 300ms for DOM changes
           → If no changes AND element not interactive → Dead Click
           → Send event with is_dead_click=true
3. Scroll Tracking
Tracks scroll depth and confusion scrolling:

// Configuration
SESSION_TIMEOUT_MS: 30 * 60 * 1000,  // 30 minutes
CONFUSION_THRESHOLD: 5,              // Direction changes
TIME_WINDOW_MS: 2000                 // Detection window
Confusion Scroll Detection:

Monitors rapid up/down scroll direction changes
If ≥5 direction changes within 2 seconds → Confusion event
Calculates confusion_score (0-1) based on intensity
4. Mouse Movement / Hover Tracking
Builds attention heatmaps by tracking:

Mouse position sampling (every 50ms)
Element dwell times (minimum 500ms to count)
Velocity and direction changes
Attention zones (heading, content, interactive, media, navigation, form)
Path Simplification: Uses Douglas-Peucker algorithm to reduce data while preserving path shape.

5. rrweb Session Recording
Full session replay using rrweb:

rrweb.record({
  sampling: {
    mousemove: 50,
    mouseInteraction: true,
    scroll: 150,
    input: 'last'
  },
  maskAllInputs: true,  // Privacy protection
})
Buffer Management:

Max 100 events per batch
Flush every 10 seconds or when buffer full
Throttled to prevent request flooding (min 5s between flushes)
6. DOM Snapshot Capture
Captures page structure using rrweb-snapshot:

Device Type	Width	Height
Mobile	375	667
Tablet	768	1024
Desktop	1440	900
Hash-based Change Detection:

Generates DOM structure hash (djb2 algorithm)
Checks every 30 minutes for changes
Re-captures snapshot if hash changes
7. Form Analytics
Tracks form field interactions:

Event Type	Data Captured
focus	Field entry time
blur	Time spent, change count, refill detection
submit
Successful completion
abandon	Left without submitting
Refill Detection:

Monitors if user deletes >50% of field content
Marks as was_refilled if they retype
8. Developer Tools Data
Captures debugging information:

Console logs: log, warn, error, info, debug (max 100 events)
Network requests: fetch and XHR (max 200 events)
Web Vitals: LCP, FCP, CLS, INP, TTFB
9. PII Scrubbing
Automatic redaction of sensitive data:

Pattern	Replacement
Email	[EMAIL_REDACTED]
Phone	[PHONE_REDACTED]
Credit Card	[CC_REDACTED]
SSN	[SSN_REDACTED]
IP Address	[IP_REDACTED]
10. Data Transmission
Compression: gzip using CompressionStream API
Retry Queue: 3 retries with 5-second delay
Keepalive Limit: 60KB max for keepalive requests
Batch Processing: Events buffered and sent in batches
Dashboard Features
Located at /dashboard, provides analytics overview.

Navigation Structure
Route	Feature
/dashboard	Overview with stats cards
/dashboard/my-sites	Site management
/dashboard/heatmaps	Heatmap analytics hub
/dashboard/sessions	Session recordings
/dashboard/funnels	Funnel analysis
/dashboard/feedback	User feedback
/dashboard/frustration-signals	Frustration detection
/dashboard/form-analytics	Form analytics
/dashboard/settings	Configuration
/dashboard/experiments	A/B Testing (Coming Soon)
Overview Dashboard Stats
Displays key metrics:

Total Clicks (with trend)
Total Sessions (with trend)
Average Scroll Depth (with trend)
Total Heatmaps (with trend)
Heatmap Visualization
The heatmap feature provides visual representation of user interactions.

Types of Heatmaps
Type	Description	Data Source
Click Heatmaps	Where users click	
click
 events
Scroll Heatmaps	How far users scroll	scroll events
Move/Attention	Mouse movement patterns	mouse_move events
Cursor Paths	Actual cursor trajectories	Path data
Implementation Flow
ClickHouse
API Layer
SnapshotViewer
HeatmapViewer
Dashboard User
ClickHouse
API Layer
SnapshotViewer
HeatmapViewer
Dashboard User
Select site/page/device
GET /api/get-snapshot
Query dom_snapshots
Snapshot HTML
Snapshot data
Render in iframe
GET /api/heatmap-clicks
Aggregate click data
Heat points
[{x, y, value}, ...]
Overlay heatmap canvas
Key Components
Component	Purpose
HeatmapViewer
Main orchestrator
SnapshotViewer
Renders DOM in iframe
HeatmapCanvas
Canvas-based heat rendering
ScrollHeatmapOverlay
Scroll depth visualization
CursorPathsOverlay
Mouse trajectory lines
Smart Elements Feature
Overlay that highlights:

Blue outlines: Interactive elements (links, buttons)
Red outlines: Dead click hotspots
Session Replay
Full session playback using rrweb.

Flow
rrweb-player
ClickHouse
/api/sessions
Sessions Page
rrweb-player
ClickHouse
/api/sessions
Sessions Page
GET /api/sessions?siteId=X
Query rrweb_events
Session list
Sessions with metadata
GET /api/sessions/[id]/events
Get session events
rrweb event array
Events JSON
Initialize replay
Video-like playback
Session Metadata
Field	Description
session_id	Unique identifier
visitor_id	Visitor tracking
device_type	mobile/tablet/desktop
duration	Session length
page_views	Pages visited
events_count	Total interactions
Form Analytics
Analyze form completion and drop-off rates.

Tracked Metrics
Metric	Description
Field Drop-off	Which fields cause abandonment
Time-to-Fill	How long each field takes
Refill Rate	Fields users correct
Completion Rate	Forms submitted vs started
Data Structure
interface FormEvent {
  form_id: string;
  field_id: string;
  field_name: string;
  field_type: string;
  field_index: number;
  interaction_type: 'focus' | 'blur' | 'submit' | 'abandon';
  time_spent_ms?: number;
  change_count?: number;
  was_refilled?: boolean;
}
Frustration Signals
Detects user frustration through behavior patterns.

Signal Types
Signal	Detection Method
Dead Clicks	Clicks with no DOM response
Rage Clicks	Multiple rapid clicks (3+ in 1s)
Confusion Scrolling	Rapid up/down scrolling
Erratic Cursor	High direction changes/distance ratio
Form Abandonment	Started but not submitted
API Endpoint
GET /api/frustration-signals?siteId=X&startDate=Y&endDate=Z

Returns aggregated frustration data per page.

Feedback System
Collect and manage user feedback.

Features
Configurable feedback widget
Rating and text feedback
Session linking (View Session button)
Timestamp and context capture
Configuration Options
Setting	Purpose
Theme	Light/dark/custom
Position	Screen location
Trigger	Button/automatic
Fields	Rating, text, etc.
Funnels
Analyze user journey through defined steps.

Funnel Structure
interface Funnel {
  id: string;
  name: string;
  site_id: string;
  steps: FunnelStep[];
  created_at: string;
}
interface FunnelStep {
  name: string;
  page_path: string;
  order: number;
}
Metrics
Metric	Description
Conversion Rate	Start to completion
Step Drop-off	Where users leave
Average Time	Per step duration
API Layer
Event Ingestion API
The primary entry point for all tracker events:

POST /api/v1/ingest

interface IngestPayload {
  events: TrackingEvent[];
  siteId: string;
}
Full API Reference
Endpoint	Method	Purpose
/api/v1/ingest	POST	Event ingestion
/api/rrweb-events	POST	Session recording
/api/dom-snapshot	POST	DOM snapshots
/api/v1/form-events	POST	Form analytics
/api/v1/debug-events	POST	Dev tools data
/api/heatmap-clicks	GET	Click heatmap data
/api/heatmap-scrolls	GET	Scroll heatmap data
/api/hover-heatmap	GET	Attention heatmap
/api/cursor-paths	GET	Cursor trajectories
/api/get-snapshot	GET	DOM snapshot retrieval
/api/sessions	GET	Session list
/api/sessions/[id]	GET	Session details
/api/frustration-signals	GET	Frustration data
/api/feedback	GET/POST	Feedback CRUD
/api/funnels	GET/POST	Funnel CRUD
/api/dashboard-stats	GET	Overview metrics
/api/element-clicks	GET	Element analysis
Data Storage
ClickHouse Tables
High-performance analytics database:

Table	Purpose
events	All tracking events
rrweb_events	Session recordings
dom_snapshots	Page snapshots
form_events	Form analytics
debug_events	Dev tools data
Supabase Tables
Relational data storage:

Table	Purpose
sites	Site configuration
users	User accounts
funnels	Funnel definitions
feedback	User feedback
feedback_config	Widget settings
Security Features
Feature	Implementation
API Key Validation	Header-based authentication
Rate Limiting	Per-endpoint limits
Encryption	Response encryption for sensitive data
PII Scrubbing	Automatic on tracker side
CORS	Configured for tracker requests
Core Libraries
Library	Location	Purpose
auth.ts
lib/	Authentication helpers
clickhouse.ts
lib/	ClickHouse client
encryption.ts
lib/	Data encryption
ratelimit.ts
lib/	Rate limiting
validation.ts
lib/	Input validation
Report generated: December 13, 2025