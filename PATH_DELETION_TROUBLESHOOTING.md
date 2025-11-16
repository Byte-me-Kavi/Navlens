# Path Deletion Not Working - Troubleshooting Guide

## Problem

When you delete a page path:

- ✅ The UI shows "deleted successfully"
- ❌ BUT data continues to be collected for that path
- ❌ Backend still accepts events from the deleted path

## Root Cause Analysis

The deletion has two steps:

1. **Step 1** ✅ DELETE historical events from ClickHouse
2. **Step 2** ❌ ADD path to exclusion list in Supabase (THIS IS LIKELY FAILING)

The second step is failing silently, so future events aren't being blocked.

## Solution: RLS Policy Issue

The `excluded_paths` table in Supabase has RLS (Row Level Security) policies that require user context. However, the backend uses `SUPABASE_SERVICE_ROLE_KEY` which operates without user context.

### Fix: Run this SQL in Supabase

Go to **Supabase Dashboard → SQL Editor → New Query** and run:

```sql
-- Solution 1: Disable RLS on excluded_paths (Recommended for simple setup)
ALTER TABLE public.excluded_paths DISABLE ROW LEVEL SECURITY;

-- OR Solution 2: Add permissive policy (if you want RLS enabled)
-- DROP POLICY IF EXISTS "Users can manage excluded paths for their sites" ON public.excluded_paths;
-- DROP POLICY IF EXISTS "Users can view their site excluded paths" ON public.excluded_paths;
-- DROP POLICY IF EXISTS "Users can delete excluded paths for their sites" ON public.excluded_paths;
--
-- CREATE POLICY "Permissive policy for excluded paths"
--   ON public.excluded_paths
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
```

**Choose Solution 1 (Disable RLS) for the fastest fix.**

## Verification Steps

After applying the SQL fix:

### 1. Check Supabase Console

- Go to **Supabase → Tables → excluded_paths**
- Delete any test data: `DELETE FROM excluded_paths;`

### 2. Monitor Backend Logs

The backend now has enhanced logging. When you delete a path, watch the console for:

```
[excluded-paths] POST: Adding path "/test-path" for site "xxxxx-xxxxx"
[excluded-paths] POST: Insert response - Error: NO, Data: [...]
[excluded-paths] POST: Path "/test-path" successfully added for site "xxxxx-xxxxx"
```

If you see errors, they'll show the Supabase error details.

### 3. Monitor Data Collection

When new events arrive, check the logs for:

```
[collect] ✓ Loaded 1 excluded paths for site xxxxx-xxxxx: [ "/test-path" ]
[collect] 🚫 Rejected event from excluded path: /test-path
```

This means exclusion is working!

If you see:

```
[collect] ✓ Loaded 0 excluded paths for site xxxxx-xxxxx: []
```

This means the path wasn't added to the exclusion list.

### 4. Test the Full Flow

1. Navigate to **Dashboard → My Sites → Manage Paths**
2. Click the delete button on any path
3. Confirm the deletion
4. Watch the server console (or `npm run dev` terminal)
5. Send a new event from the deleted page path
6. Check if you see the "🚫 Rejected event" log message

## Database Query to Check Exclusions

If you want to verify directly in Supabase:

```sql
-- Check if any paths are excluded for your site
SELECT site_id, page_path, excluded_at
FROM public.excluded_paths
WHERE site_id = 'YOUR-SITE-ID-HERE'
ORDER BY excluded_at DESC;
```

## If Still Not Working

1. **Check environment variables**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Verify table exists**: Run this in Supabase SQL Editor

   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_name = 'excluded_paths'
   );
   ```

   Should return `true`

3. **Check RLS status**: Run this in Supabase SQL Editor

   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'excluded_paths';
   ```

   Should show `t` (true) for rowsecurity = disabled after fix

4. **Manually insert a test path**: Run this in Supabase SQL Editor
   ```sql
   INSERT INTO public.excluded_paths (site_id, page_path)
   VALUES ('YOUR-SITE-ID-HERE', '/test-manual');
   ```
   Should succeed without errors

## Expected Behavior After Fix

1. Delete a page path via UI → Shows success message
2. New events from that path arrive at backend
3. Backend logs show: "Loaded X excluded paths... 🚫 Rejected event"
4. Events are NOT inserted into ClickHouse
5. Historical events are already deleted from Step 1
6. Result: Clean analytics, no contaminated data

## Quick Checklist

- [ ] Applied SQL fix (Disable RLS on excluded_paths table)
- [ ] Verified backend logs show "POST: Path added successfully"
- [ ] Verified new events show "🚫 Rejected event from excluded path"
- [ ] Checked Supabase table contains excluded paths
- [ ] Tested with fresh page path deletion
