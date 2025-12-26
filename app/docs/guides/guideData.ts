import {
  RocketLaunchIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BeakerIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

export const guidesData = {
  "installation-guide": {
    title: "Installation Guide",
    description: "Set up Navlens in your project in just a few minutes",
    icon: RocketLaunchIcon,
    estimatedTime: "5-10 minutes",
    difficulty: "Beginner",
    sections: [
      {
        id: "step-1",
        title: "Step 1: Create Your Account",
        description: "Start by creating a free Navlens account at navlens.io",
        content:
          "Sign up for a free account by visiting our website. After confirming your email, you will be taken to your dashboard.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Step 2: Add Tracking Script",
        description: "Add the script to your application",
        content:
          "Insert the following code snippet into the <head> of your website's HTML.",
        codeBlock:
          "<script \n  async \n  src=\"https://navlensanalytics.com/tracker.js\" \n  data-site-id=\"YOUR_SITE_ID\"\n  data-api-key=\"YOUR_API_KEY\"\n  data-api-host=\"https://navlensanalytics.com\"\n><\\/script>",
      },
    ],
    nextSteps: ["first-heatmap-setup"],
    relatedGuides: ["first-heatmap-setup", "dashboard-overview"],
  },
  "first-heatmap-setup": {
    title: "Understanding Heatmaps",
    description: "Learn how heatmaps are automatically generated for your pages",
    icon: CursorArrowRaysIcon,
    estimatedTime: "2-5 minutes",
    difficulty: "Beginner",
    sections: [
      {
        id: "step-1",
        title: "Automatic Data Collection",
        description: "Zero configuration needed",
        content:
          "Once you install the tracking script, Navlens automatically begins capturing click data, scroll depth, and mouse movements for every page visited by your users. No manual configuration is required.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Viewing Your Heatmaps",
        description: "Accessing visualization data",
        content:
          "Simply navigate to the Heatmaps section in your dashboard. You will see a list of pages where user activity has been detected. Click on any page to view the generated heatmap overlay.",
        codeBlock: null,
      },
    ],
    nextSteps: ["dashboard-overview", "data-analysis-basics"],
    relatedGuides: ["installation-guide"],
  },
  "dashboard-overview": {
    title: "Dashboard Overview",
    description: "Navigate and utilize the Navlens dashboard features",
    icon: ChartBarIcon,
    estimatedTime: "8-12 minutes",
    difficulty: "Beginner",
    sections: [
      {
        id: "step-1",
        title: "Understanding the Main Dashboard",
        description: "Overview of dashboard components",
        content:
          "Your dashboard includes: Sidebar Navigation, Top Statistics, Recent Activity, and Quick Actions.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Navigating Heatmaps Section",
        description: "View and manage all your heatmaps",
        content:
          "The Heatmaps section shows all active heatmaps. View real-time data, compare pages, and export visualizations.",
        codeBlock: null,
      },
      {
        id: "step-3",
        title: "Accessing Analytics",
        description: "Deep dive into user analytics",
        content:
          "Analytics section provides: Session recordings, User behavior flows, Conversion funnels, Custom event tracking.",
        codeBlock: null,
      },
      {
        id: "step-4",
        title: "Network Performance",
        description: "Monitor API latency",
        content:
          "Check the Network Health dashboard for real-time API latency and uptime status.",
        codeBlock: null,
      },
    ],
    nextSteps: ["data-analysis-basics"],
    relatedGuides: ["first-heatmap-setup", "installation-guide"],
  },

  "data-analysis-basics": {
    title: "Data Analysis Basics",
    description: "Learn fundamental data analysis and interpretation",
    icon: ArrowTrendingUpIcon,
    estimatedTime: "15-20 minutes",
    difficulty: "Intermediate",
    sections: [
      {
        id: "step-1",
        title: "Reading Heatmap Data",
        description: "Interpret heatmap visualizations effectively",
        content:
          "Heatmaps use color intensity: Red/Hot = high interaction, Yellow/Warm = medium, Blue/Cool = low. Hot spots show areas of interest.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Analyzing User Sessions",
        description: "Review individual user sessions and behavior",
        content:
          "Session recordings show exactly how users interact with your site. Watch interactions, identify friction points, and find UX issues.",
        codeBlock: null,
      },
      {
        id: "step-3",
        title: "Understanding Conversion Funnels",
        description: "Track and optimize conversion paths",
        content:
          "Create funnels to track user progression: Landing > Product > Cart > Checkout > Purchase. Identify and optimize drop-off points.",
        codeBlock: null,
      },
      {
        id: "step-4",
        title: "Actionable Insights & Recommendations",
        description: "Turn data into actionable improvements",
        content:
          "Use AI-powered insights to identify high-impact improvements and get optimization recommendations.",
        codeBlock: null,
      },
    ],
    nextSteps: [],
    relatedGuides: ["dashboard-overview"],
  },
  "a-b-testing-experiments": {
    title: "A/B Testing Experiments",
    description: "Create and manage experiments to optimize user experience",
    icon: BeakerIcon,
    estimatedTime: "15-20 minutes",
    difficulty: "Advanced",
    sections: [
      {
        id: "step-1",
        title: "Initialize the AB Editor",
        description: "Launch the visual editor",
        content:
          "From your dashboard, navigate to Experiments and click 'Open Editor'. This will launch the visual editor over your live site.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Create Variants",
        description: "Define your test variants",
        content:
          "Select the element you want to test and create variations. You can change text, colors, visibility, and more.",
        codeBlock: null,
      },
      {
        id: "step-3",
        title: "Set Traffic Distribution",
        description: "Control user exposure",
        content:
          "Choose what percentage of traffic sees each variant. We recommend a 50/50 split for simple A/B tests.",
        codeBlock: null,
      },
      {
        id: "step-4",
        title: "Define Goals",
        description: "Measure success",
        content:
          "Select the metric you want to improve (e.g., Clicks, Form Submissions, Page Views).",
        codeBlock: null,
      },
    ],
    nextSteps: ["data-analysis-basics"],
    relatedGuides: ["dashboard-overview"],
  },

  "network-performance": {
    title: "Network Performance",
    description: "Monitor API latency and resource loading health",
    icon: SignalIcon,
    estimatedTime: "10-15 minutes",
    difficulty: "Advanced",
    sections: [
      {
        id: "step-1",
        title: "View Network Health",
        description: "Check global status",
        content:
          "The Network Health dashboard shows real-time API latency and uptime status across different regions.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Analyze Latency",
        description: "Drill down into response times",
        content:
          "View detailed breakdown of request times (DNS, SSL, TTFB, Download) to identify bottlenecks.",
        codeBlock: null,
      },
      {
        id: "step-3",
        title: "Set Alerts",
        description: "Get notified of issues",
        content:
          "Configure alerts to be notified via email or Slack when latency exceeds your defined thresholds.",
        codeBlock: null,
      },
    ],
    nextSteps: ["dashboard-overview"],
    relatedGuides: ["dashboard-overview", "data-analysis-basics"],
  },

};

export const allGuideSlugs = Object.keys(guidesData);

export type GuideKey = keyof typeof guidesData;
