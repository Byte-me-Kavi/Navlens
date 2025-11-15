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
      </body>
    </html>
  );
}
