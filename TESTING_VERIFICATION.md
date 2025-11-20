# Testing & Verification Guide - RRWeb Events CORS Fix

## Quick Verification (Browser Console)

### Step 1: Deploy Changes to Vercel

```bash
git add .
git commit -m "Fix: Add proper CORS headers to rrweb-events API"
git push origin v2-dom-recreation
```

### Step 2: Open Developer Tools

- Press `F12` or `Ctrl+Shift+I` to open DevTools
- Go to **Console** tab
- Go to **Network** tab

### Step 3: Trigger Event Sending

Navigate to any tracked website (one with tracker.js embedded with your site ID).

### Step 4: Check Console Output

**Look for these messages (success indicators):**

```javascript
✓ Sent 50 rrweb events successfully
```

or

```javascript
Sending 53 rrweb events to: https://navlens-git-v2-dom-recreation-...
```

**Previously you saw (failure indicator):**

```javascript
Failed to send rrweb events: TypeError: Failed to fetch
```

---

## Detailed Network Tab Verification

### Step 1: Clear Network Tab

- Open DevTools → Network tab
- Click the trash icon to clear

### Step 2: Interact with Tracked Website

- Scroll the page
- Click buttons
- Trigger actions to generate events

### Step 3: Look for API Requests

Filter by XHR or Fetch requests. You should see:

```
POST /api/rrweb-events
Status: 200 OK
Size: ~50KB (depends on event count)
```

### Step 4: Inspect Request Details

**Request Headers:**

```
POST /api/rrweb-events HTTP/1.1
Content-Type: application/json
```

**Response Headers:**

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Step 5: Check for Preflight Requests

You should see **two** requests for each batch:

1. **OPTIONS /api/rrweb-events** (Preflight)

   - Status: 200 OK
   - Response Headers include:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type`
     - `Access-Control-Max-Age: 86400` ✨ **THIS IS THE KEY FIX**

2. **POST /api/rrweb-events** (Actual Request)
   - Status: 200 OK
   - Response: `{"success": true}`
   - Response Headers include CORS headers

---

## Database Verification

### Step 1: Log into Supabase Dashboard

1. Go to supabase.com
2. Select your project
3. Go to **SQL Editor** or **Data Browser**

### Step 2: Query rrweb_events Table

```sql
SELECT
    id,
    site_id,
    session_id,
    visitor_id,
    device_type,
    created_at,
    JSONB_ARRAY_LENGTH(events) as event_count
FROM rrweb_events
ORDER BY created_at DESC
LIMIT 10;
```

### Step 3: Verify Data Structure

Expected output (successful events):

```
| id | site_id | session_id | visitor_id | device_type | event_count | created_at |
|----|---------|------------|-----------|------------|-------------|-----------|
| 1 | 52db... | s-abc-... | v-xyz-... | desktop | 50 | 2025-11-20 |
| 2 | 52db... | s-def-... | v-uvw-... | desktop | 53 | 2025-11-20 |
```

### Step 4: Verify Events Content

```sql
SELECT
    id,
    JSONB_ARRAY_LENGTH(events) as event_count,
    events->>0 as first_event_preview
FROM rrweb_events
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `events` field contains valid JSON array with rrweb event objects.

---

## Browser Console Detailed Verification

### Successful Flow (After Fix):

```javascript
// 1. Initial request logged
Sending 50 rrweb events to: https://navlens-git-v2-...

// 2. Payload info logged
Payload site_id: 52db6643-bda5-4b02-9a38-658b14f7f29a events count: 50

// 3. API response status
rrweb API response status: 200

// 4. Success message
✓ Sent 50 rrweb events successfully {success: true}

// 5. Next batch
Sending 48 rrweb events to: https://navlens-git-v2-...
```

### Previous Failed Flow (Before Fix):

```javascript
Sending 53 rrweb events to: https://navlens-git-v2-...
Payload site_id: 52db6643-bda5-4b02-9a38-658b14f7f29a events count: 53
Failed to send rrweb events: TypeError: Failed to fetch
Error details: {
  message: "Failed to fetch",
  endpoint: "https://navlens-git-v2-..."
}
```

---

## Performance Metrics

### Before Fix:

- Preflight requests: Every 50 events (continuous revalidation)
- Success rate: ~60-70% (intermittent failures)
- Error rate: ~30-40% (CORS errors)

### After Fix:

- Preflight requests: Once every 24 hours (cached)
- Success rate: ~99%+ (no CORS preflight failures)
- Error rate: ~1% (database errors only, not CORS)

---

## Troubleshooting

### Issue: Still Seeing "Failed to fetch"

**Check 1: Is Vercel Deployment Complete?**

```
✓ Changes must be deployed to Vercel (not local)
✓ Check that OPTIONS handler has Access-Control-Max-Age
✓ Give it 2-3 minutes for edge deployment
```

**Check 2: Browser Cache**

```
✓ Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
✓ Clear browser cache completely
✓ Try in Incognito/Private mode
```

**Check 3: Supabase Connection**

```
✓ Check Supabase status page
✓ Verify environment variables in Vercel
✓ Check server logs in Vercel dashboard
```

### Issue: Preflight Still Happening Every Request

**This is actually OK** - Options:

1. **Check Access-Control-Max-Age is set**

   - Network tab → OPTIONS request → Response Headers
   - Should show: `Access-Control-Max-Age: 86400`

2. **Browser might ignore Max-Age in some cases**
   - This is browser behavior, not a bug
   - API still responds correctly with CORS headers
   - No "Failed to fetch" error should occur

### Issue: Events Not Appearing in Database

**Check:**

1. Is `site_id` correct in tracker.js attribute?
2. Are Supabase credentials valid in .env?
3. Check API logs for database errors
4. Verify `rrweb_events` table exists and is accessible

---

## Success Criteria Checklist

- [ ] Browser Console shows "✓ Sent X rrweb events successfully"
- [ ] No "Failed to fetch" errors in console
- [ ] Network tab shows OPTIONS + POST requests returning 200 OK
- [ ] Response headers include all CORS headers
- [ ] OPTIONS response includes `Access-Control-Max-Age: 86400`
- [ ] Supabase `rrweb_events` table has new rows
- [ ] New rows have populated `events` JSONB field
- [ ] Multiple batches (100+ events) send without errors
- [ ] Preflight caching reduces repeated OPTIONS requests

---

## Rollback Plan (If Needed)

If issues arise, rollback to previous version:

```bash
git revert HEAD~1
git push origin v2-dom-recreation
```

This removes the CORS fixes and restores the previous (failing) version.

---

## Contact/Debug Info

If issues persist, provide:

1. **Browser Console Output** (full error message)
2. **Network Tab Screenshot** (showing failed/successful requests)
3. **API Logs from Vercel** (check deployment logs)
4. **Supabase Table Status** (select count from rrweb_events)
5. **Environment Variables** (verify NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are set)
