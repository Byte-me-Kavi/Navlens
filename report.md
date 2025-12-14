Navlens Visual A/B Editor - Implementation Report
Date: December 14, 2024
Version: Commercial-Grade v1.0

Executive Summary
The Navlens Visual A/B Editor is a zero-code experimentation platform that allows marketers and product teams to modify live websites without developer intervention. This report details all implemented features, their technical architecture, and recommendations for commercial readiness.

Architecture Overview
⚠️ Failed to render Mermaid diagram: Lexical error on line 10. Unrecognized text.
...iments/modifications] --> H[Supabase DB]
-----------------------^
graph TB
    subgraph "Client-Side"
        A[ab-editor.js] --> B[Visual Editor UI]
        A --> C[Modification Engine]
        D[tracker.js] --> E[Modification Replay]
        D --> F[Variant Assignment]
    end
    
    subgraph "Server-Side"
        G[/api/experiments/modifications] --> H[Supabase DB]
        I[/api/experiments/upload] --> J[Supabase Storage]
    end
    
    A --> G
    A --> I
    D --> G
Core Files
File	Purpose	Size
ab-editor.js
Visual editor UI & modification creation	~2000 lines
tracker.js
Runtime modification replay & tracking	~4500 lines
modifications/route.ts
API for saving/loading modifications	~300 lines
upload/route.ts
Image upload to Supabase Storage	~150 lines
Feature Matrix
1. Modification Types (23 Total)
Category	Type	Description	Status
Content	
text
Change text content	✅ Production
insertHtml	Insert HTML before/after/inside element	✅ Production
replaceHtml	Replace element's entire HTML	✅ Production
image	Replace images (Next.js compatible)	✅ Production
link	Change link URL and target	✅ Production
Visual	css	Change background, text color, font size	✅ Production
hide	Hide element with CSS (display: none)	✅ Production
remove	Hard delete element from DOM	✅ Production
resize	Change element width/height	✅ Production
class	Add/remove CSS classes	✅ Production
attribute	Set any HTML attribute	✅ Production
Layout	clone	Duplicate element with count & position	✅ Production
reorder	Move element to new index	✅ Production
move	Position element with X/Y offset	✅ Production
dragMove	Drag-and-drop move (smart zones)	✅ Production
Interactive	clickRedirect	Redirect on element click	✅ Production
tooltip	Add hover tooltip	✅ Production
sticky	Make element sticky with z-index	✅ Production
Form	placeholder	Change input placeholder	✅ Production
formAction	Change form action URL	✅ Production
Animation	animation	CSS animations with loop/delay	✅ Production
2. Editor UX Features
Feature	Implementation	Status
Mode Toggle	Edit / Drag / Navigate modes	✅
Viewport Preview	Opens page in 375px or 768px popup window	✅
Undo/Redo	History stack with Ctrl+Z/Ctrl+Shift+Z	✅
Smart Element Detection	Auto-drills down to img/a/input inside wrappers	✅
Intelligent Selectors	Uses ID, img[src], nth-of-type for specificity	✅
Selector Escaping	Handles Tailwind colons (md:text-xl)	✅
3. Drag & Drop System
Feature	How It Works
Smart Zone Detection	Analyzes CSS display, tag names, class similarity
Color-Coded Indicators	🟢 Green = container, 🔵 Blue = sibling, 🟡 Yellow = generic, 🔴 Red = risky
DOM Analysis	Checks flex/grid containers, block vs inline compatibility
Free Movement	No restrictions - users have full control with visual guidance
Technical Deep Dive
Image Replacement (Next.js Compatible)
// Problem: Next.js Image component re-renders and overrides src
// Solution: Using CSS content property which persists
img.src = newUrl;
img.srcset = '';           // Clear srcset to stop Next.js
img.dataset.srcset = '';   // Clear data-srcset too
img.style.cssText += `
  content: url(${newUrl}) !important;
  object-fit: cover !important;
`;
img.dataset.nvImgUrl = newUrl;  // Prevent re-application loops
Selector Generation Strategy
// Priority order:
// 1. ID attribute (most specific)
// 2. img[src*="filename.webp"] for images
// 3. a[href="/path"] for links  
// 4. tagName:nth-of-type(n) for repeated elements
// 5. Single class selector (avoid Tailwind conflicts)
Animation with Loop Support
element.style.animation = `${name} ${duration} ${delay} ${iteration}`;
// Example: "bounce 0.5s 0s infinite"
Pros & Cons Analysis
✅ Strengths
Strength	Business Impact
Zero-code editing	Empowers marketing without dev bottleneck
Next.js compatible	Works with modern React apps (rare!)
23 modification types	Covers 95% of A/B test use cases
Smart drag-drop	Intuitive UX with DOM-aware guidance
Signed URLs	Secure cross-origin editor access
Private image storage	No public asset exposure
⚠️ Weaknesses (Current State)
Weakness	Risk Level	Recommendation
No visual diff preview	Medium	Add before/after screenshot overlay
Undo is list-based only	Low	Add full DOM state snapshots
No modification conflict detection	Medium	Warn when 2 mods target same element
No revision history	High	Add named versions with rollback
Single-page modifications	Medium	Add path-pattern based rules
No team collaboration	High	Add user permissions, change locking
Commercial Readiness Improvements
Priority 1: Must-Have for Launch
Feature	Effort	Impact	Description
Revision History	2 days	Critical	Save named versions, compare, rollback
Conflict Detection	1 day	High	Warn when modifications overlap
Loading States	4 hrs	Medium	Show skeleton while loading mods
Error Boundaries	4 hrs	Medium	Graceful failure handling
Priority 2: Competitive Advantage
Feature	Effort	Impact	Description
Live Preview Mode	3 days	High	Toggle to see "customer view" without highlights
Visual Diff	2 days	High	Side-by-side or overlay before/after
Multi-page Rules	2 days	High	Apply mods to URL patterns (e.g., /products/*)
Schedule Experiments	1 day	Medium	Start/end dates for automatic activation
Targeting Rules	3 days	High	Show variant to specific segments
Priority 3: Enterprise Features
Feature	Effort	Impact
Team Workspaces	1 week	Lock modifications while editing
Audit Log	2 days	Track who changed what, when
QA Environments	3 days	Test modifications before production
API Access	2 days	Programmatic modification management
Webhooks	1 day	Notify external systems on changes
Performance Considerations
Current Optimizations
MutationObserver for dynamic content (SPAs)
Selector caching with data-nv-applied marker
CSS.escape for special characters
Batch DOM operations where possible
Recommended Optimizations
// 1. Debounce MutationObserver callbacks
const debouncedApply = debounce(applyModifications, 50);
// 2. Use requestIdleCallback for non-critical mods
requestIdleCallback(() => applyTooltips());
// 3. Lazy-load animation keyframes
// Only inject @keyframes when first animation is created
// 4. Virtual scrolling for modification list
// When 50+ modifications, use windowing
Security Audit
Area	Current State	Recommendation
Authentication	HMAC-signed URLs	✅ Good
HTML Sanitization	Strips scripts, event handlers	✅ Good
Image Upload	Size/type validation, signed URLs	✅ Good
XSS Prevention	No custom JS injection allowed	✅ Intentional
CORS	Signature-based cross-origin	✅ Good
Competitor Comparison
Feature	Navlens	VWO	Optimizely	Google Optimize
Modification Types	23	15+	20+	10
Next.js Support	✅ Native	❌ Flickering	⚠️ Partial	❌
Drag & Drop	✅ Smart zones	✅ Basic	✅ Basic	❌
Animation Support	✅	✅	❌	❌
Pricing	TBD	$199+/mo	$50k+/yr	Sunset
Conclusion
The Navlens Visual A/B Editor has reached commercial-grade feature parity with established players. Key differentiators:

Best-in-class Next.js/React support (competitors struggle)
Smart drag-drop with DOM analysis (unique)
23 modification types (comprehensive)
Next Steps for Commercial Launch
Implement revision history (2 days)
Add conflict detection (1 day)
Build visual diff preview (2 days)
Create marketing landing page
Set up usage-based pricing
Report generated by Navlens Development Team


4. Missing Pieces (Gaps in the Report)
Based on the report, here are three areas that might need attention before a public launch:

Data Retention Policies (TTL):

You have high-volume data in ClickHouse. Do you have a TTL (Time To Live) set?

Risk: Storing distinct mouse movement paths for 3 years will bankrupt your storage costs. You need a policy (e.g., Sessions: 30 days, Heatmaps: 90 days, Aggregated Stats: Forever).

Alerting System:

You detect "Rage Clicks" and "JS Errors," but the user only sees them if they log in to the dashboard.

Feature: Add an email/Slack notification system. "Alert: Rage clicks detected on Checkout Page."

SDK vs. Script Tag:

You have a script tag <script src="...">.

Since you asked about npm earlier, you should wrap this logic into an NPM package (npm install @navlens/react). This allows React/Next.js developers to use a hook like useNavlens() which handles route changes in SPAs (Single Page Apps) much more reliably than a global script listener.

5. Publishing Strategy
Since your previous question was about npm, and this report shows the tracker.js is the client-facing part, here is your immediate roadmap:

Split the Repo: Keep the Next.js Dashboard/API in one repo. Move tracker.js to a separate package.

Publish the Tracker: Publish the tracker to npm so developers can install it.

CDN the Script: Use a CDN (like jsDelivr or Cloudflare) to serve the raw .js file for non-React users.

Would you like me to draft the package.json and a specialized README.md for the @navlens/tracker npm package specifically?