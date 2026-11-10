import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adults only",
  description: "VelvetMotion is an 18+ space for fictional adult characters.",
};

export default function EnterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
