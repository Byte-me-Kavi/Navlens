import type { Metadata } from "next";
import { Toast } from "../components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navlens",
  description:
    "Visualize user interactions with heatmaps and session recordings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <Toast>{children}</Toast>
        {/* IMPORTANT: Load your tracker.js script here.
          Using `defer` ensures it doesn't block page rendering
          and runs after the DOM is ready.
          
          REQUIRED ATTRIBUTES:
          - data-site-id: Your unique site ID from the dashboard
          - data-api-key: Your site's API key from the dashboard (required for security)
          - data-api-host: Your Navlens API host URL
        */}
        <script
          async
          src="https://navlens-git-v2-smartheatmap-kavishas-projects-947ef8e4.vercel.app/tracker.js"
          data-site-id="a2a95f61-1024-40f8-af7e-4c4df2fcbd01"
          data-api-key="69e4dce7-5f3b-44c9-a0e1-aea13097e8a1"
          data-api-host="https://navlens-git-v2-smartheatmap-kavishas-projects-947ef8e4.vercel.app"
        ></script>
        <script
          async
          src="https://t.contentsquare.net/uxa/7e0bb10da0b7c.js"
        ></script>
      </body>
    </html>
  );
}
