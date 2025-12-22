# Navlens Analytics SDK

Official SDK for [Navlens](https://navlens.com) - AI-powered heatmaps, session recording, and user behavior analytics.

![npm version](https://img.shields.io/npm/v/navlens)
![bundle size](https://img.shields.io/bundlephobia/minzip/navlens)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

## Features

- 🔥 **Click Heatmaps** - Visualize where users click
- 📜 **Scroll Tracking** - See how far users scroll
- 🎬 **Session Recording** - Watch user sessions
- 📝 **Form Analytics** - Understand form behavior
- 🧪 **A/B Testing** - Run experiments
- ⚡ **Lightweight** - Under 10KB gzipped
- 🔒 **Privacy First** - GDPR & CCPA compliant

## Installation

```bash
npm install navlens
# or
yarn add navlens
# or
pnpm add navlens
```

## Quick Start

### React / Next.js

```tsx
// app/layout.tsx or _app.tsx
import { NavlensProvider } from 'navlens/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NavlensProvider 
          siteId="your-site-id" 
          apiKey="your-api-key"
        >
          {children}
        </NavlensProvider>
      </body>
    </html>
  );
}
```

### Track Custom Events

```tsx
import { useNavlens } from 'navlens/react';

function CheckoutButton() {
  const { track } = useNavlens();

  const handleClick = () => {
    track('checkout_started', {
      cartValue: 99.99,
      items: 3
    });
  };

  return <button onClick={handleClick}>Checkout</button>;
}
```

### Identify Users

```tsx
import { useNavlens } from 'navlens/react';

function UserProfile({ user }) {
  const { identify } = useNavlens();

  useEffect(() => {
    identify(user.id, {
      email: user.email,
      plan: user.plan,
      signupDate: user.createdAt
    });
  }, [user]);
}
```

### Vanilla JavaScript

```typescript
import { navlens } from 'navlens';

// Initialize
navlens.init({
  siteId: 'your-site-id',
  apiKey: 'your-api-key'
});

// Track events
navlens.track('button_clicked', { buttonId: 'cta' });

// Identify users
navlens.identify('user_123', { email: 'user@example.com' });
```

## Configuration Options

```typescript
navlens.init({
  siteId: 'your-site-id',        // Required
  apiKey: 'your-api-key',        // Required
  
  // Optional settings
  debug: false,                   // Enable console logging
  autoTrack: true,                // Start tracking on init
  sessionRecording: true,         // Enable session recording
  clickTracking: true,            // Enable click tracking
  scrollTracking: true,           // Enable scroll tracking
  formAnalytics: true,            // Enable form analytics
  respectDoNotTrack: true,        // Honor browser DNT setting
  requireConsent: false,          // Require consent before tracking
  maskInputs: true,               // Mask input values for privacy
  excludeSelectors: ['.no-track'], // Selectors to exclude
  excludePaths: ['/admin/*'],      // Paths to exclude
});
```

## React Hooks & Components

### NavlensProvider

Wrap your app to enable analytics:

```tsx
<NavlensProvider siteId="..." apiKey="..." debug={true}>
  <App />
</NavlensProvider>
```

### useNavlens()

Access all tracking functions:

```tsx
const { 
  track,          // Track custom events
  identify,       // Identify users
  setConsent,     // Set cookie consent
  getConsent,     // Get consent status
  reset,          // Reset session
  getSessionId,   // Get current session ID
  getVisitorId    // Get visitor ID
} = useNavlens();
```

### useTrack()

Shorthand for tracking:

```tsx
const track = useTrack();
track('event_name', { property: 'value' });
```

### TrackOnMount

Track page views automatically:

```tsx
<TrackOnMount event="page_viewed" properties={{ page: 'pricing' }} />
```

### IdentifyOnMount

Identify user on component mount:

```tsx
<IdentifyOnMount userId={user.id} traits={{ email: user.email }} />
```

## Cookie Consent

For GDPR compliance, you can require consent before tracking:

```tsx
<NavlensProvider 
  siteId="..." 
  apiKey="..." 
  requireConsent={true}
>
  <App />
</NavlensProvider>
```

Then set consent when the user accepts:

```tsx
const { setConsent } = useNavlens();

const handleAcceptCookies = () => {
  setConsent(true);
};
```

## Script Tag Alternative

If you prefer not to use npm, add this to your HTML:

```html
<script 
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="your-site-id"
  data-api-key="your-api-key"
></script>
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { navlens, NavlensConfig, NavlensInstance } from 'navlens';
import { NavlensProvider, useNavlens } from 'navlens/react';
```

## License

MIT © [Navlens](https://navlens.com)
