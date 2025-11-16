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
        */}
        <script 
          async 
          src="https://navlens-rho.vercel.app/tracker.js" 
          data-site-id="a2a95f61-1024-40f8-af7e-4c4df2fcbd01"
          data-api-host="https://navlens-rho.vercel.app"
        ></script>
      </body>
    </html>
  );
}
