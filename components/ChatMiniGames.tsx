"use client";

import { useState } from "react";
import { Dices, Flame, Sparkles, X } from "lucide-react";

const TRUTHS = [
  "What's a secret late-night fantasy you've never admitted out loud before?",
  "If we had zero rules for the next two hours, what's the very first thing you'd ask me to do?",
  "What outfit or look drives you completely crazy when someone wears it just for you?",
  "What's the boldest voice message you've ever wanted to wake up to?",
];

const DARES = [
  "Describe right now—in three vivid words—where you'd put your hands first.",
  "Drop a 1-sentence dare I have to perform in a Scene Selfie right now.",
  "Switch the mood and give me your best midnight confession without holding back.",
  "Pick an outfit mood (Lace, Neon Balcony, or After Hours) and demand a photo.",
];

const WHEEL_SEGMENTS = [
  { label: "Flirty Question", color: "text-[#00f5ff]", prompt: "*Spin Wheel landed on Flirty Question:* Ask me your boldest midnight question and hold nothing back." },
  { label: "Dare", color: "text-[#ff1e8e]", prompt: "*Spin Wheel landed on Dare:* I dare you to command my next pose and lighting in Scene Selfies!" },
  { label: "Outfit Change", color: "text-[#ff4dff]", prompt: "*Spin Wheel landed on Outfit Change:* Pick any outfit mood right now—I'm slipping into it for you." },
  { label: "Voice Note", color: "text-amber-300", prompt: "*Spin Wheel landed on Voice Note:* Tap Voice on my reply so I can whisper this line right into your ear." },
  { label: "Bonus +15 XP", color: "text-[#00ffa3]", bonusXp: 15, prompt: "*JACKPOT · Bonus +15 XP!* We just leveled up our chemistry—claim your reward and make a wish!" },
] as const;

export function ChatMiniGames({
  open,
  companionName,
  onClose,
  onPlayPrompt,
}: {
  open: boolean;
  companionName: string;
  onClose: () => void;
  onPlayPrompt: (prompt: string, bonusXp?: number) => void;
}) {
  const [tab, setTab] = useState<"wheel" | "truth-dare">("wheel");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [landedIdx, setLandedIdx] = useState<number | null>(null);
  const [cardIdx, setCardIdx] = useState(0);

  if (!open) return null;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setLandedIdx(null);
    const chosen = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const degPerSeg = 360 / WHEEL_SEGMENTS.length;
    const nextRot = rotation + 1080 + (360 - chosen * degPerSeg);
    setRotation(nextRot);
    setTimeout(() => {
      setSpinning(false);
      setLandedIdx(chosen);
    }, 950);
  };

  const first = companionName.split(" ")[0];
  const landed = landedIdx !== null ? WHEEL_SEGMENTS[landedIdx] : null;

  return (
    <div className="mx-2 mb-2 rounded-2xl neon-glass bg-[#090914]/95 p-3.5 space-y-3 border border-[#00f5ff]/40 shadow-[0_0_24px_rgba(0,245,255,0.16)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dices className="h-4 w-4 text-[#00f5ff]" />
          <span className="text-xs font-extrabold text-[#f7f7fc]">Interactive Mini-Games with {first}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Mini-Games"
          className="rounded-full p-1 text-[#a6a6c4] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#05050a] p-1 border border-white/10 text-xs font-bold">
        <button
          type="button"
          onClick={() => setTab("wheel")}
          className={`rounded-lg py-1.5 transition ${tab === "wheel" ? "neon-btn-primary text-white" : "text-[#a6a6c4]"}`}
        >
          🎡 Neon Spin Wheel
        </button>
        <button
          type="button"
          onClick={() => setTab("truth-dare")}
          className={`rounded-lg py-1.5 transition ${tab === "truth-dare" ? "neon-btn-primary text-white" : "text-[#a6a6c4]"}`}
        >
          🔥 Truth or Dare
        </button>
      </div>

      {tab === "wheel" && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <div className="absolute -top-1.5 z-10 h-3 w-3 rotate-45 bg-[#00f5ff] shadow-[0_0_10px_#00f5ff]" />
            <div
              className="h-24 w-24 rounded-full border-4 border-[#ff1e8e] shadow-[0_0_22px_rgba(255,30,142,0.55)] flex items-center justify-center transition-transform duration-1000 ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                background:
                  "conic-gradient(#ff1e8e 0deg 72deg, #0c0c16 72deg 144deg, #00f5ff 144deg 216deg, #a855f7 216deg 288deg, #00ffa3 288deg 360deg)",
              }}
            >
              <div className="h-9 w-9 rounded-full bg-[#05050a] border border-white/25 flex items-center justify-center text-xs font-black text-white">
                {spinning ? "⚡" : "SPIN"}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap justify-center sm:justify-start gap-1">
              {WHEEL_SEGMENTS.map((seg, i) => (
                <span
                  key={seg.label}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    landedIdx === i ? "border-[#00f5ff] bg-[#00f5ff]/20 text-white" : "border-white/10 text-[#a6a6c4]"
                  }`}
                >
                  {seg.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <button
                type="button"
                disabled={spinning}
                onClick={spin}
                className="rounded-full border border-[#00f5ff]/60 bg-[#00f5ff]/15 px-4 py-1.5 text-xs font-extrabold text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-45"
              >
                {spinning ? "Spinning..." : "Spin Wheel"}
              </button>
              {landed && (
                <button
                  type="button"
                  onClick={() => {
                    onPlayPrompt(landed.prompt, "bonusXp" in landed ? landed.bonusXp : 6);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-full neon-btn-primary px-4 py-1.5 text-xs font-extrabold text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Play “{landed.label}”
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "truth-dare" && (
        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const pick = TRUTHS[cardIdx % TRUTHS.length];
                setCardIdx((i) => i + 1);
                onPlayPrompt(`*Truth Card:* ${pick}`, 6);
                onClose();
              }}
              className="rounded-2xl border border-[#00f5ff]/45 bg-[#00f5ff]/10 p-3 text-left hover:border-[#00f5ff] transition"
            >
              <div className="font-black text-[#00f5ff] mb-1">💬 TRUTH</div>
              <p className="text-[11px] text-[#f7f7fc]">{TRUTHS[cardIdx % TRUTHS.length]}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                const pick = DARES[cardIdx % DARES.length];
                setCardIdx((i) => i + 1);
                onPlayPrompt(`*Dare Card:* ${pick}`, 8);
                onClose();
              }}
              className="rounded-2xl border border-[#ff1e8e]/50 bg-[#ff1e8e]/12 p-3 text-left hover:border-[#ff1e8e] transition"
            >
              <div className="font-black text-[#ff1e8e] mb-1 inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> DARE
              </div>
              <p className="text-[11px] text-[#f7f7fc]">{DARES[cardIdx % DARES.length]}</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
