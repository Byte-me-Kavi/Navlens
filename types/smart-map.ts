// types/smart-map.ts

export interface ElementNode {
  selector: string; // Unique CSS selector path (e.g. "body > div:nth-child(2) > button")
  tag: string;      // "BUTTON", "A", "INPUT"
  text: string;     // "Sign Up", "Login"
  x: number;        // X position on the screenshot
  y: number;        // Y position on the screenshot
  width: number;    // Width of the element
  height: number;   // Height of the element
  href?: string;    // Link destination (if it's an <a> tag)
}

export interface SmartScreenshotResult {
  screenshotUrl: string; // URL to the .png in Supabase
  mapUrl: string;        // URL to the .json map in Supabase
  device: string;        // "desktop", "mobile"
}

export interface ElementClick extends ElementNode {
  clickCount: number;    // Number of clicks on this element
  percentage: number;    // Percentage of total clicks
  elementId: string;     // Element ID if available
  elementClasses: string; // Element classes if available
}