import {
  RocketLaunchIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  Cog8ToothIcon,
  ArrowTrendingUpIcon,
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
        title: "Step 2: Install the Package",
        description: "Install Navlens using npm or yarn in your project",
        content:
          "Choose your package manager and run the installation command.",
        codeBlock:
          "npm install @navlens/core\n# or\nyarn add @navlens/core\n# or\npnpm add @navlens/core",
      },
      {
        id: "step-3",
        title: "Step 3: Initialize Navlens",
        description: "Add the initialization code to your main application file",
        content:
          "Initialize Navlens early in your application lifecycle for web applications.",
        codeBlock:
          "<script>\n  window.navlensConfig = {\n    apiKey: 'YOUR_API_KEY',\n    trackingId: 'YOUR_SITE_ID'\n  };\n</script>\n<script src=\"https://cdn.navlens.io/tracker.js\"><\\/script>",
      },
    ],
    nextSteps: ["first-heatmap-setup", "tracking-configuration"],
    relatedGuides: ["first-heatmap-setup", "dashboard-overview"],
  },
  "first-heatmap-setup": {
    title: "First Heatmap Setup",
    description: "Create and configure your first heatmap visualization",
    icon: CursorArrowRaysIcon,
    estimatedTime: "10-15 minutes",
    difficulty: "Beginner",
    sections: [
      {
        id: "step-1",
        title: "Step 1: Navigate to Heatmaps",
        description: "Access the heatmap section from your dashboard",
        content:
          "Click on Heatmaps in the left sidebar. This will show you all heatmaps for your current project.",
        codeBlock: null,
      },
      {
        id: "step-2",
        title: "Step 2: Create a New Heatmap",
        description: "Click the Create Heatmap button to start",
        content:
          "Click the blue Create New Heatmap button. A form will appear to configure your heatmap settings.",
        codeBlock: null,
      },
      {
        id: "step-3",
        title: "Step 3: Configure Heatmap Settings",
        description: "Set up your heatmap parameters",
        content:
          "Fill in the heatmap details: Name, Page URL, Heatmap Type (Click/Scroll/Movement), and Update Frequency.",
        codeBlock: null,
      },
      {
        id: "step-4",
        title: "Step 4: Start Tracking",
        description: "Enable tracking and view real-time data",
        content:
          "Click Create Heatmap to start collecting data. Your heatmap will begin displaying data within minutes.",
        codeBlock: null,
      },
    ],
    nextSteps: ["dashboard-overview", "data-analysis-basics"],
    relatedGuides: ["installation-guide", "tracking-configuration"],
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
        title: "Using Reports & Exports",
        description: "Generate and export reports",
        content:
          "Create custom reports with scheduled generation, multiple export formats, email delivery, and custom date ranges.",
        codeBlock: null,
      },
    ],
    nextSteps: ["data-analysis-basics", "tracking-configuration"],
    relatedGuides: ["first-heatmap-setup", "installation-guide"],
  },
  "tracking-configuration": {
    title: "Tracking Configuration",
    description: "Configure tracking parameters and event collection",
    icon: Cog8ToothIcon,
    estimatedTime: "12-15 minutes",
    difficulty: "Intermediate",
    sections: [
      {
        id: "step-1",
        title: "Basic Event Tracking Setup",
        description: "Configure core tracking parameters",
        content:
          "Set up basic event tracking for your website via Settings > Tracking Configuration.",
        codeBlock:
          "navlens.track('page_view', {\n  page: '/dashboard',\n  referrer: document.referrer\n});\n\nnavlens.track('button_click', {\n  buttonText: 'Sign Up',\n  location: 'hero'\n});",
      },
      {
        id: "step-2",
        title: "Custom Event Tracking",
        description: "Track custom user interactions",
        content:
          "Create custom events to track specific user actions relevant to your business.",
        codeBlock:
          "navlens.trackEvent('form_submit', {\n  formName: 'contact-form'\n});\n\nnavlens.trackEvent('purchase', {\n  productId: '12345',\n  amount: 99.99\n});",
      },
      {
        id: "step-3",
        title: "User Identification",
        description: "Set up user identification for better analytics",
        content:
          "Identify users to track their journey across sessions and understand long-term behavior patterns.",
        codeBlock:
          "navlens.identify(userId, {\n  email: user.email,\n  plan: user.plan\n});\n\nnavlens.setUserProperties({\n  premium: true,\n  region: 'US'\n});",
      },
      {
        id: "step-4",
        title: "Excluding Sensitive Data",
        description: "Protect sensitive information from tracking",
        content:
          "Configure Navlens to ignore passwords, credit cards, and personal data for GDPR compliance.",
        codeBlock:
          "navlens.configure({\n  excludeSelectors: [\n    'input[type=\"password\"]',\n    '[data-sensitive]'\n  ],\n  maskInputs: ['credit_card']\n});",
      },
    ],
    nextSteps: ["data-analysis-basics"],
    relatedGuides: ["installation-guide", "dashboard-overview"],
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
    relatedGuides: ["tracking-configuration", "dashboard-overview"],
  },
};

export const allGuideSlugs = Object.keys(guidesData);

export type GuideKey = keyof typeof guidesData;
