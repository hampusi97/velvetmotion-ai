"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/characters";
import { saveCustomCompanionToFirestore } from "@/lib/firebase";
import { CreatePostActions } from "@/components/CreatePostActions";
import { SafeImage } from "@/components/SafeImage";
import { validateCharacterCompliance } from "@/lib/complianceFilter";
import { saveCustomCompanionDB } from "@/lib/db";
import { characterMediaUrl, faceSeed, seedFromPhotoDataUrl } from "@/lib/media";
import { setCharacterFaceSeed } from "@/lib/mediaSettings";

/** Explicit verified Step 2 attribute -> matching local portrait lookup map */
const ETHNICITY_PORTRAIT_MAP: Record<string, Record<string, string>> = {
  "East Asian": {
    Anime: "/portraits/anime-yumi.jpg".includes("anime") ? "/portraits/yumi-chen.webp" : "/portraits/yumi-chen.webp",
    "Black bob": "/portraits/nova-park.webp",
    Silver: "/portraits/nova-park.webp",
    "Pink tips": "/portraits/yumi-chen.webp",
    default: "/portraits/sora-takahashi.webp",
  },
  Caucasian: {
    "Blonde waves": "/portraits/lena-brooks.webp",
    Redhead: "/portraits/claire-bennett.webp",
    "Black bob": "/portraits/raven-vance.webp",
    default: "/portraits/chloe-parker.webp",
  },
  Latina: {
    "Long dark": "/portraits/maya-solis.webp",
    "Messy bun": "/portraits/aria-velasco.webp",
    default: "/portraits/maya-solis.webp",
  },
  "Black / Afro": {
    Braids: "/portraits/nadine-okoye.webp",
    default: "/portraits/nadine-okoye.webp",
  },
  "South Asian": {
    default: "/portraits/priya-v.jpg",
  },
  "Middle Eastern": {
    default: "/portraits/dalia-moreau.webp",
  },
  Mixed: {
    "Blonde waves": "/portraits/lola.jpg",
    default: "/portraits/aria-velasco.webp",
  },
};

function resolveAttributePreviewUrl(
  ethnicity: string,
  hair: string,
  style: string,
  personality: string,
): string {
  const byEth = ETHNICITY_PORTRAIT_MAP[ethnicity] || ETHNICITY_PORTRAIT_MAP.Caucasian;
  if (byEth[hair]) return byEth[hair];
  if (style === "Anime" && ethnicity === "East Asian") return "/portraits/yumi-chen.webp";
  if (style === "Soft glam" && ethnicity === "Caucasian") return "/portraits/lena-brooks.webp";
  if ((personality === "Dominant" || personality === "Queen") && ethnicity === "Caucasian") {
    return "/portraits/sloane-kensington.webp";
  }
  return byEth.default;
}

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
  onOpen3D?: (character: Character) => void;
  onHome: () => void;
};

/** Build a rich figure string for Flux / media engine. */
function buildFigure(
  style: string,
  look: string,
): string {
  const styleHint =
    style === "Anime"
      ? "anime style, detailed anime face, soft shading"
      : style === "Soft glam"
        ? "soft glam makeup, influencer aesthetic, beauty portrait lighting"
        : "photorealistic, instagram influencer, natural skin texture, candy.ai style";
  return `${styleHint}, adult woman 24, ${look}, consistent face identity`;
}

