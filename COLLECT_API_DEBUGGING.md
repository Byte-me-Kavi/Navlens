# /api/collect Endpoint - Debugging Improvements

## Problem Analysis

The tracker is sending requests to `/api/collect` with 400 Bad Request errors. The issue could be:

1. Missing or empty `api_key` in payload
2. Empty events array being sent
3. Missing `site_id` in event data
4. JSON parsing errors
5. CORS or network issues

## Improvements Made

### 1. Enhanced Error Handling in `/api/collect`

#### JSON Parsing Error Handler

- Added try-catch around `req.json()` to catch malformed JSON
- Returns clear error message if JSON parsing fails
- Logs parse error details for debugging

#### API Key Validation

- Checks if `api_key` exists in payload
- Validates that `api_key` is not empty (trimmed)
- Provides detailed debug info: payload keys, api_key length, hasApiKey flag
- Logs api_key length (masked for security) when found

#### Events Array Validation

- Validates events array exists and is not empty
- Logs number of events in array
- Returns detailed debug info about array state
- Handles null/undefined array gracefully

#### Site ID Validation

- Checks if `site_id` exists in first event
- Validates that `site_id` is not empty
- Provides keys from first event for debugging
- Helps identify if events have correct structure

### 2. Enhanced Tracker Logging

#### Initialization Logging

```javascript
[Navlens] Initialized with site_id: <site_id>, api_host: <api_host>, endpoint: <endpoint>
```

- Logs when tracker initializes successfully
- Shows which site_id and endpoint are being used
- Helps verify script attributes are correct

#### Flush Event Logging

```javascript
[Navlens] Flushing <count> events to <endpoint>
[Navlens] Payload structure: { events: [<count> items], api_key: '...' }
[Navlens] ✓ Sent <count> events. Response status: <status>
```

- Logs when events are being sent
- Shows payload structure (event count, api_key masked)
- Logs response status code
- Logs error responses with details

#### Error Logging

```javascript
[Navlens] ❌ Failed to send batched events: <error>
```

- Clear error messages on fetch failures
- Re-adds events to queue on failure (up to BATCH_SIZE \* 2)

## Expected Behavior

### Success Case (200 OK)

1. Tracker: `[Navlens] Initialized with site_id: xxx, api_host: yyy, endpoint: zzz`
2. Tracker: `[Navlens] Flushing N events to https://...`
3. Tracker: `[Navlens] ✓ Sent N events. Response status: 200`
4. Server: `[collect] Received request body keys: ['events', 'api_key']`
5. Server: `[collect] ✓ Found api_key in request (length: XX)`
6. Server: `[collect] ✓ Events array has N item(s)`
7. Server: `[collect] ✓ Found site_id: xxx`
8. Server: `[collect] Site and API key validation SUCCESS for xxx`
9. Server: `[collect] Successfully inserted N event(s) for site xxx`

### Failure Cases (400 Bad Request)

**Missing API Key:**

```
[collect] ❌ Missing or empty api_key in request. Payload structure: { ... }
Returns: { message: 'Invalid request: missing or empty api_key', debug: {...} }
Status: 400
```

**Empty Events Array:**

```
[collect] ❌ No events in array. Events: []
Returns: { message: 'No events provided', debug: { eventsLength: 0 } }
Status: 400
```

**Missing Site ID:**

```
[collect] ❌ Missing or empty site_id in event data. First event keys: [...]
Returns: { message: 'Invalid event data: missing site_id', debug: {...} }
Status: 400
```

**JSON Parse Error:**

```
[collect] ❌ Failed to parse JSON: <error>
Returns: { message: 'Invalid JSON in request body', error: '<error_message>' }
Status: 400
```

## Debugging Steps

1. **Check Browser Console:**

   - Look for `[Navlens]` logs to see if tracker initialized correctly
   - Verify `[Navlens] Flushing` messages when events are sent
   - Check response status in logs

2. **Check Server Logs:**

   - Look for `[collect]` logs to see what the server received
   - Check if api_key was found and validated
   - Verify site_id extraction succeeded

3. **Verify Script Tag Attributes:**

   - `data-site-id`: Should be a valid UUID
   - `data-api-key`: Should be a non-empty string
   - `data-api-host`: Should be a valid URL (e.g., http://localhost:3000 or https://navlens-rho.vercel.app)

4. **Check Payload Structure:**
   - Should be `{ events: [...], api_key: "xxx" }`
   - Each event should have `site_id` field
   - Events array should not be empty

## CORS Configuration

- All responses include CORS headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  ```
- OPTIONS preflight requests are handled correctly
