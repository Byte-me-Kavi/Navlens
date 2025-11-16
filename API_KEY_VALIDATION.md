# API Key Validation Implementation

## Overview

The system now validates that incoming events have a matching API key from the Supabase `sites` table before collecting data. This provides an additional security layer to prevent unauthorized or spoofed event collection.

## How It Works

### 1. **API Key in Tracker Script**

The `tracker.js` script now requires three data attributes:

```html
<script
  async
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR-SITE-ID"
  data-api-key="YOUR-API-KEY"
  data-api-host="https://navlens-rho.vercel.app"
></script>
```

- `data-site-id`: The unique site identifier
- `data-api-key`: **NEW** - The API key from Supabase sites.api_key
- `data-api-host`: The Navlens API endpoint

### 2. **Automatic Inclusion in Events**

When tracker.js sends events to `/api/collect`, it now includes the API key in the payload:

```javascript
const payload = JSON.stringify({
  events: eventsToSend,
  api_key: API_KEY,
});
```

### 3. **Server-Side Validation**

The `/api/collect` endpoint validates:

1. **API Key Present**: Checks that `api_key` is included in the request
2. **Site Exists**: Queries Supabase `sites` table for the `site_id`
3. **Key Match**: Verifies the provided API key matches `sites.api_key`

If any check fails:

- Event collection is **rejected with 403 Forbidden**
- Unauthorized attempts are **logged** for debugging
- No data is inserted into ClickHouse

### 4. **Automatic Snippet Generation**

When users view their site in "My Sites", the code snippet is automatically generated with their unique API key:

```tsx
// In SiteManager.tsx
const snippet = `<script 
  async 
  src="${NAVLENS_API_HOST}/tracker.js" 
  data-site-id="${site.id}"
  data-api-key="${site.api_key}"
  data-api-host="${NAVLENS_API_HOST}"
></script>`;
```

Users simply copy-paste the generated snippet into their website.

## Security Benefits

✅ **Prevents Unauthorized Collection**: Only sites with valid API keys can submit events
✅ **Prevents API Key Spoofing**: Site ID + API key combination must match
✅ **Prevents Event Injection**: Malicious actors can't fabricate data
✅ **Audit Trail**: All rejected attempts are logged
✅ **Per-Site Keys**: Each site has a unique API key, isolating data

## Implementation Details

### Files Modified

1. **`public/tracker.js`**

   - Added `data-api-key` attribute requirement
   - Includes API key in event payload
   - Validates all three attributes are present

2. **`app/api/collect/route.ts`**

   - Added `validateSiteAndApiKey()` function
   - Verifies API key matches Supabase record
   - Rejects unauthorized requests

3. **`app/dashboard/my-sites/SiteManager.tsx`**

   - Updated snippet code to include `site.api_key`
   - Users get pre-filled snippet with their API key

4. **`app/docs/page.tsx`**

   - Updated example snippets to show API key attribute
   - Added documentation about the required parameter

5. **`app/layout.tsx`**
   - Updated example tracker script
   - Added comment explaining all required attributes

### Database

No new database tables required. The `sites` table already has the `api_key` field:

```sql
SELECT id, site_name, api_key FROM public.sites;
```

## Validation Flow

```
Request to /api/collect
       ↓
Extract api_key from payload
       ↓
Extract site_id from events
       ↓
Query Supabase for site
       ↓
Verify api_key matches sites.api_key
       ↓
VALID? → Insert events into ClickHouse
INVALID? → Reject with 403 + log error
```

## Error Messages

| Scenario                   | Response                           | Status |
| -------------------------- | ---------------------------------- | ------ |
| Missing API key in request | "Invalid request: missing api_key" | 400    |
| Site not found             | "Invalid site_id or api_key"       | 403    |
| API key mismatch           | "Invalid site_id or api_key"       | 403    |
| All other errors           | "Failed to ingest events"          | 500    |

## User Experience

1. **Admin**: Generates site in Navlens dashboard → auto-generated API key
2. **Developer**: Copies snippet code with API key from dashboard
3. **Website**: Embeds script tag with unique site ID + API key
4. **Tracker**: Sends events with API key
5. **Backend**: Validates and processes authorized events

## Testing

Test the validation:

1. **Valid Request**: Use the auto-generated snippet → Events collect ✅
2. **Missing API Key**: Remove `data-api-key` from script → 400 error ✅
3. **Wrong API Key**: Use invalid key → 403 error ✅
4. **Wrong Site ID**: Use different site ID → 403 error ✅

## Migration Notes

Existing deployments need to:

1. Update tracker script snippets to include `data-api-key`
2. Verify all `sites` records have `api_key` values
3. Generate new snippets for all sites via the dashboard

Old snippet format (will not work):

```html
<!-- DEPRECATED - will not work -->
<script
  async
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR-SITE-ID"
  data-api-host="https://navlens-rho.vercel.app"
></script>
```

New snippet format (required):

```html
<!-- UPDATED - now required -->
<script
  async
  src="https://navlens-rho.vercel.app/tracker.js"
  data-site-id="YOUR-SITE-ID"
  data-api-key="YOUR-API-KEY"
  data-api-host="https://navlens-rho.vercel.app"
></script>
```
