/**
 * DOM Snapshot Types
 */

export interface SnapshotData {
  snapshot: any;
  styles?: Array<{ type: string; content?: string; href?: string }>;
  origin?: string;
}

export interface SnapshotParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
}
