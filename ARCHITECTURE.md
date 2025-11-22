# Heatmap Application Architecture

## 🎯 Design Principles

This architecture follows **SOLID principles** and **industry best practices** for scalable, maintainable Next.js applications.

### Core Principles Applied:

1. **Single Responsibility Principle (SRP)**: Each module has one clear purpose
2. **Open/Closed Principle (OCP)**: Extensible without modifying existing code
3. **Liskov Substitution Principle (LSP)**: Components are interchangeable
4. **Interface Segregation Principle (ISP)**: Focused, minimal interfaces
5. **Dependency Inversion Principle (DIP)**: Depend on abstractions, not implementations

---

## 📁 New Folder Structure

```
heatmap-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   └── login/
│   ├── (dashboard)/              # Dashboard route group (requires auth)
│   │   ├── dashboard/
│   │   │   ├── experiments/
│   │   │   ├── heatmaps/
│   │   │   ├── my-sites/
│   │   │   └── settings/
│   │   └── layout.tsx            # Dashboard layout with sidebar
│   ├── (public)/                 # Public pages route group
│   │   ├── about/
│   │   ├── docs/
│   │   ├── features/
│   │   └── pricing/
│   ├── api/                      # API routes (current structure maintained)
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── features/                     # ✨ NEW: Feature-based modules
│   ├── heatmap/                  # Heatmap feature module
│   │   ├── components/
│   │   │   ├── HeatmapCanvas.tsx
│   │   │   ├── HeatmapControls.tsx
│   │   │   └── HeatmapViewer.tsx
│   │   ├── hooks/
│   │   │   ├── useHeatmapData.ts
│   │   │   ├── useHeatmapRenderer.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── heatmapApi.ts
│   │   │   ├── heatmapRenderer.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── heatmap.types.ts
│   │   └── index.ts              # Public exports
│   │
│   ├── element-tracking/         # Element click tracking feature
│   │   ├── components/
│   │   │   ├── ElementOverlay.tsx
│   │   │   ├── ElementAnalysisModal.tsx
│   │   │   └── ElementList.tsx
│   │   ├── hooks/
│   │   │   ├── useElementClicks.ts
│   │   │   ├── useElementAnalysis.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── elementApi.ts
│   │   │   ├── elementMatcher.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── element.types.ts
│   │   └── index.ts
│   │
│   ├── dom-snapshot/             # DOM snapshot & reconstruction
│   │   ├── components/
│   │   │   ├── SnapshotViewer.tsx
│   │   │   └── IframeContainer.tsx
│   │   ├── hooks/
│   │   │   ├── useSnapshot.ts
│   │   │   └── useDomRebuild.ts
│   │   ├── services/
│   │   │   ├── snapshotApi.ts
│   │   │   ├── domBuilder.ts
│   │   │   └── scrollSync.ts
│   │   ├── types/
│   │   │   └── snapshot.types.ts
│   │   └── index.ts
│   │
│   ├── analytics/                # Analytics & metrics
│   │   ├── components/
│   │   │   ├── MetricsCard.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   └── DeviceBreakdown.tsx
│   │   ├── hooks/
│   │   │   ├── useMetrics.ts
│   │   │   └── useTrends.ts
│   │   ├── services/
│   │   │   ├── metricsApi.ts
│   │   │   └── calculations.ts
│   │   └── index.ts
│   │
│   ├── ab-testing/               # 🚀 FUTURE: A/B Testing module (extensible)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   │
│   └── site-management/          # Site & page management
│       ├── components/
│       │   ├── SiteSelector.tsx
│       │   ├── PagePathManager.tsx
│       │   └── SiteManager.tsx
│       ├── hooks/
│       │   ├── useSites.ts
│       │   └── usePagePaths.ts
│       ├── services/
│       │   └── siteApi.ts
│       └── index.ts
│
├── shared/                       # ✨ NEW: Shared utilities
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── SideNavbar.tsx
│   │   ├── feedback/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingScreen.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ProgressBar.tsx
│   │   └── index.ts
│   │
│   ├── hooks/                    # Shared custom hooks
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   │
│   ├── services/                 # Core services
│   │   ├── api/
│   │   │   ├── client.ts         # Axios/Fetch wrapper
│   │   │   ├── endpoints.ts      # API endpoint constants
│   │   │   └── interceptors.ts   # Request/response interceptors
│   │   ├── auth/
│   │   │   ├── authService.ts
│   │   │   └── authHelpers.ts
│   │   └── storage/
│   │       ├── localStorage.ts
│   │       └── sessionStorage.ts
│   │
│   ├── types/                    # Shared TypeScript types
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   │
│   └── context/                  # Global contexts
│       ├── AuthContext.tsx
│       ├── SiteContext.tsx
│       ├── NavigationContext.tsx
│       └── index.ts
│
├── config/                       # ✨ NEW: Configuration
│   ├── app.config.ts             # App-level config
│   ├── api.config.ts             # API config
│   └── features.config.ts        # Feature flags
│
├── lib/                          # Keep for compatibility
│   ├── supabaseClient.ts
│   └── utils.ts
│
└── public/
    ├── tracker.js
    └── images/
```

