import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://navlensanalytics.com'),
  title: {
    default: 'Navlens Analytics | Advanced Web Heatmaps & Session Replays',
    template: '%s | Navlens Analytics'
  },
  description: 'Boost your conversion rates with Navlens Analytics. Detailed heatmaps, session recordings, and user journey analysis to understand user behavior.',
  keywords: ['web analytics', 'heatmaps', 'session replay', 'user behavior', 'conversion optimization', 'UX analytics', 'Navlens Analytics', 'Navlens'],
  authors: [{ name: 'Navlens Analytics Team' }],
  creator: 'Navlens Analytics',
  publisher: 'Navlens Analytics',
  openGraph: {
    title: 'Navlens Analytics | Advanced Web Heatmaps & Session Replays',
    description: 'Understand exactly how users interact with your website through powerful heatmaps and real-time session recordings.',
    url: 'https://navlensanalytics.com',
    siteName: 'Navlens Analytics',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Navlens Analytics | Advanced Web Heatmaps & Session Replays',
    description: 'Understand exactly how users interact with your website through powerful heatmaps and real-time session recordings.',
    creator: '@navlensanalytics', // Placeholder handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ClientLayout>{children}</ClientLayout>
    </html>
  );
}