export function CreateGirlWizard({ onDone, onHome, onOpen3D }: WizardProps) {
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
  const [created, setCreated] = useState<Character | null>(null);
  const [permHint, setPermHint] = useState<string | null>(null);
  const [genNote, setGenNote] = useState<string | null>(null);

  /** Stable draft id so previews keep the same face while you tweak look */
  const draftId = useMemo(() => {
    const key = `${style}|${ethnicity}|${body}|${chest}|${eyes}|${hair}`;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    return `draft-${Math.abs(h) % 1_000_000}`;
  }, [style, ethnicity, body, chest, eyes, hair]);

  const look = useMemo(
    () =>
      `${ethnicity} features, ${body.toLowerCase()} body, ${chest.toLowerCase()} chest, ${eyes.toLowerCase()} eyes, ${hair.toLowerCase()} hair`,
    [ethnicity, body, chest, eyes, hair],
  );

  const figure = useMemo(() => buildFigure(style, look), [style, look]);

  /** Matched portrait preview from explicit attribute lookup (Bug #7 fix) */
  const aiPreviewSrc = useMemo(
    () => resolveAttributePreviewUrl(ethnicity, hair, style, personality),
    [ethnicity, hair, style, personality],
  );

  const previewSrc = photoDataUrl || aiPreviewSrc;

  const onFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPermHint(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result));
    reader.onerror = () => setPermHint("Could not read that image. Try another photo from your gallery.");
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    setPermHint(null);
  };

  const buildCharacter = (finalId: string, avatarUrl: string): Character => {
    const displayName = name.trim() || "Your Girl";
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

    return {
      id: finalId,
      name: displayName,
      age: 24,
      tagline: `${relationship} · ${personality}. ${kink}.`,
      category,
      avatar: avatarUrl,
      voiceIntro: `Hey… it's ${displayName}.`,
      initialMessage:
        bio.trim() ||
        `I saw your message. I'm ${displayName} — ${personality.toLowerCase()}. Tell me what kind of night you want.`,
      tags: [personality, relationship, style, "Custom", "AI-generated"],
      intimacy: 55,
      voice: {
        label: personality.includes("Dominant") ? "Low command" : "Warm",
        pitch: personality.includes("Dominant") ? 0.9 : 1.05,
        rate: 0.95,
        style: `${personality} energy. Speaks like a real adult partner.`,
      },
      personality,
      traits: [personality, relationship, style],
      background: `Original fictional adult created by the user. ${figure}.`,
      figure,
      kink,
      reply: `She smiles. “I'm ${displayName}. Your move.”`,
    };
  };

  const finish = async () => {
    const check = validateCharacterCompliance({
      name,
      age: 24,
      personality,
      tagline: kink,
      figure,
      kink,
    });
    if (!check.ok) {
      setPermHint(check.reason);
      return;
    }

    setBusy(true);
    setGenNote(photoDataUrl ? "Locking face from your photo…" : "Locking her Hyper-Neon profile & preview…");

    const finalId = `custom-${Date.now()}`;
    const displayName = name.trim() || "Your Girl";

    const generatedAvatar = aiPreviewSrc || characterMediaUrl({ id: finalId, name: displayName, figure, age: 24 }, "beauty", `${style} beauty portrait`);
    const avatarUrl = photoDataUrl || generatedAvatar;

    const character = buildCharacter(finalId, avatarUrl);

    void saveCustomCompanionDB(character.id, character as unknown as Record<string, unknown>);

    // Face seed: photo wins; otherwise lock from figure so moods stay consistent
    try {
      if (photoDataUrl) {
        setCharacterFaceSeed(character.id, seedFromPhotoDataUrl(photoDataUrl));
        localStorage.setItem(`vm-ref-photo-${character.id}`, photoDataUrl.slice(0, 500000));
      } else {
        setCharacterFaceSeed(character.id, faceSeed(character));
      }
    } catch {
      /* quota */
    }

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
      avatar: character.avatar,
    }).catch(() => {});

    // Warm the image in browser cache so finish screen shows quickly
    try {
      const img = new Image();
      img.src = generatedAvatar;
    } catch {
      /* */
    }

    setGenNote(null);
    setBusy(false);
    setCreated(character);
  };

  const steps = ["Style", "Look", "Details", "Mind", "Photo", "Finish"];

  if (created) {
    const first = created.name.split(" ")[0];
    return (
      <div className="max-w-lg mx-auto pb-16 space-y-5">
        <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
          ← Home
        </button>
        <h2 className="text-2xl font-extrabold text-cream">{created.name} is ready</h2>
        <p className="text-sm text-mist">
          {photoDataUrl
            ? "Face locked from your photo. She stays consistent in chat, nudes, and 3D."
            : "AI-built from your choices — face seed locked for chat, nudes, and 3D."}
        </p>
        <div className="aspect-[3/4] max-w-[220px] rounded-2xl overflow-hidden border border-pink-500/40 shadow-lg shadow-pink-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={created.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Start now</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDone(created)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/25"
          >
            Sextext with {first}
          </button>
          {onOpen3D && (
            <button
              type="button"
              onClick={() => onOpen3D(created)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold shadow-lg shadow-violet-500/25"
            >
              Animate {first} in 3D
            </button>
          )}
        </div>
        <CreatePostActions
          character={created}
          onChat={() => onDone(created)}
          on3D={onOpen3D ? () => onOpen3D(created) : undefined}
        />
        <p className="text-xs text-zinc-500 text-center">
          Nudify · explicit · sex sequence from the chips above — then pin favorites to your vault.
        </p>
      </div>
    );
  }

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
        {step < 4 && (
          <span className="text-zinc-500"> · AI builds her look as you go</span>
        )}
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

      {/* Live AI preview while designing */}
      {step >= 1 && step < 5 && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl neon-glass p-3">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-[#ff1e8e]/30">
            <SafeImage
              key={previewSrc}
              src={previewSrc}
              fallbackId={draftId}
              alt={`${ethnicity} preview`}
              className="h-full w-full object-cover object-top transition-opacity duration-300"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-cream">{name.trim() || "Your Girl"}</div>
            <div className="truncate text-xs text-pink-300/90">{look}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              {style} · {personality}
              {!photoDataUrl && <span className="text-emerald-400/90"> · AI generating</span>}
              {photoDataUrl && <span className="text-fuchsia-300"> · photo ref</span>}
            </div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-mist">Art style — AI will generate her face & body to match</p>
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
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Ethnicity vibe</p>
            <div className="flex flex-wrap gap-2">
              {ETHNICITIES.map((e) => (
                <button key={e} type="button" onClick={() => setEthnicity(e)} className={`px-3 py-1.5 rounded-full text-xs border ${ethnicity === e ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Body type</p>
            <div className="flex flex-wrap gap-2">
              {BODIES.map((b) => (
                <button key={b} type="button" onClick={() => setBody(b)} className={`px-3 py-1.5 rounded-full text-xs border ${body === b ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{b}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Chest</p>
            <div className="flex flex-wrap gap-2">
              {CHESTS.map((c) => (
                <button key={c} type="button" onClick={() => setChest(c)} className={`px-3 py-1.5 rounded-full text-xs border ${chest === c ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{c}</button>
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
                <button key={e} type="button" onClick={() => setEyes(e)} className={`px-3 py-1.5 rounded-full text-xs border ${eyes === e ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Hair</p>
            <div className="flex flex-wrap gap-2">
              {HAIR.map((h) => (
                <button key={h} type="button" onClick={() => setHair(h)} className={`px-3 py-1.5 rounded-full text-xs border ${hair === h ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{h}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nova" className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Personality</p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITIES.map((p) => (
                <button key={p} type="button" onClick={() => setPersonality(p)} className={`px-3 py-1.5 rounded-full text-xs border ${personality === p ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Relationship to you</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <button key={r} type="button" onClick={() => setRelationship(r)} className={`px-3 py-1.5 rounded-full text-xs border ${relationship === r ? "border-pink-500 bg-pink-500/15 text-pink-100" : "border-white/10 text-zinc-300"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Favorite heat / kink</label>
            <input value={kink} onChange={(e) => setKink(e.target.value)} className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-500">First message (optional)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none outline-none focus:border-pink-500" placeholder="How she opens the chat…" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <strong className="font-medium">Photo is optional.</strong> Skip this step and AI still generates her
            fully from style + look. Upload only if you want a specific face locked.
          </div>
          <p className="text-sm text-mist">
            Optional reference photo → stronger face consistency in nudes / JOI. Stored only on this device.{" "}
            <span className="text-zinc-500">Do not upload real people without consent.</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-pink-500/40 bg-pink-500/5 py-10 cursor-pointer hover:bg-pink-500/10 transition">
              <span className="text-3xl">🖼️</span>
              <span className="text-xs text-pink-200 text-center px-2">Gallery / Photos</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 py-10 cursor-pointer hover:bg-fuchsia-500/10 transition">
              <span className="text-3xl">📷</span>
              <span className="text-xs text-fuchsia-200 text-center px-2">Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {permHint && <p className="text-xs text-amber-300">{permHint}</p>}
          {photoDataUrl && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoDataUrl} alt="Reference" className="w-full max-h-72 object-contain rounded-2xl border border-white/10" />
              <button type="button" onClick={clearPhoto} className="text-xs text-zinc-400 hover:text-pink-300">
                Remove photo · use AI face instead
              </button>
            </div>
          )}
          {!photoDataUrl && (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <p className="text-[11px] text-zinc-500 px-3 pt-2">AI preview from your choices</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiPreviewSrc} alt="AI preview" className="w-full max-h-64 object-cover object-top" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep(5)}
            className="w-full py-3 rounded-2xl border border-pink-500/40 text-sm text-pink-100 hover:bg-pink-500/10"
          >
            Skip photo · generate with AI →
          </button>
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
            <div className="text-sm text-pink-300 mt-1">{personality} · {relationship}</div>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">{look}</p>
            <p className="text-[11px] text-emerald-400/90 mt-2">
              {photoDataUrl ? "Using your photo + AI for later moods" : "No photo — AI generates her completely"}
            </p>
          </div>
          {genNote && <p className="text-xs text-pink-300 animate-pulse">{genNote}</p>}
        </div>
      )}

      <div className="mt-8 flex gap-2 sticky bottom-4">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="px-5 py-3.5 rounded-2xl border border-white/15 text-sm font-medium hover:bg-white/5">
            Back
          </button>
        )}
        {step < 5 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/25">
            {step === 4 && !photoDataUrl ? "Skip photo" : "Next"}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void finish()} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold shadow-lg shadow-pink-500/25 disabled:opacity-50">
            {busy ? "Generating…" : photoDataUrl ? "Create girl" : "Generate with AI"}
          </button>
        )}
      </div>
    </div>
  );
}
