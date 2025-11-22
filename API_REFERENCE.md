# Quick Reference: Secure API Calls

## ✅ Correct Usage (Secure)

### Heatmap Data

```typescript
import { useHeatmapData } from "@/features/heatmap";

const { data, loading, error } = useHeatmapData({
  siteId: "abc-123",
  pagePath: "/",
  deviceType: "desktop",
});
```

### Element Clicks

```typescript
import { elementApi } from "@/features/element-tracking";

const elements = await elementApi.getElementClicks({
  siteId: "abc-123",
  pagePath: "/",
  deviceType: "desktop",
});
```

### DOM Snapshot

```typescript
import { snapshotApi } from "@/features/dom-snapshot";

const snapshot = await snapshotApi.getSnapshot({
  siteId: "abc-123",
  pagePath: "/",
  deviceType: "desktop",
});
```

### Direct API Call

```typescript
import { apiClient } from "@/shared/services/api/client";

const data = await apiClient.post("/api-endpoint", {
  param1: "value1",
  param2: "value2",
});
```

---

## ❌ Avoid (Insecure)

### Don't use fetch with GET for sensitive data

```typescript
// ❌ BAD: Sensitive data in URL
const response = await fetch(`/api/data?secret=${secret}`);
```

### Don't bypass the API client

```typescript
// ❌ BAD: No error handling, logging, or security
const response = await fetch("/api/data", {
  method: "POST",
  body: JSON.stringify({ data }),
});
```

---

## 🔍 Console Output Reference

### Success

```
🌐 API Request: POST /heatmap-clicks { siteId: 'test', pagePath: '/' }
✓ API Response: POST /heatmap-clicks [200]
```

### Error

```
🌐 API Request: POST /heatmap-clicks { siteId: 'invalid' }
❌ API Error [400]: Invalid siteId format
```

### Deprecation Warning

```
⚠️ GET request used - consider using POST for sensitive data
⚠️ GET request to /api/heatmap-clicks is deprecated. Use POST for security.
```

---

## 📝 Quick Checklist

Before deploying:

- [ ] All API calls use `apiClient` from `@/shared/services/api/client`
- [ ] No sensitive data in URL query parameters
- [ ] Error handling implemented for all API calls
- [ ] Console logs checked for deprecation warnings
- [ ] POST requests used for data mutations and sensitive queries

---

**Read full documentation**: `SECURITY_MIGRATION.md`
