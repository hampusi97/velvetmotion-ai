import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";


const TITLE = "VelvetMotion AI";
const TAGLINE =
  "Match → chat → studio. Private uncensored companions. Fictional adults 18+ only.";
const DESC =
  "Free NSFW AI companions — Discover swipe, neural voice calls, Pro Media Studio, and local GPU acceleration. Fictional 18+ characters only.";

export const metadata: Metadata = {
  metadataBase: new URL("https://velvetmotion-ai.hampusi97.workers.dev"),
  title: {
    default: TITLE,
    template: `%s · ${TITLE}`,
  },
  description: DESC,
  applicationName: "VelvetMotion",
  manifest: "/manifest.json",
  keywords: [
    "AI companion",
    "NSFW chat",
    "virtual companion",
    "local AI",
    "voice companion",
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
  themeColor: "#05050a",
};

const cfAnalyticsToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN || "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-neon="hyper"
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#05050a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var n=localStorage.getItem('vm-neon-intensity');if(n==='subtle'||n==='hyper'){document.documentElement.setAttribute('data-neon',n);}if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="relative min-h-dvh bg-[#05050a] font-sans text-[#f7f7fc] antialiased">
        <div className="vm-ambient-mesh" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
        {cfAnalyticsToken ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfAnalyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
