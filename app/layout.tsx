import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelvetMotion AI",
  description: "Your darkest fantasies. Always available. Fictional characters only.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07060a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink-950 font-sans text-cream antialiased">{children}</body>
    </html>
  );
}
