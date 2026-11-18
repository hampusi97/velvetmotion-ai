import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelvetMotion AI",
  description: "Adult AI companions — chat, JOI, tributes. Fictional 21+ only.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VelvetMotion",
  },
  openGraph: {
    title: "VelvetMotion AI",
    description: "Adult AI companions — chat, JOI, tributes. Fictional 21+ only.",
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
        <link rel="manifest" href="/manifest.json" />
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
