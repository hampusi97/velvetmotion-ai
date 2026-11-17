"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/characters";
import { saveCustomCompanionToFirestore } from "@/lib/firebase";

const STYLES = ["Realistic", "Soft glam", "Anime"] as const;
const ETHNICITIES = [
  "Caucasian",
  "Latina",
  "East Asian",
  "Black / Afro",
  "South Asian",
  "Middle Eastern",
  "Mixed",
] as const;
const BODIES = ["Slim", "Athletic", "Curvy", "Soft", "Tall model"] as const;
const CHESTS = ["Petite", "Average", "Full", "Busty"] as const;
const EYES = ["Brown", "Blue", "Green", "Hazel", "Gray"] as const;
const HAIR = [
  "Long dark",
  "Blonde waves",
  "Redhead",
  "Black bob",
  "Pink tips",
  "Silver",
  "Braids",
  "Messy bun",
] as const;
const PERSONALITIES = [
  "Sweet girlfriend",
  "Dominant",
  "Shy & curious",
  "Brat",
  "Nurturing",
  "Playful tease",
  "Intense",
  "Romantic",
  "Nympho",
  "Caregiver",
  "Queen",
] as const;
const RELATIONSHIPS = [
  "Stranger",
  "Match",
  "Girlfriend",
  "Friends with benefits",
  "Boss",
  "Neighbor",
  "Colleague",
  "Ex",
  "Wife",
] as const;

type WizardProps = {
  onDone: (character: Character) => void;
  onHome: () => void;
};

function deterministicSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function portraitUrl(look: string, style: string, name = "", mood = "seductive") {
  const stylePrefix = style === "Anime" ? "anime style, detailed eyes," : "photorealistic, ultra detailed skin,";
  const prompt = encodeURIComponent(
    `${stylePrefix} beautiful adult woman 24 years old, ${look}, ${mood} portrait, soft cinematic lighting, looking at viewer, masterpiece, 8k uhd`,
  );
  const seed = deterministicSeed(`${look}|${style}|${name}|${mood}`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

export function CreateGirlWizard({ onDone, onHome }: WizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Realistic");
  const [ethnicity, setEthnicity] = useState<(typeof ETHNICITIES)[number]>("Caucasian");
  const [body, setBody] = useState<(typeof BODIES)[number]>("Curvy");
  const [chest, setChest] = useState<(typeof CHESTS)[number]>("Full");
  const [eyes, setEyes] = useState<(typeof EYES)[number]>("Brown");
  const [hair, setHair] = useState<(typeof HAIR)[number]>("Long dark");
  const [personality, setPersonality] = useState<(typeof PERSONALITIES)[number]>("Sweet girlfriend");
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number]>("Match");
  const [kink, setKink] = useState("Teasing and slow undressing");
  const [bio, setBio] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const look = useMemo(
    () =>
      `${ethnicity} features, ${body.toLowerCase()} body, ${chest.toLowerCase()} chest, ${eyes.toLowerCase()} eyes, ${hair.toLowerCase()} hair`,
    [ethnicity, body, chest, eyes, hair],
  );

  const previewSrc = useMemo(
    () => photoDataUrl || portraitUrl(look, style, name.trim() || "preview"),
    [photoDataUrl, look, style, name],
  );

  const onFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const finish = () => {
    setBusy(true);
    const id = `custom-${Date.now()}`;
    const displayName = name.trim() || "Your Girl";
    const avatar = photoDataUrl || portraitUrl(look, style, displayName);
    const category =
      personality.includes("Dominant") || personality === "Queen"
        ? "Dominant"
        : personality.includes("Shy")
          ? "Shy"
          : personality.includes("Brat")
            ? "Brat"
            : personality.includes("Nurturing") || personality === "Caregiver"
              ? "Nurturing"
              : personality.includes("Romantic")
                ? "Romantic"
                : personality.includes("Intense")
                  ? "Intense"
                  : "Playful";

    const character: Character = {
      id,
      name: displayName,
      age: 24,
      tagline: `${relationship} · ${personality}. ${kink}.`,
      category,
      avatar,
      voiceIntro: `Hey… it's ${displayName}.`,
      initialMessage:
        bio.trim() ||
        `I saw your message. I'm ${displayName} — ${personality.toLowerCase()}. Tell me what kind of night you want.`,
      tags: [personality, relationship, style, "Custom"],
      intimacy: 55,
      voice: {
        label: personality.includes("Dominant") ? "Low command" : "Warm",
        pitch: personality.includes("Dominant") ? 0.9 : 1.05,
        rate: 0.95,
        style: `${personality} energy. Speaks like a real adult partner.`,
      },
      personality,
      traits: [personality, relationship, style],
      background: `Original fictional adult created by the user. ${look}.`,
      figure: look,
      kink,
      reply: `She smiles. “I'm ${displayName}. Your move.”`,
    };

    try {
      const raw = localStorage.getItem("velvet-custom-girls");
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(character);
      localStorage.setItem("velvet-custom-girls", JSON.stringify(list.slice(0, 40)));
    } catch {
      /* ignore */
    }

    void saveCustomCompanionToFirestore({
      id: character.id,
      name: character.name,
      age: character.age,
      category: character.category,
      tagline: character.tagline,
      personality: character.personality,
      figure: character.figure,
      kink: character.kink,
      avatar: character.avatar.startsWith("http") || character.avatar.startsWith("data:")
        ? character.avatar
        : portraitUrl(look, style, displayName),
    }).catch(() => {});

    setBusy(false);
    onDone(character);
  };

  const steps = ["Style", "Look", "Details", "Mind", "Photo", "Finish"];

  return (
    <div className="max-w-lg mx-auto pb-16">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-4 hover:text-pink-300">
        ← Home
      </button>
      <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Create your AI girlfriend
      </h2>
      <p className="text-sm text-zinc-400 mt-1">
        Step {step + 1} of {steps.length} · {steps[step]}
      </p>

      <div className="flex gap-1 mt-4 mb-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-gradient-to-r from-pink-500 to-fuchsia-500" : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      {/* Live preview strip */}
      {step >= 1 && step < 5 && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-cream">{name.trim() || "Your Girl"}</div>
            <div className="truncate text-xs text-pink-300/90">{look}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{style} · {personality}</div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-mist">Art style</p>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`py-4 rounded-2xl border text-sm font-medium transition ${
                  style === s
                    ? "border-pink-500 bg-pink-500/15 text-pink-200 shadow-lg shadow-pink-500/10"
                    : "border-white/10 hover:border-pink-500/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 pt-2">
            Realistic gives magazine-quality nudes. Soft glam is dreamy. Anime is stylized.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Ethnicity vibe</p>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEthnicity(e)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    ethnicity === e
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Body type</p>
            <div className="flex flex-wrap gap-2">
              {BODIES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBody(b)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    body === b
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Chest</p>
            <div className="flex flex-wrap gap-2">
              {CHESTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChest(c)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    chest === c
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Eyes</p>
            <div className="flex flex-wrap gap-2">
              {EYES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEyes(e)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    eyes === e
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Hair</p>
            <div className="flex flex-wrap gap-2">
              {HAIR.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHair(h)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    hair === h
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nova"
              className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Personality</p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersonality(p)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    personality === p
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Relationship to you</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRelationship(r)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    relationship === r
                      ? "border-pink-500 bg-pink-500/15 text-pink-100"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Favorite heat / kink</label>
            <input
              value={kink}
              onChange={(e) => setKink(e.target.value)}
              className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">First message (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none outline-none focus:border-pink-500"
              placeholder="How she opens the chat…"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Upload a reference photo to seed her face (your art, stock, or a selfie for couple-shot energy).
            Stored only on this device.{" "}
            <span className="text-zinc-500">Do not upload real people without consent.</span>
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-pink-500/40 bg-pink-500/5 py-12 cursor-pointer hover:bg-pink-500/10 transition">
            <span className="text-4xl">📷</span>
            <span className="text-sm text-pink-200">{photoDataUrl ? "Replace photo" : "Upload reference photo"}</span>
            <span className="text-xs text-zinc-500">or skip for auto-generated portrait</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
          {photoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUrl}
              alt="Reference"
              className="w-full max-h-72 object-contain rounded-2xl border border-white/10"
            />
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5 text-center">
          <div className="aspect-[3/4] max-w-[240px] mx-auto rounded-3xl overflow-hidden border border-pink-500/40 bg-zinc-900 shadow-2xl shadow-pink-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-cream">{name.trim() || "Your Girl"}</div>
            <div className="text-sm text-pink-300 mt-1">
              {personality} · {relationship}
            </div>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">{look}</p>
            <p className="text-xs text-zinc-500 mt-1">{kink}</p>
          </div>
          <p className="text-xs text-zinc-500">
            She will chat, undress on Generate, run tributes, and remember gifts like the rest of the cast.
          </p>
        </div>
      )}

      <div className="mt-8 flex gap-2 sticky bottom-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-3.5 rounded-2xl border border-white/15 text-sm font-medium hover:bg-white/5"
          >
            Back
          </button>
        )}
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/25"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/25 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create & chat"}
          </button>
        )}
      </div>
    </div>
  );
}
