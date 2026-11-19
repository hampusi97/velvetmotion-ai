'use client';

import React from 'react';
import Link from 'next/link';

interface LegalPageProps {
  page: 'terms' | 'privacy' | 'policy';
  contactEmail?: string;
}

/**
 * Drop into app/terms/page.tsx, app/privacy/page.tsx, and app/policy/page.tsx:
 *   export default function TermsPage() { return <LegalPage page="terms" />; }
 */
export default function LegalPage({
  page,
  contactEmail = 'abuse@velvetmotion.ai',
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#05050a] px-4 py-12 text-[#f7f7fc]">
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl neon-glass p-6 sm:p-8">
        <Link
          href="/"
          className="inline-block rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
        >
          &larr; Back to VelvetMotion
        </Link>

        {page === 'terms' && (
          <>
            <h1 className="text-2xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-xs text-zinc-400">Last updated: November 2026</p>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                VelvetMotion AI is an interactive fictional entertainment platform for adults aged <strong>18 and older</strong>. By accessing or using this site, you confirm that you are at least 18 years old (or the age of majority in your jurisdiction).
              </p>
              <p>
                All companions, portraits, voices, and conversations on VelvetMotion AI are <strong>100% fictional and AI-generated</strong>. Companions are not real people and do not provide medical, legal, financial, or crisis advice.
              </p>
              <p>
                You agree not to use the service to generate or upload unlawful content, including any depiction of minors or non-consensual likenesses of real individuals. Violations result in immediate access termination.
              </p>
            </div>
          </>
        )}

        {page === 'privacy' && (
          <>
            <h1 className="text-2xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-xs text-zinc-400">Last updated: November 2026</p>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                VelvetMotion AI is designed <strong>local-first</strong>. Your chat histories, memory notes, custom companions, and matches are stored locally on your own device (IndexedDB / localStorage) and can be exported or permanently wiped at any time from Settings.
              </p>
              <p>
                When you send a chat message or request an AI-generated photo, only the prompt required for that generation is transmitted to the selected AI provider (such as Cloudflare Workers AI, AI Horde, or your own configured API key).
              </p>
              <p>
                We do not sell personal data or require an email address to browse or chat. For privacy questions, contact <span className="text-[#f45b84]">{contactEmail}</span>.
              </p>
            </div>
          </>
        )}

        {page === 'policy' && (
          <>
            <h1 className="text-2xl font-extrabold text-white">18+ Safety, Content &amp; DMCA Policy</h1>
            <p className="text-xs text-zinc-400">Last updated: November 2026</p>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                <strong>Strictly 18+ Fictional Adults Only:</strong> VelvetMotion AI enforces a zero-tolerance policy against Child Sexual Abuse Material (CSAM), sexualized depictions of minors in any form, and Non-Consensual Intimate Imagery (NCII) or deepfakes of real people.
              </p>
              <p>
                <strong>Automated Prompt Guardrails:</strong> Prompts referencing minors or real-person deepfakes are blocked prior to generation. Custom uploads are restricted to original fictional artwork or properly licensed character cards.
              </p>
              <p>
                <strong>DMCA &amp; Abuse Takedowns:</strong> To report suspected copyright infringement, unauthorized likeness use, or policy violations, email <span className="text-[#f45b84]">{contactEmail}</span> with the specific URL and details. Verified reports are acted on promptly.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}