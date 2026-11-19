"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Tab = "terms" | "privacy" | "safety" | "dmca";

const TABS: { id: Tab; label: string }[] = [
  { id: "safety", label: "Safety & 21+" },
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "dmca", label: "DMCA & Report" },
];

export function LegalPages({
  page,
  onBack,
  onHome,
}: {
  page?: "terms" | "privacy" | "safety";
  onBack?: () => void;
  onHome?: () => void;
}) {
  const [tab, setTab] = useState<Tab>(page || "safety");
  const [reportEmail, setReportEmail] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const handleBack = onBack || onHome;

  const submitReport = () => {
    if (reportText.trim().length < 8) return;
    try {
      const prev = JSON.parse(localStorage.getItem("vm-safety-reports") || "[]");
      localStorage.setItem(
        "vm-safety-reports",
        JSON.stringify([
          { email: reportEmail.trim(), report: reportText.trim(), at: Date.now() },
          ...(Array.isArray(prev) ? prev : []),
        ].slice(0, 20)),
      );
    } catch {
      /* ignore */
    }
    setReportSent(true);
    setReportText("");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 pb-20">
      <div className="flex items-center gap-3">
        {handleBack && (
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back
          </button>
        )}
        <h1 className="text-2xl font-semibold text-white">Legal, Safety &amp; 21+ Compliance</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition",
              tab === t.id
                ? "bg-pink-600/20 text-pink-200 border border-pink-500/40"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="prose prose-invert prose-sm max-w-none text-zinc-300 space-y-4 leading-relaxed">
        {tab === "safety" && (
          <>
            <h2 className="text-lg text-white font-semibold">21+ Fictional Synthetic AI Only</h2>
            <p>
              VelvetMotion AI is an adult entertainment platform strictly for consenting adults (18+/21+ depending on
              your jurisdiction). Every built-in companion is a 100% fictional, computer-generated AI persona depicted
              as an adult aged 21 or older.
            </p>
            <p>
              <strong>18 U.S.C. § 2257 Exemption Notice:</strong> All visuals and conversations generated on
              VelvetMotion AI are computer-generated synthetic media featuring fictional adult personas. No actual human
              performers are photographed or filmed by VelvetMotion AI.
            </p>
            <p>
              <strong>Zero-Tolerance Safety Enforcement:</strong> Server-side guardrails strictly block any CSAM,
              underage/minor content, non-consensual sexual violence, real-person deepfake abuse, or self-harm
              instructions across all chat, image, video, pipeline, and lounge endpoints.
            </p>
          </>
        )}
        {tab === "terms" && (
          <>
            <h2 className="text-lg text-white font-semibold">Terms of Use</h2>
            <p>
              VelvetMotion AI is provided 100% free of charge, as-is, with no required subscriptions or paywalls.
              Optional community tips (including BTC tips to support development and GPU servers) are voluntary gifts
              and non-refundable.
            </p>
            <p>
              You agree not to use the service to create, upload, or share illegal content, including any sexual content
              involving minors (fictional or real) or non-consensual likenesses of real people. Accounts violating this
              policy are permanently blocked.
            </p>
            <p>
              Optional cloud sync (Firebase project <code className="text-pink-200">ivory-sunset-mxq1s</code>) is
              available when you sign in via Email/Password or Google; local features also work via device storage.
            </p>
          </>
        )}
        {tab === "privacy" && (
          <>
            <h2 className="text-lg text-white font-semibold">Privacy Policy</h2>
            <p>
              By default, chats, coins, gallery items, and intimacy progress stay on your device (localStorage). When
              you sign in with Email/Password or Google, your synced vault, gallery, custom companions, lounge posts,
              and optional leaderboard entries are stored under Firebase Security Rules tied strictly to your UID.
            </p>
            <p>
              Image generation requests may call third-party inference endpoints (such as Pollinations or your own
              configured ComfyUI/Ollama server). Never include real-world personally identifying information in media
              prompts.
            </p>
            <p>
              To request full account &amp; Firestore data deletion, email{" "}
              <a href="mailto:support@velvetmotion.ai" className="text-pink-300 underline">
                support@velvetmotion.ai
              </a>{" "}
              from your registered account email.
            </p>
          </>
        )}
        {tab === "dmca" && (
          <div className="space-y-4">
            <h2 className="text-lg text-white font-semibold">Support, Abuse &amp; DMCA Takedown Contact</h2>
            <div className="rounded-2xl border border-pink-500/30 bg-zinc-950/80 p-4 space-y-1.5 text-xs">
              <div>
                <strong className="text-pink-200">Safety &amp; Abuse Desk:</strong>{" "}
                <a href="mailto:support@velvetmotion.ai" className="text-pink-300 underline">
                  support@velvetmotion.ai
                </a>
              </div>
              <div>
                <strong className="text-pink-200">DMCA &amp; Content Takedown Agent:</strong>{" "}
                <a href="mailto:dmca@velvetmotion.ai" className="text-pink-300 underline">
                  dmca@velvetmotion.ai
                </a>
              </div>
              <div>
                <strong className="text-pink-200">Security Vulnerability Disclosure:</strong>{" "}
                <a
                  href="https://github.com/hampusi97/velvetmotion-ai/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-300 underline"
                >
                  github.com/hampusi97/velvetmotion-ai/security ↗
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Submit a Safety or Takedown Report</div>
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="Your contact email (optional)"
                className="w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
              />
              <textarea
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Describe the URL, content, or safety issue for immediate review…"
                className="w-full rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
              />
              <button
                type="button"
                disabled={reportText.trim().length < 8}
                onClick={submitReport}
                className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-500 disabled:opacity-40"
              >
                Submit Safety / DMCA Report
              </button>
              {reportSent && (
                <div className="text-xs text-emerald-300">
                  ✓ Report logged. For urgent DMCA/legal takedowns, also email dmca@velvetmotion.ai directly.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
