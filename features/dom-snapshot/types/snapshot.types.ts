// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { snapshot as RRWebSnapshot } from 'rrweb-snapshot';

export interface SnapshotData {
  snapshot: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  styles?: Array<{ type: string; content?: string; href?: string }>;
  origin?: string;
}

export interface SnapshotParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
}
