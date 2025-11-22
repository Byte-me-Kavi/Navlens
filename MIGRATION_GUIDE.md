# Migration Guide to New Architecture

## Overview

This guide explains how to migrate from the old monolithic `DomHeatmapViewer` component to the new modular architecture.

## What's New?

### ✨ Feature Modules

- **Heatmap** (`features/heatmap/`): Heatmap visualization logic
- **Element Tracking** (`features/element-tracking/`): Element click overlays
- **DOM Snapshot** (`features/dom-snapshot/`): Snapshot loading and DOM reconstruction

### ✨ Shared Services

- **API Client** (`shared/services/api/client.ts`): Centralized HTTP client

## Migration Steps

### Step 1: Update Imports (Non-Breaking)

**Old Way:**

```typescript
// Direct API calls in components
const response = await fetch("/api/heatmap-clicks?...");
const data = await response.json();
```

**New Way:**

```typescript
import { heatmapApi } from "@/features/heatmap";

const data = await heatmapApi.getHeatmapClicks({
  siteId: "test",
  pagePath: "/",
  deviceType: "desktop",
});
```

### Step 2: Use Custom Hooks

**Old Way:**

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const response = await fetch("...");
    const result = await response.json();
    setData(result);
    setLoading(false);
  }
  fetchData();
}, [siteId, pagePath]);
```

**New Way:**

```typescript
import { useHeatmapData } from "@/features/heatmap";

const { data, loading, error, refetch } = useHeatmapData({
  siteId: "test",
  pagePath: "/",
  deviceType: "desktop",
});
```

### Step 3: Use Service Layer

**Old Way:**

```typescript
// Business logic mixed in component
const heatmapData = {
  max: Math.max(...clickData.map((d) => d.value)),
  data: clickData.map((point) => ({
    x: Math.round(point.x_relative * currentDocWidth),
    y: Math.round(point.y_relative * currentDocHeight),
    value: point.value,
  })),
};
```

**New Way:**

```typescript
import { heatmapApi } from "@/features/heatmap";

const heatmapData = heatmapApi.transformToHeatmapData(
  clickData,
  currentDocWidth,
  currentDocHeight
);
```

## Example: Refactoring a Component

### Before (Monolithic)

```typescript
export default function HeatmapPage() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch Data() {
      setLoading(true);
      const response = await fetch(`/api/heatmap-clicks?siteId=${siteId}...`);
      const data = await response.json();
      setHeatmapData(data);
      setLoading(false);
    }
    fetchData();
  }, [siteId]);

  return (
    <div>
      {loading && <p>Loading...</p>}
      <DomHeatmapViewer data={heatmapData} />
    </div>
  );
}
```

### After (Modular)

```typescript
import { useHeatmapData } from "@/features/heatmap";

export default function HeatmapPage() {
  const { data, loading, error } = useHeatmapData({
    siteId: "test",
    pagePath: "/",
    deviceType: "desktop",
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <DomHeatmapViewer data={data} />;
}
```

## Testing the New Architecture

### Before Running

1. **Check imports**: Make sure TypeScript resolves `@/features/*` and `@/shared/*`
2. **No breaking changes**: Old code still works alongside new code
3. **Incremental migration**: Migrate one component at a time

### Run Dev Server

```bash
npm run dev
```

### Check Console Logs

The new architecture includes enhanced logging:

- `🔥 Fetching heatmap data:`
- `✓ Heatmap data fetched:`
- `📐 Content dimensions:`
- `🎨 Setting heatmap data:`

## Current Status

### ✅ Completed

- Architecture document created
- Shared API client service
- Heatmap feature module (types, services, hooks)
- Element tracking feature module (types, services)
- DOM snapshot feature module (types, services)
- Enhanced logging in `DomHeatmapViewer`

### 🚧 In Progress

- Component refactoring (breaking down `DomHeatmapViewer`)
- Hook extraction
- Testing

### 📝 TODO

- Create smaller, focused components
- Write unit tests
- Add A/B testing module (future)
- Add graph visualization module (future)

## Benefits

1. **Easier to add features**: Just create a new feature folder
2. **Easier to test**: Each service can be tested independently
3. **Easier to understand**: Clear separation of concerns
4. **Easier to maintain**: Find bugs faster with modular structure
5. **Type-safe**: TypeScript catches errors at compile time
6. **No breaking changes**: Gradual migration without disrupting existing code

## Need Help?

- See `ARCHITECTURE.md` for detailed architecture documentation
- Check `features/*/index.ts` for public APIs
- Review `shared/services/api/client.ts` for HTTP request patterns

---

**Last Updated**: November 22, 2025
