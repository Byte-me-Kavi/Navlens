import {
  RocketLaunchIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BeakerIcon,
  SignalIcon,
  FunnelIcon,
  MapIcon,
  CpuChipIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  FaceFrownIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

export type GuideKey =
  | "installation-guide"
  | "understanding-heatmaps"
  | "dashboard-overview"
  | "data-analysis-basics"
  | "a-b-testing-experiments"
  | "network-performance"
  | "conversion-funnels"
  | "user-journeys"
  | "smart-element-insights"
  | "form-analytics"
  | "user-cohorts"
  | "frustration-signals"
  | "visitor-feedback"
  | "cursor-paths-heatmaps"
  | "hover-heatmaps";

export const allGuideSlugs: GuideKey[] = [
  "installation-guide",
  "understanding-heatmaps",
  "dashboard-overview",
  "data-analysis-basics",
  "a-b-testing-experiments",
  "network-performance",
  "conversion-funnels",
  "user-journeys",
  "smart-element-insights",
  "form-analytics",
  "user-cohorts",
  "frustration-signals",
  "visitor-feedback",
  "cursor-paths-heatmaps",
  "hover-heatmaps",
];

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  content: string;
  codeBlock?: string;
}

export interface Guide {
  title: string;
  description: string;
  date: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  estimatedTime: string;
  difficulty: string;
  relatedGuides?: GuideKey[];
  sections: GuideSection[];
}

