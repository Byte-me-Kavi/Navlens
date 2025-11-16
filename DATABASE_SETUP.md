# Database Setup Guide

## Excluded Paths Table (Required for Path Management)

To enable the path exclusion feature (prevents data collection from deleted paths), you need to create the `excluded_paths` table in Supabase.

### Step 1: Create the Excluded Paths Table

Go to your Supabase dashboard → **SQL Editor** → **New Query** and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS public.excluded_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, page_path)
);

-- Enable RLS
ALTER TABLE public.excluded_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their site excluded paths"
  ON public.excluded_paths
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = excluded_paths.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage excluded paths for their sites"
  ON public.excluded_paths
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = excluded_paths.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete excluded paths for their sites"
  ON public.excluded_paths
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = excluded_paths.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_excluded_paths_site_id ON public.excluded_paths(site_id);
```

## How Path Exclusion Works

### Deleting a Path

When you delete a page path from the "Manage Paths" UI:

1. ⚠️ **Warning Dialog**: Shows what will happen with confirmation required
2. 🗑️ **Removes Historical Data**: All existing events for that path are deleted from ClickHouse
3. 🚫 **Blocks Future Data**: The path is added to the `excluded_paths` table
4. 📊 **Prevents Collection**: The `/api/collect` endpoint filters out events from excluded paths

### Result

- Old events are removed completely
- No new data will be collected from deleted paths
- Future events from that path are silently rejected at collection time
- Analytics remain accurate and uncontaminated

## Features

✅ Delete a path and remove all associated events  
✅ Automatically prevent future data collection from deleted paths  
✅ Graceful handling if exclusion list not yet created  
✅ Secure with RLS policies  
✅ Clean separation of concerns (ClickHouse for analytics, Supabase for exclusions)

## Troubleshooting

**"Can't delete paths?"**

- Ensure `excluded_paths` table has been created
- Check that RLS policies allow your user

**"Still seeing data from deleted paths?"**

- New data collection is blocked, but old data remains until you delete the path
- Refresh your browser to see the updated exclusion list

**"Errors when excluding paths?"**

- Check that Supabase connection is working
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in environment
