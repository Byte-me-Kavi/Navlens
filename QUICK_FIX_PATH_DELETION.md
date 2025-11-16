# 🔧 Fix Path Deletion - Required Setup

## The Problem

You're seeing this error:

```
Could not find the table 'public.excluded_paths' in the schema cache
```

This means the database table for storing excluded paths doesn't exist yet.

## The Solution - 2 Minutes to Fix

### Step 1: Open Supabase

1. Go to https://app.supabase.com
2. Select your project

### Step 2: Run the SQL

1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire content from `SETUP_EXCLUDED_PATHS.sql` in this project
4. Paste it into the query editor
5. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success

You should see:

```
excluded_paths table created successfully!
```

### Step 4: Restart App

Kill your dev server and run:

```bash
npm run dev
```

## Test It Works

1. Go to **Dashboard → My Sites → Manage Paths**
2. Click the delete button on any path
3. Confirm deletion
4. In the terminal running `npm run dev`, watch for:
   ```
   [excluded-paths] POST: Path "/path-name" successfully added for site "xxxxx"
   ```
5. Send a new event from that deleted page
6. In the terminal, watch for:
   ```
   [collect] 🚫 Rejected event from excluded path: /path-name
   ```

✅ If you see those logs, path deletion is now working!

## All Set!

Your path deletion feature is now fully operational. Deleted paths will:

- Remove all historical data immediately
- Block all future data collection from that path
