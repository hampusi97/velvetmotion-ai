import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";

const TITLE = "VelvetMotion AI";
const TAGLINE =
  "Match → chat → 3D. Private uncensored companions. Fictional adults 21+ only.";
const DESC =
  "Free NSFW AI girlfriends — Discover swipe, chat, nudes, JOI, vault, and a live 3D stage. Fictional 21+ characters only.";

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: `%s · ${TITLE}`,
  },
  description: DESC,
  applicationName: "VelvetMotion",
  manifest: "/manifest.json",
  keywords: [
    "AI girlfriend",
    "NSFW chat",
    "virtual companion",
    "JOI",
    "3D companion",
    "uncensored AI",
  ],
  authors: [{ name: "VelvetMotion" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VelvetMotion",
  },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: TAGLINE,
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "VelvetMotion AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: TAGLINE,
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
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
        <meta name="theme-color" content="#db2777" />
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
