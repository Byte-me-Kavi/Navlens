import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://navlens.io"),
  title: {
    default: "Navlens Analytics - Visual User Behavior Insights",
    template: "%s | Navlens Analytics",
  },
  description:
    "Powerful web analytics with heatmaps, session recordings, and conversion funnels. Understand how users interact with your website.",
  keywords: [
    "navlens",
    "navlens analytics",
    "heatmap",
    "session recording",
    "user behavior",
    "web analytics",
    "ux optimization",
    "conversion rate optimization",
    "click tracking",
  ],
  authors: [{ name: "Navlens Team" }],
  creator: "Navlens Analytics",
  publisher: "Navlens Analytics",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Navlens Analytics - Visual User Behavior Insights",
    description:
      "Visualize user behavior with stunning heatmaps. Track every click, scroll, and interaction to optimize your website's performance.",
    siteName: "Navlens Analytics",
  },
  twitter: {
    card: "summary_large_image",
    title: "Navlens Analytics",
    description:
      "Visualize user behavior with stunning heatmaps. Track every click, scroll, and interaction.",
    creator: "@navlens",
  },
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Navlens Analytics",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Track User Behavior On Your Website with Heatmaps, Session Recording, and Analytics.",
      },
      {
        "@type": "Organization",
        name: "Navlens Analytics",
        url: process.env.NEXT_PUBLIC_APP_URL || "https://navlens.io",
        logo: `${
          process.env.NEXT_PUBLIC_APP_URL || "https://navlens.io"
        }/logo.png`,
        sameAs: ["https://twitter.com/navlens"],
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <ClientLayout>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </ClientLayout>
    </html>
  );
}
