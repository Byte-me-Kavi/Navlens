# Path Exclusion System - Implementation Summary

## Overview

When a user deletes a page path from the "Manage Paths" UI, the system now:

1. **Removes** all historical events from ClickHouse
2. **Blocks** future data collection from that path
3. **Warns** the user about the permanent nature of the action

## Components Implemented

### 1. **Excluded Paths API** (`/api/excluded-paths/route.ts`)

- **GET**: Retrieves list of excluded paths for a site
- **POST**: Adds a path to the exclusion list (called after deletion)
- **DELETE**: Removes a path from exclusion (un-excludes it)

Uses Supabase `excluded_paths` table to maintain a persistent blocklist.

### 2. **Updated Collection Endpoint** (`/api/collect/route.ts`)

- Fetches excluded paths at collection time
- Filters out events from excluded paths before insertion
- Logs rejected events for debugging

### 3. **Enhanced Path Manager UI** (`PagePathManager.tsx`)

- **Warning Dialog**: Shows detailed warning about consequences of deletion

  ```
  ⚠️ DELETE PAGE PATH: "/path"

  This will:
  • Remove all existing events for this path
  • Stop collecting future data from this path
  • No new events will be recorded from "/path"

  This action cannot be undone. Continue?
  ```

- **Two-Step Deletion**:
  1. Delete historical events via `/api/manage-page-paths`
  2. Add to exclusion list via `/api/excluded-paths`
- **Info Box**: Clearly shows what happens when deleting
- **Success Toast**: Confirms path was deleted and excluded

### 4. **Database Setup** (`DATABASE_SETUP.md`)

SQL to create `excluded_paths` table with:

- RLS policies for security
- Unique constraint on (site_id, page_path)
- Automatic cascade delete when site is deleted
- Performance index

## Data Flow

### Deleting a Path

```
User clicks Delete
    ↓
Warning Dialog Shows
    ↓
User Confirms
    ↓
Delete Historical Events (ClickHouse)
    ↓
Add to Exclusion List (Supabase)
    ↓
Success Toast & UI Update
```

### Preventing Future Collection

```
New Event Arrives at /api/collect
    ↓
Fetch Excluded Paths List
    ↓
Check if event.page_path in excluded list
    ↓
YES → Reject silently (logged)
NO  → Insert into ClickHouse
```

## Key Features

✅ **Graceful Fallback**: Works even if `excluded_paths` table doesn't exist yet
✅ **Performance**: Excluded paths cached per request
✅ **Security**: RLS policies ensure users can only manage their own sites
✅ **User Clarity**: Multi-part warning explains all consequences
✅ **Data Integrity**: Future data rejected at collection boundary
✅ **Logging**: Rejected events logged for debugging

## Required Setup

Run this SQL in Supabase SQL Editor (see DATABASE_SETUP.md for full script):

```sql
CREATE TABLE public.excluded_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, page_path)
);
```

## Testing

1. Add a site and generate some events
2. Go to "My Sites" → "Manage Paths"
3. Click delete on a path
4. Verify warning shows consequences
5. Confirm deletion
6. Check that path no longer appears in list
7. Verify new events from that path are rejected in `/api/collect`
8. Verify historical events were deleted from ClickHouse

## Files Modified

- `app/api/excluded-paths/route.ts` - NEW: Exclusion list management
- `app/api/collect/route.ts` - UPDATED: Added exclusion filtering
- `app/dashboard/my-sites/PagePathManager.tsx` - UPDATED: Enhanced UX with warnings
- `DATABASE_SETUP.md` - NEW: Setup instructions for excluded_paths table
