"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/characters";

const STYLES = ["Realistic", "Soft glam", "Anime"] as const;
const ETHNICITIES = ["Caucasian", "Latina", "East Asian", "Black / Afro", "South Asian", "Middle Eastern", "Mixed"] as const;
const BODIES = ["Slim", "Athletic", "Curvy", "Soft", "Tall model"] as const;
const HAIR = ["Long dark", "Blonde waves", "Redhead", "Black bob", "Pink tips", "Silver", "Braids"] as const;
const PERSONALITIES = [
  "Sweet girlfriend",
  "Dominant",
  "Shy & curious",
  "Brat",
  "Nurturing",
  "Playful tease",
  "Intense",
  "Romantic",
] as const;
const RELATIONSHIPS = ["Stranger", "Match", "Girlfriend", "Friends with benefits", "Boss", "Neighbor"] as const;

type WizardProps = {
  onDone: (character: Character) => void;
  onHome: () => void;
};

function portraitUrl(look: string, style: string) {
  const prompt = encodeURIComponent(
    `${style === "Anime" ? "anime style" : "photorealistic"} beautiful adult woman 25 years old, ${look}, portrait, soft light, looking at viewer, masterpiece, 8k`,
  );
  const seed = Math.floor(Math.random() * 1e9);
  return `https://image.pollinations.ai/prompt/${prompt}?width=768&height=1152&nologo=true&seed=${seed}&model=flux&enhance=true`;
}

export function CreateGirlWizard({ onDone, onHome }: WizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Realistic");
  const [ethnicity, setEthnicity] = useState<(typeof ETHNICITIES)[number]>("Caucasian");
  const [body, setBody] = useState<(typeof BODIES)[number]>("Curvy");
  const [hair, setHair] = useState<(typeof HAIR)[number]>("Long dark");
  const [personality, setPersonality] = useState<(typeof PERSONALITIES)[number]>("Sweet girlfriend");
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number]>("Match");
  const [kink, setKink] = useState("Teasing and slow undressing");
  const [bio, setBio] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const look = useMemo(
    () => `${ethnicity} features, ${body.toLowerCase()} body, ${hair.toLowerCase()} hair`,
    [ethnicity, body, hair],
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
    const avatar = photoDataUrl || portraitUrl(look, style);
    const character: Character = {
      id,
      name: displayName,
      age: 24,
      tagline: `${relationship} · ${personality}. ${kink}.`,
      category: personality.includes("Dominant") ? "Dominant" : personality.includes("Shy") ? "Shy" : "Girlfriend",
      avatar,
      voiceIntro: `Hey… it's ${displayName}.`,
      initialMessage:
        bio.trim() ||
        `I saw your message. I'm ${displayName} — ${personality.toLowerCase()}. Tell me what kind of night you want.`,
      tags: [personality, relationship, style],
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
    // Persist custom girls list
    try {
      const raw = localStorage.getItem("velvet-custom-girls");
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(character);
      localStorage.setItem("velvet-custom-girls", JSON.stringify(list.slice(0, 40)));
    } catch {
      /* ignore */
    }
    setBusy(false);
    onDone(character);
  };

  const steps = ["Style", "Look", "Mind", "Photo", "Finish"];

  return (
    <div className="max-w-lg mx-auto">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-4">
        ← Home
      </button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Create your AI girlfriend
      </h2>
      <p className="text-sm text-zinc-400 mt-1">Step {step + 1} of {steps.length} · {steps[step]}</p>

      <div className="flex gap-1 mt-4 mb-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-to-r from-pink-500 to-fuchsia-500" : "bg-zinc-800"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-mist">Art style</p>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`py-3 rounded-2xl border text-sm ${style === s ? "border-pink-500 bg-pink-500/15 text-pink-200" : "border-white/10"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Ethnicity vibe</p>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map((e) => (
                <button key={e} type="button" onClick={() => setEthnicity(e)} className={`px-3 py-1.5 rounded-full text-xs border ${ethnicity === e ? "border-pink-500 bg-pink-500/15" : "border-white/10"}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Body</p>
            <div className="flex flex-wrap gap-2">
              {BODIES.map((b) => (
                <button key={b} type="button" onClick={() => setBody(b)} className={`px-3 py-1.5 rounded-full text-xs border ${body === b ? "border-pink-500 bg-pink-500/15" : "border-white/10"}`}>{b}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Hair</p>
            <div className="flex flex-wrap gap-2">
              {HAIR.map((h) => (
                <button key={h} type="button" onClick={() => setHair(h)} className={`px-3 py-1.5 rounded-full text-xs border ${hair === h ? "border-pink-500 bg-pink-500/15" : "border-white/10"}`}>{h}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500">Preview look: {look}</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nova" className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Personality</p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITIES.map((p) => (
                <button key={p} type="button" onClick={() => setPersonality(p)} className={`px-3 py-1.5 rounded-full text-xs border ${personality === p ? "border-pink-500 bg-pink-500/15" : "border-white/10"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Relationship</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <button key={r} type="button" onClick={() => setRelationship(r)} className={`px-3 py-1.5 rounded-full text-xs border ${relationship === r ? "border-pink-500 bg-pink-500/15" : "border-white/10"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Favorite heat</label>
            <input value={kink} onChange={(e) => setKink(e.target.value)} className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500">First message (optional)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none" placeholder="How she opens the chat…" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Upload a reference photo (your art / stock / selfie of yourself for a couple-shot vibe). We only store it on this device.{" "}
            <span className="text-zinc-500">No Instagram imports of other real people.</span>
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-pink-500/40 bg-pink-500/5 py-10 cursor-pointer">
            <span className="text-3xl">📷</span>
            <span className="text-sm text-pink-200">{photoDataUrl ? "Replace photo" : "Upload reference photo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          </label>
          {photoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoDataUrl} alt="Reference" className="w-full max-h-64 object-contain rounded-2xl border border-white/10" />
          )}
          <p className="text-xs text-zinc-500">Skip to auto-generate a portrait from her look tags.</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <div className="aspect-[3/4] max-w-xs mx-auto rounded-3xl overflow-hidden border border-pink-500/30 bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataUrl || portraitUrl(look, style)}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-xl font-semibold">{name.trim() || "Your Girl"}</div>
            <div className="text-sm text-pink-300">{personality} · {relationship}</div>
            <p className="text-xs text-zinc-400 mt-2">{look}</p>
          </div>
          <p className="text-xs text-zinc-500">She'll chat, undress on Generate, and run tributes like the rest of the cast.</p>
        </div>
      )}

      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="px-4 py-3 rounded-2xl border border-white/15 text-sm">
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create & chat"}
          </button>
        )}
      </div>
    </div>
  );
}