export const guidesData: Record<GuideKey, Guide> = {
  "installation-guide": {
    title: "Installation Guide",
    description: "Set up Navlens in your project in just a few minutes",
    date: "Updated Dec 26, 2025",
    icon: RocketLaunchIcon,
    estimatedTime: "5 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "quick-start",
        title: "Quick Start",
        description: "Add the script to your site",
        content: "Add the tracking script to your website's <head> tag. You can find your unique script in the Dashboard under Settings > Installation.",
        codeBlock: '<script defer src="https://navlensanalytics.com/tracker.js" data-site-id="YOUR_SITE_ID"></script>'
      }
    ]
  },
  "understanding-heatmaps": {
    title: "Understanding Heatmaps",
    description: "Learn about automatic heatmap generation",
    date: "Updated Dec 26, 2025",
    icon: CursorArrowRaysIcon,
    estimatedTime: "10 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "types-of-heatmaps",
        title: "Types of Heatmaps",
        description: "Different ways to visualize data",
        content: "Heatmaps visualize where users click, move, and scroll on your site.\n- Click Maps: Show hotspots where users click the most.\n- Scroll Maps: Visualize how far down the page users scroll.\n- Move Maps: Track mouse movement patterns."
      }
    ]
  },
  "dashboard-overview": {
    title: "Dashboard Overview",
    description: "Navigate and utilize the Navlens dashboard features",
    date: "Updated Dec 26, 2025",
    icon: ChartBarIcon,
    estimatedTime: "15 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "overview",
        title: "Overview",
        description: "Key metrics at a glance",
        content: "Navigate your analytics efficiently:\n- Overview: High-level metrics (visitors, bounce rate, etc).\n- Heatmaps: Visual interaction data.\n- Recordings: Replay user sessions.\n- Live View: Real-time visitor activity."
      }
    ]
  },
  "data-analysis-basics": {
    title: "Data Analysis Basics",
    description: "Learn fundamental data analysis and interpretation",
    date: "Updated Dec 26, 2025",
    icon: ArrowTrendingUpIcon,
    estimatedTime: "20 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "interpreting-data",
        title: "Interpreting Data",
        description: "What the numbers mean",
        content: "Learn to interpret your data:\n1. Volume vs. Quality: High traffic doesn't always mean high engagement.\n2. Bounce Rate: High bounce rates might indicate irrelevant content or slow loading.\n3. Session Duration: Longer sessions often signal higher engagement."
      }
    ]
  },
  "a-b-testing-experiments": {
    title: "A/B Testing Experiments",
    description: "Create and manage experiments to optimize user experience",
    date: "Updated Dec 26, 2025",
    icon: BeakerIcon,
    estimatedTime: "25 min",
    difficulty: "Advanced",
    sections: [
      {
        id: "running-tests",
        title: "Running Tests",
        description: "How to set up an experiment",
        content: "Test different versions of your site:\n1. Create variants in the editor.\n2. Set traffic distribution (e.g., 50/50).\n3. Define a goal (e.g., 'Clicked Sign Up').\n4. Launch and monitor statistical significance."
      }
    ]
  },
  "network-performance": {
    title: "Network Performance",
    description: "Monitor API latency and resource loading health",
    date: "Updated Dec 27, 2025",
    icon: SignalIcon,
    estimatedTime: "10 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "monitoring",
        title: "Monitoring Health",
        description: "Keep your site fast",
        content: "Monitor your site's technical health:\n- Latency: Time to first byte and API response times.\n- Resource Loading: Identify heavy images or scripts slowing down your site.\n- Errors: Catch 404s and 500s that users encounter."
      }
    ]
  },
  "conversion-funnels": {
    title: "Conversion Funnels",
    description: "Analyze user drop-off across defined steps",
    date: "Updated Dec 27, 2025",
    icon: FunnelIcon,
    estimatedTime: "15 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "setup",
        title: "Setting Up Funnels",
        description: "Track the journey",
        content: "Track user journeys towards conversion:\n1. Define steps (e.g., Landing -> Pricing -> Signup).\n2. Analyze drop-off rates at each step.\n3. Identify bottlenecks causing users to leave."
      }
    ]
  },
  "user-journeys": {
    title: "User Journeys",
    description: "Visual navigation paths and flow analysis",
    date: "Updated Dec 27, 2025",
    icon: MapIcon,
    estimatedTime: "10 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "visualization",
        title: "Visualizing Paths",
        description: "See where users go",
        content: "Visualize navigation paths:\n- See the most common paths users take.\n- Identify looping behavior (users getting lost).\n- Optimize site structure based on actual flow."
      }
    ]
  },
  "smart-element-insights": {
    title: "Smart Element Insights",
    description: "Detailed interaction stats for UI elements",
    date: "Updated Dec 27, 2025",
    icon: CpuChipIcon,
    estimatedTime: "5 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "interaction-stats",
        title: "Interaction Stats",
        description: "Click and hover data",
        content: "Detailed stats for UI elements:\n- Interactions: Total clicks and hovers.\n- Visibility: How often an element is actually seen.\n- Conversion Contribution: How often clicking leads to a goal."
      }
    ]
  },
  "form-analytics": {
    title: "Form Analytics",
    description: "Optimize form completion and field usage",
    date: "Updated Dec 27, 2025",
    icon: ClipboardDocumentListIcon,
    estimatedTime: "10 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "optimization",
        title: "Form Optimization",
        description: "Improve completion rates",
        content: "Optimize your forms:\n- Drop-off: Which field makes users quit?\n- Time per field: Which questions take too long?\n- Refill rate: Which fields cause validation errors?"
      }
    ]
  },
  "user-cohorts": {
    title: "User Cohorts",
    description: "Segment and analyze specific user groups",
    date: "Updated Dec 27, 2025",
    icon: UserGroupIcon,
    estimatedTime: "15 min",
    difficulty: "Advanced",
    sections: [
      {
        id: "segmentation",
        title: "Segmentation",
        description: "Group your users",
        content: "Segment your audience:\n- Retention: Track returning users over time.\n- Behavior: Group users who performed specific actions.\n- Demographics: Segment by location, device, or source."
      }
    ]
  },
  "frustration-signals": {
    title: "Frustration Signals",
    description: "Detect rage clicks and broken experiences",
    date: "Updated Dec 27, 2025",
    icon: FaceFrownIcon,
    estimatedTime: "5 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "detection",
        title: "Detecting Struggle",
        description: "Find pain points",
        content: "Detect user struggle automatically:\n- Rage Clicks: Rapidly clicking the same element (sign of broken UI).\n- Dead Clicks: Clicking un-clickable elements.\n- Rapid Scrolling: Searching for content in frustration."
      }
    ]
  },
  "visitor-feedback": {
    title: "Visitor Feedback",
    description: "Collect direct inputs via surveys and widgets",
    date: "Updated Dec 27, 2025",
    icon: ChatBubbleBottomCenterTextIcon,
    estimatedTime: "5 min",
    difficulty: "Beginner",
    sections: [
      {
        id: "collection",
        title: "Collecting Feedback",
        description: "Ask your users",
        content: "Collect qualitative data:\n- Surveys: Ask NPS or specific questions.\n- Feedback Widgets: Allow users to report bugs or suggestions.\n- Context: See the session recording associated with the feedback."
      }
    ]
  },
  "cursor-paths-heatmaps": {
    title: "Cursor Paths",
    description: "Trace mouse movement patterns",
    date: "Updated Dec 27, 2025",
    icon: CursorArrowRaysIcon,
    estimatedTime: "5 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "tracing",
        title: "Tracing Movement",
        description: "Follow the cursor",
        content: "Trace user attention:\n- Visualize mouse movement trails.\n- Understand reading patterns and hesitation.\n- Analyze non-clicking interaction behavior."
      }
    ]
  },
  "hover-heatmaps": {
    title: "Hover Heatmaps",
    description: "Analyze user attention via hover data",
    date: "Updated Dec 27, 2025",
    icon: EyeIcon,
    estimatedTime: "5 min",
    difficulty: "Intermediate",
    sections: [
      {
        id: "hover-analysis",
        title: "Hover Analysis",
        description: "What captures attention",
        content: "See where users hover:\n- Identify elements that attract attention but aren't clicked.\n- Analyze menu interactions and dropdown usage.\n- Correlate hover interest with click-through rates."
      }
    ]
  }
};
