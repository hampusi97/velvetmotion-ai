import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://velvetmotion-ai.vercel.app"),
  title: "VelvetMotion AI — Adult AI Companions, 3D JOI Stage & Live Voice",
  description:
    "100% free adult AI companions — chat, 3D Penthouse & JOI stage, tributes, live lounge, and Android/iOS apps. Fictional adults 21+ only.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VelvetMotion",
  },
  openGraph: {
    title: "VelvetMotion AI",
    description:
      "Adult AI companions — chat, 3D JOI stage, tributes, live lounge & Android/iOS apps. Fictional 21+ only.",
    url: "https://velvetmotion-ai.vercel.app",
    siteName: "VelvetMotion AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VelvetMotion AI",
    description: "Adult AI companions — chat, 3D JOI stage, tributes & live lounge. 21+ only.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#db2777",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-dvh bg-ink-950 font-sans text-cream antialiased">
        {children}
      </body>
    </html>
  );
}
