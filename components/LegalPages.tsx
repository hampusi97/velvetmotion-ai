"use client";

export function LegalPages({
  page,
  onHome,
}: {
  page: "terms" | "privacy" | "safety";
  onHome: () => void;
}) {
  const title =
    page === "terms" ? "Terms of Use" : page === "privacy" ? "Privacy" : "Safety & Content";

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20 text-sm text-zinc-300 leading-relaxed">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">{title}</h1>
      <p className="text-xs text-zinc-500">VelvetMotion AI · Free adult fantasy platform · Updated 2026</p>

      {page === "terms" && (
        <div className="space-y-3">
          <p>
            VelvetMotion is a free entertainment product for adults 18+. All companions are
            <strong className="text-cream"> fictional AI characters</strong> aged 21+ in-fiction. They are not real
            people, do not have feelings, and cannot form real relationships or keep promises.
          </p>
          <p>
            You must be 18 or older to use this site. You agree not to upload or request content involving anyone under
            18, real non-consensual deepfakes of private individuals, or illegal material.
          </p>
          <p>
            The service is provided <strong className="text-cream">free of charge</strong> “as is.” Media is generated
            by third-party or local models and may fail, be inconsistent, or be unavailable. We do not guarantee uptime
            or output quality.
          </p>
          <p>
            You retain responsibility for how you use generated content. Do not claim AI images depict real identified
            people without rights.
          </p>
          <p>We may update these terms; continued use means you accept the current version.</p>
        </div>
      )}

      {page === "privacy" && (
        <div className="space-y-3">
          <p>
            <strong className="text-cream">Local-first:</strong> chats, coins, galleries, and custom girls are stored in
            your browser (localStorage) by default. Clearing site data deletes them.
          </p>
          <p>
            Optional Firebase sync (if configured) may store account profile, chat summaries, and custom companions under
            your auth uid. We do not sell personal data.
          </p>
          <p>
            Uploaded reference photos for Create stay on your device unless you enable cloud features. Do not upload
            photos of real people without consent.
          </p>
          <p>
            Third-party image/LLM APIs (e.g. Pollinations, your own Ollama/Comfy endpoint) process prompts you send. Read
            those providers’ policies if you use them.
          </p>
          <p>Contact the site operator for deletion requests related to any cloud account you created.</p>
        </div>
      )}

      {page === "safety" && (
        <div className="space-y-3">
          <p>
            <strong className="text-cream">18+ only.</strong> Age gate is required. Content is adult sexual fantasy
            involving fictional adults only.
          </p>
          <p>
            No CSAM, no real minors, no non-consensual deepfakes of private individuals. Report abuse if you see policy
            violations.
          </p>
          <p>
            AI can produce unexpected or inaccurate content. If a conversation is harmful to your wellbeing, take a break
            and seek real-world support when needed.
          </p>
          <p>
            NSFW features (JOI, SPH, BNWO, explicit media) are opt-in fantasy tools for consenting adults exploring
            fiction — not advice or real-world instructions involving non-consenting people.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-4 text-xs">
        <button type="button" onClick={onHome} className="text-pink-400">
          Back to app
        </button>
      </div>
    </div>
  );
}
