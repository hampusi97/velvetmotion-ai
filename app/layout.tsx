import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";


const TITLE = "VelvetMotion AI";
const TAGLINE =
  "Explore fictional adult companions, chat, create art and discover private local-first experiences.";
const DESC =
  "VelvetMotion Private Atelier: fictional adult AI companions, conversations, synthetic voices, image and video tools, and optional local models. Generation depends on compatible services.";

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
    "fictional adult AI",
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
  themeColor: "#0e0a12",
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
        <meta name="theme-color" content="#0e0a12" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var n=localStorage.getItem('vm-neon-intensity');if(n==='subtle'||n==='hyper'){document.documentElement.setAttribute('data-neon',n);}if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="relative min-h-dvh bg-[#0e0a12] font-sans text-[#f7f7fc] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-[#ff1e8e] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
        >
          Skip to main content
        </a>
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