---

## 🏗️ Architecture Layers

### 1. **Presentation Layer** (Components)

- Pure UI components
- No business logic
- Receive data via props or hooks
- Emit events upward

### 2. **Business Logic Layer** (Hooks & Services)

- **Hooks**: React-specific logic (state, effects, context)
- **Services**: Pure TypeScript logic (API calls, calculations)
- Separation allows testing without React

### 3. **Data Layer** (API Services)

- Centralized API communication
- Request/response transformation
- Error handling
- Authentication

---

## 🔄 Data Flow Pattern

```
User Interaction
      ↓
Component (UI)
      ↓
Custom Hook (State Management)
      ↓
Service (Business Logic)
      ↓
API Client (HTTP)
      ↓
Backend API
      ↓
Database (ClickHouse/Supabase)
```

---

## 📦 Feature Module Pattern

Each feature is **self-contained** and follows this structure:

```typescript
features/[feature-name]/
  ├── components/          # Feature-specific UI
  ├── hooks/              # Feature-specific hooks
  ├── services/           # Feature-specific business logic
  ├── types/              # Feature-specific types
  └── index.ts            # Public API (exports only what's needed)
```

### Benefits:

✅ **Easy to understand**: Everything related to a feature is in one place  
✅ **Easy to test**: Each module can be tested independently  
✅ **Easy to extend**: Add new features without touching existing code  
✅ **Easy to remove**: Delete a feature folder to remove it completely  
✅ **Easy to collaborate**: Teams can work on different features without conflicts

---

## 🎯 How to Add A/B Testing (Example)

1. **Create the module**:

```bash
features/ab-testing/
  ├── components/
  │   ├── ExperimentList.tsx
  │   ├── VariantSelector.tsx
  │   └── ResultsChart.tsx
  ├── hooks/
  │   ├── useExperiment.ts
  │   └── useVariants.ts
  ├── services/
  │   ├── experimentApi.ts
  │   └── variantCalculations.ts
  ├── types/
  │   └── experiment.types.ts
  └── index.ts
```

2. **Add API route**:

```typescript
// app/api/experiments/route.ts
export async function GET(request: NextRequest) {
  // Implementation
}
```

3. **Add page**:

```typescript
// app/(dashboard)/dashboard/experiments/page.tsx
import { ExperimentList } from "@/features/ab-testing";

export default function ExperimentsPage() {
  return <ExperimentList />;
}
```

4. **Enable feature flag**:

```typescript
// config/features.config.ts
export const features = {
  abTesting: true, // ← Toggle on
  heatmaps: true,
  elementTracking: true,
};
```

---

## 🔧 Service Layer Design

### Example: API Service

```typescript
// shared/services/api/client.ts
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  // post, put, delete methods...
}

export const apiClient = new ApiClient("/api");
```

### Example: Feature Service

```typescript
// features/heatmap/services/heatmapApi.ts
import { apiClient } from "@/shared/services/api/client";
import { HeatmapData } from "../types/heatmap.types";

export const heatmapApi = {
  async getHeatmapData(params: HeatmapParams): Promise<HeatmapData> {
    return apiClient.get<HeatmapData>("/heatmap-clicks", { params });
  },

  async getSnapshot(params: SnapshotParams): Promise<Snapshot> {
    return apiClient.get<Snapshot>("/get-snapshot", { params });
  },
};
```

