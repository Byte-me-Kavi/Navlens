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
  // Determine tracker URL based on environment
  // const trackerUrl =
  //   process.env.NODE_ENV === "development"
  //     ? "http://localhost:3000/tracker.js"
  //     : "https://navlens-rho.vercel.app/tracker.js";

  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <Toast>{children}</Toast>
        {/* <script
          async
          src={trackerUrl}
          data-site-id="52db6643-bda5-4b02-9a38-658b14f7f29a"
          data-api-key="69e4dce7-5f3b-44c9-a0e1-aea13097e8a1"
          data-api-host={
            process.env.NODE_ENV === "development"
              ? "http://localhost:3000"
              : "https://navlens-git-v2-dom-recreation-kavishas-projects-947ef8e4.vercel.app"
          }
        ></script> */}
      </body>
    </html>
  );
}
