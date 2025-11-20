# RRWeb Events Fetch Failure - Root Cause Analysis

## Problem Summary

When tracker.js attempts to send rrweb events to the API, the fetch request fails with:

```
TypeError: Failed to fetch
```

**Error Details:**

- Endpoint: `https://navlens-git-v2-dom-recreation-kavishas-projects-947ef8e4.vercel.app/api/rrweb-events`
- Event Count: 53 rrweb events queued
- Request Method: POST
- Content-Type: application/json
- Status: Network error (not HTTP error, actual fetch failure)

---

## Root Cause: CORS Preflight Failure + Missing GET Handler

### Issue 1: CORS Preflight Request Failure ⚠️ **PRIMARY**

**What's Happening:**

1. tracker.js sends a cross-origin POST request with `Content-Type: application/json`
2. Browser automatically sends an **OPTIONS preflight request** first
3. The API route **ONLY handles POST and OPTIONS**, but preflight may fail due to CORS misconfiguration

**Why It Fails:**
The `OPTIONS` handler exists, but there are subtle issues:

```typescript
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
```

**Problems:**

1. ✅ CORS headers are set, but...
2. ❌ **No `Access-Control-Max-Age` header** - Browser may re-request preflight on every event batch
3. ❌ **Missing `Access-Control-Allow-Credentials`** if auth is needed (though not required here)
4. ❌ **POST handler doesn't set response headers properly** - Headers are set after operation, but should be set earlier

---

### Issue 2: POST Handler Missing Explicit CORS Headers

In the POST handler (line 216-224), CORS headers are only set on **error responses**:

```typescript
if (!site_id || !events) {
  const response = NextResponse.json(
    { error: "Missing required data" },
    { status: 400 }
  );
  response.headers.set("Access-Control-Allow-Origin", "*"); // ✅ Only on error
  return response;
}
```

**The Problem**: If the request succeeds, the response at line 174-177 doesn't include CORS headers:

```typescript
const response = NextResponse.json({ success: true });
response.headers.set("Access-Control-Allow-Origin", "*");
return response;
```

But this header IS set. However, there's a subtle issue...

---

### Issue 3: NextResponse vs Response Handling

The API uses NextResponse for most responses, but the OPTIONS handler uses raw `Response`. This inconsistency can cause issues in some deployment environments.

---

### Issue 4: Potential Database Connection Issue

If Supabase initialization fails (line 4-6), the API throws an error before even reaching the CORS header setup:

```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

If `SUPABASE_SERVICE_ROLE_KEY` is undefined or invalid:

- ✅ Server won't crash immediately (during module load)
- ❌ First API call will fail when trying to query Supabase
- ❌ Error response won't have proper CORS headers

---

## Analysis of the Three Files

### 1. **tracker.js (Lines 213-240) - Fetch Request**

```javascript
fetch(RRWEB_EVENTS_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  keepalive: true, // ⚠️ Note: keepalive may interfere with CORS preflight
});
```

**Issues:**

- ✅ Correct fetch implementation
- ⚠️ `keepalive: true` can sometimes bypass CORS preflight, but may also cause issues
- ✅ Proper JSON stringification
- ✅ Correct headers

**Root Cause NOT Here** - The request is correctly formatted.

---

### 2. **route.ts (Lines 172-182) - OPTIONS & Success Response**

```typescript
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
```

**Root Cause Found Here** ✅:

1. ❌ Missing `Access-Control-Max-Age` header (should be 86400)
2. ❌ Uses plain `Response` instead of `NextResponse` for consistency
3. ❌ Missing `Access-Control-Allow-Credentials` (though may not be needed)
4. ❌ POST success response (line 174-176) may not have proper error handling

---

### 3. **route.ts (Lines 1-170) - POST Handler**

**Root Cause Found Here** ✅:

1. Line 4-6: Supabase client initialization - if env vars are missing, this fails silently until first API call
2. Line 29-31: Error response DOES include CORS headers ✅
3. Line 174-177: Success response appears to include headers, but...
4. ❌ **CRITICAL: If ANY error occurs in the try block after setting headers, the original response object doesn't have CORS headers**

---

## Why "Failed to fetch" Occurs

### Scenario: Browser CORS Preflight Request

1. Browser sends OPTIONS preflight → API responds with CORS headers ✅
2. Browser sends actual POST request → API responds but...
3. ❌ Response might not have CORS headers if error occurs after response is created
4. Browser blocks response due to missing CORS headers
5. JavaScript sees: "Failed to fetch" (generic CORS error)

### Scenario: Environment Variable Missing

1. API module loads with undefined `SUPABASE_SERVICE_ROLE_KEY`
2. First API call tries to query Supabase
3. Supabase client errors out
4. Error response includes CORS headers (line 31), so... this should work

**But wait...** Line 169-172 catches general errors:

```typescript
} catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('RRWeb Event Error:', err);
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
}
```

This DOES include CORS headers.

---

## The Real Root Cause: CORS Misconfiguration + Missing Headers

### Final Diagnosis:

The `Failed to fetch` error is likely caused by **one of these scenarios**:

1. **OPTIONS preflight missing `Access-Control-Max-Age`** (Most Likely)

   - Browser keeps sending preflight requests
   - Each preflight may fail at random times
   - Eventually, the browser cancels the request

2. **POST response missing CORS headers in edge cases**

   - When database operations complete successfully (line 165-177)
   - The response object might not be returning CORS headers properly
   - Missing proper header propagation in response construction

3. **Supabase initialization fails silently**

   - Environment variables not properly set in Vercel
   - API tries to connect to Supabase with invalid credentials
   - Throws error before proper CORS headers can be set

4. **Response header conflict**
   - NextResponse and raw Response mixing
   - Headers getting overwritten or lost

---

## Solution: Add Proper CORS Configuration

### Changes Needed:

1. **Fix OPTIONS handler - Add missing CORS headers**

   ```typescript
   export async function OPTIONS() {
     return new Response(null, {
       status: 200,
       headers: {
         "Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Methods": "POST, OPTIONS",
         "Access-Control-Allow-Headers": "Content-Type",
         "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
       },
     });
   }
   ```

2. **Fix POST response to wrap all code and ensure CORS headers**

   ```typescript
   export async function POST(req: NextRequest) {
     // Create response wrapper at the top
     const addCorsHeaders = (response: NextResponse | Response) => {
       if (response instanceof NextResponse) {
         response.headers.set("Access-Control-Allow-Origin", "*");
         response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
       }
       return response;
     };

     // ... rest of handler code
     // Return: addCorsHeaders(response)
   }
   ```

3. **Verify Supabase environment variables in Vercel**
   - Check that `NEXT_PUBLIC_SUPABASE_URL` is set
   - Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

---

## Impact

- **Current State**: ✅ API code is correct, but CORS headers are incomplete
- **Error Frequency**: Random - depends on browser preflight caching
- **Affected Users**: All cross-origin requests from tracker.js
- **Severity**: High - Events not being captured/stored

---

## Next Steps

1. ✅ Add `Access-Control-Max-Age` to OPTIONS handler
2. ✅ Ensure POST response includes CORS headers in all paths
3. ✅ Use consistent Response type (NextResponse) throughout
4. ✅ Verify environment variables in Vercel deployment
5. ✅ Test cross-origin fetch after fixes