---

## 🪝 Custom Hook Design

### Example: Feature Hook

```typescript
// features/heatmap/hooks/useHeatmapData.ts
import { useState, useEffect } from "react";
import { heatmapApi } from "../services/heatmapApi";
import { HeatmapData } from "../types/heatmap.types";

export function useHeatmapData(
  siteId: string,
  pagePath: string,
  deviceType: string
) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const result = await heatmapApi.getHeatmapData({
          siteId,
          pagePath,
          deviceType,
        });

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [siteId, pagePath, deviceType]);

  return { data, loading, error, refetch: () => fetchData() };
}
```

---

## 🧩 Component Composition

### Old Pattern (❌ Don't):

```typescript
// One giant component with everything
<DomHeatmapViewer
  siteId={siteId}
  pagePath={pagePath}
  deviceType={deviceType}
  showElements={true}
  showHeatmap={true}
/>
```

### New Pattern (✅ Do):

```typescript
// Composed from smaller, focused components
<SnapshotViewer siteId={siteId} pagePath={pagePath} deviceType={deviceType}>
  <HeatmapCanvas data={heatmapData} />
  <ElementOverlay elements={elementClicks} />
  <HeatmapControls onToggle={handleToggle} />
</SnapshotViewer>
```

---

## 🔒 Type Safety

### Shared Types

```typescript
// shared/types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
```

### Feature Types

```typescript
// features/heatmap/types/heatmap.types.ts
export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapData {
  max: number;
  data: HeatmapPoint[];
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// features/heatmap/services/__tests__/heatmapApi.test.ts
describe("heatmapApi", () => {
  it("should fetch heatmap data", async () => {
    const data = await heatmapApi.getHeatmapData({
      siteId: "test",
      pagePath: "/",
      deviceType: "desktop",
    });

    expect(data).toBeDefined();
    expect(data.data).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

```typescript
// features/heatmap/components/__tests__/HeatmapViewer.test.tsx
describe("HeatmapViewer", () => {
  it("should render heatmap canvas", () => {
    render(<HeatmapViewer siteId="test" pagePath="/" deviceType="desktop" />);
    expect(screen.getByTestId("heatmap-canvas")).toBeInTheDocument();
  });
});
```

---

## 📊 Migration Plan

### Phase 1: Create New Structure (No Breaking Changes)

1. Create `features/` and `shared/` folders
2. Copy existing code into new structure
3. Keep old files for compatibility

### Phase 2: Refactor Components

1. Extract business logic from components to hooks
2. Extract API calls to services
3. Update imports gradually

### Phase 3: Update Routes

1. Migrate pages to use new components
2. Test each page thoroughly
3. Remove old components

### Phase 4: Cleanup

1. Delete old unused files
2. Update documentation
3. Run full test suite

---

## 🚀 Benefits of This Architecture

1. **Scalability**: Add new features without affecting existing ones
2. **Maintainability**: Clear structure makes bugs easy to find
3. **Testability**: Each layer can be tested independently
4. **Collaboration**: Multiple developers can work without conflicts
5. **Extensibility**: Add A/B testing, graphs, etc. as self-contained modules
6. **Type Safety**: TypeScript catches errors at compile time
7. **Performance**: Code splitting by feature reduces bundle size
8. **Developer Experience**: Consistent patterns reduce cognitive load

---

## 🎓 Learning Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Hooks](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📝 Code Style Guidelines

### Naming Conventions

- **Components**: PascalCase (`HeatmapViewer.tsx`)
- **Hooks**: camelCase with `use` prefix (`useHeatmapData.ts`)
- **Services**: camelCase (`heatmapApi.ts`)
- **Types**: PascalCase with descriptive suffix (`HeatmapData`, `HeatmapPoint`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### File Organization

- One component per file
- Co-locate tests with implementation
- Index files export public APIs only
- Keep files under 300 lines

### Import Order

1. External dependencies (React, Next.js)
2. Internal shared modules (`@/shared`)
3. Internal feature modules (`@/features`)
4. Relative imports (`./`, `../`)

---

**Last Updated**: November 22, 2025  
**Version**: 2.0.0
