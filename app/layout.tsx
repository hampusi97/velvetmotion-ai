import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelvetMotion AI",
  description: "Your darkest fantasies. Always available.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
