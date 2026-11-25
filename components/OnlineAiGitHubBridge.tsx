"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileCode2, GitPullRequest, Sparkles, Wand2 } from "lucide-react";
import { freeChat } from "@/lib/chatProviders";
import { loadRouterSettings } from "@/lib/chatRouter";

const REPO = "hampusi97/velvetmotion-ai";
const LLMS_TXT_URL = `https://raw.githubusercontent.com/${REPO}/main/public/llms.txt`;

const FILE_BLOCK_DETECT_RE = /<<<FILE:\s*([^\r\n>]+?)>>>/g;
const MD_PATH_DETECT_RE = /(?:^|[\s`:*_"'])((?:app|components|lib|data|src|scripts|public|docs|workers)\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?:$|[\s`:*_"'])/gm;

function detectCandidateFiles(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(FILE_BLOCK_DETECT_RE)) {
    if (m[1]?.trim()) found.add(m[1].trim());
  }
  if (found.size === 0 && text.includes("```")) {
    for (const m of text.matchAll(MD_PATH_DETECT_RE)) {
      if (m[1]?.trim()) found.add(m[1].trim());
    }
  }
  return [...found];
}

export function OnlineAiGitHubBridge() {
  const [goal, setGoal] = useState(
    "Create a new Python helper in src/utils/stats.py that computes message count and average reply length with type hints.",
  );
  const [aiReply, setAiReply] = useState("");
  const [copiedStep1, setCopiedStep1] = useState(false);
  const [copiedStep2, setCopiedStep2] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const onlinePrompt = useMemo(() => {
    const cleanGoal = goal.trim() || "Help me build a new feature or fix bugs in my repository.";
    return [
      `You are helping me build my GitHub repository \`${REPO}\` (Next.js 15 TypeScript static export + Tauri v2 Rust desktop app + Python 3.12 autonomous agent).`,
      `First, read my live repository architecture map if you have web access: ${LLMS_TXT_URL}`,
      "",
      "IMPORTANT OUTPUT FORMAT:",
      "Whenever you write or edit any repository file, wrap each complete file in this exact block so my GitHub Actions agent commits it automatically:",
      "<<<FILE: relative/path/to/file.ext>>>",
      "<complete working code>",
      "<<<END_FILE>>>",
      "",
      `Task: ${cleanGoal}`,
    ].join("\n");
  }, [goal]);

  const detectedFiles = useMemo(() => detectCandidateFiles(aiReply), [aiReply]);

  const copyOnlinePrompt = async () => {
    await navigator.clipboard?.writeText(onlinePrompt);
    setCopiedStep1(true);
    setStatusNotice("Copied! Paste this into your Online Uncensored AI chat, then paste its reply into Step 2 below.");
    setTimeout(() => setCopiedStep1(false), 2000);
  };

  const generateInBrowser = async () => {
    if (generating) return;
    setGenerating(true);
    setStatusNotice("Generating GitHub-ready <<<FILE: ...>>> blocks using live AI...");
    try {
      let repoMap = "";
      try {
        const r = await fetch("/llms.txt", { cache: "no-store" });
        if (r.ok) repoMap = await r.text();
      } catch {
        /* optional context */
      }
      const router = loadRouterSettings();
      const sys = [
        "You are an expert full-stack developer for VelvetMotion AI (Next.js 15 TypeScript, Tauri v2 Rust, Python 3.12).",
        "Always output complete, valid files wrapped in <<<FILE: relative/path/to/file.ext>>> ... <<<END_FILE>>> blocks.",
        repoMap ? `\nRepository Map:\n${repoMap}` : "",
      ].join("\n");

      let reply = "";
      if (router.openRouterApiKey) {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${router.openRouterApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: router.customModel || "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: goal },
            ],
          }),
        });
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        reply = data.choices?.[0]?.message?.content?.trim() || "";
      }

      if (!reply) {
        reply = await freeChat([
          { role: "system", content: sys },
          { role: "user", content: goal },
        ]);
      }

      setAiReply(reply);
      setStatusNotice("Code generated! Review Step 2 below and click 'Send to GitHub & Build Automatically'.");
    } catch (err) {
      setStatusNotice(
        err instanceof Error
          ? `Live generation error: ${err.message}. You can still copy Step 1 into any online Uncensored AI site.`
          : "Could not reach live AI; copy Step 1 into any online Uncensored AI website.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const sendToGitHub = async () => {
    const payload = (aiReply.trim() || goal.trim()).trim();
    if (!payload) {
      setStatusNotice("Enter a task in Step 1 or paste the Online AI's code in Step 2 first.");
      return;
    }
    const titleSummary =
      detectedFiles.length > 0
        ? `[AI Build] Update ${detectedFiles.slice(0, 3).join(", ")}`
        : `[AI Build] ${goal.trim().slice(0, 65) || "Apply AI repository update"}`;

    // URL query limit safety: if payload > 6000 chars, copy full body to clipboard automatically
    if (payload.length > 6000) {
      await navigator.clipboard?.writeText(payload);
      setCopiedStep2(true);
      setStatusNotice(
        "Response is large, so it was copied to your clipboard! Paste (Ctrl+V) into the GitHub Issue box that just opened and click 'Submit new issue'.",
      );
      const shortUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(titleSummary)}&body=${encodeURIComponent("<!-- Paste (Ctrl+V) the copied Online Uncensored AI response here and click Submit new issue -->")}`;
      window.open(shortUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => setCopiedStep2(false), 3500);
      return;
    }

    const issueUrl = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(titleSummary)}&body=${encodeURIComponent(payload)}`;
    window.open(issueUrl, "_blank", "noopener,noreferrer");
    setStatusNotice(
      "Opened GitHub! Click the green 'Submit new issue' button on that tab — GitHub Actions will automatically apply the code and commit it to main.",
    );
  };

  return (
    <div className="space-y-6">
      {statusNotice && (
        <div
          role="status"
          className="rounded-2xl border border-[#00ffa3]/40 bg-[#00ffa3]/10 px-4 py-3 text-xs font-medium text-[#d4fff0]"
        >
          {statusNotice}
        </div>
      )}

      {/* Step 1 */}
      <section className="rounded-3xl border border-white/15 bg-[#15101d]/90 p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ff1e8e]" />
            Step 1 — Tell the Online Uncensored AI What to Build
          </h2>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#00f5ff] hover:underline"
          >
            View live `/llms.txt` repo map <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="text-xs leading-relaxed text-zinc-300">
          Describe the feature, bug fix, companion, or UI change you want. Then either copy the formatted prompt into{" "}
          <strong>any online Uncensored AI website</strong>, or generate the code right here in one click.
        </p>

        <div>
          <label htmlFor="builder-goal" className="block text-xs font-semibold text-zinc-300 mb-1.5">
            What do you want built or fixed in `{REPO}`?
          </label>
          <textarea
            id="builder-goal"
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-black/50 p-3.5 text-sm text-white focus:border-[#ff1e8e] focus:outline-none"
            placeholder="e.g. Add a new dark-neon badge component in components/StatusBadge.tsx..."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyOnlinePrompt()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ff1e8e]/60 bg-[#ff1e8e]/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-[#ff1e8e]/35"
          >
            {copiedStep1 ? <Check className="h-4 w-4 text-[#00ffa3]" /> : <Copy className="h-4 w-4" />}
            1. Copy Prompt for Online Uncensored AI Website
          </button>

          <button
            type="button"
            disabled={generating}
            onClick={() => void generateInBrowser()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-4 py-2.5 text-xs font-bold text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" />
            {generating ? "Generating Code..." : "Or Generate Code Right Here"}
          </button>
        </div>
      </section>

      {/* Step 2 */}
      <section className="rounded-3xl border border-white/15 bg-[#15101d]/90 p-5 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-[#00ffa3]" />
            Step 2 — Paste Online Uncensored AI Reply &amp; Push to GitHub
          </h2>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-mono text-zinc-200">
            {detectedFiles.length > 0
              ? `Detected ${detectedFiles.length} file(s): ${detectedFiles.join(", ")}`
              : aiReply.trim()
                ? "Agent task mode (GitHub AI will inspect & edit)"
                : "Waiting for Online AI reply"}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-zinc-300">
          Paste the entire response from the online Uncensored AI website below (both{" "}
          <code className="text-[#00f5ff]">&lt;&lt;&lt;FILE: path&gt;&gt;&gt;</code> blocks and standard Markdown code
          blocks are supported). Clicking the button opens a pre-filled GitHub Issue—just click{" "}
          <strong>Submit new issue</strong> and GitHub Actions will write, typecheck, and commit the code to{" "}
          <code>main</code>.
        </p>

        <textarea
          aria-label="Online Uncensored AI response"
          rows={9}
          value={aiReply}
          onChange={(e) => setAiReply(e.target.value)}
          className="w-full rounded-2xl border border-white/15 bg-black/60 p-3.5 font-mono text-xs text-zinc-100 focus:border-[#00ffa3] focus:outline-none"
          placeholder={"<<<FILE: src/utils/stats.py>>>\ndef compute_stats():\n    ...\n<<<END_FILE>>>"}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void sendToGitHub()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#00ffa3]/60 bg-[#00ffa3]/20 px-5 py-3 text-xs font-extrabold text-[#00ffa3] hover:bg-[#00ffa3]/30"
          >
            <GitPullRequest className="h-4 w-4" />
            {copiedStep2 ? "Copied Large Payload — Paste in GitHub Tab" : "2. Send to GitHub & Build Automatically"}
          </button>

          <a
            href={`https://github.com/${REPO}/actions/workflows/uncensored-ai.yml`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-zinc-200 hover:border-white/35"
          >
            Open GitHub Actions Live Logs <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
