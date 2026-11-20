"use client";

import { useMemo, useState } from "react";
import type { Character } from "@/lib/characters";
import { saveCustomCompanionToFirestore } from "@/lib/firebase";
import { CreatePostActions } from "@/components/CreatePostActions";
import { SafeImage } from "@/components/SafeImage";
import { VoiceDesigner, DEFAULT_VOICE_DESIGN, type VoiceDesign } from "@/components/VoiceDesigner";
import { validateCharacterCompliance } from "@/lib/complianceFilter";
import { encodeSharedCharacterUrl } from "@/lib/shareCardUrl";
import { exportCharacterToCardV2 } from "@/lib/characterCardV2";
import { saveCustomCompanionDB } from "@/lib/db";
import { emitVaultUpdated } from "@/lib/firebaseSync";
import { characterMediaUrl, faceSeed, seedFromPhotoDataUrl } from "@/lib/media";
import { setCharacterFaceSeed } from "@/lib/mediaSettings";

interface ExtractedImageMood {
  paletteLabel: string;
  lightingMood: string;
  suggestedStyle: "Realistic" | "Soft glam" | "Anime";
  suggestedVibe: string;
}

async function compressUploadWebp(file: File): Promise<string> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL("image/webp", 0.86);
}

async function extractPaletteMood(dataUrl: string): Promise<ExtractedImageMood> {
  if (typeof document === "undefined") {
    return {
      paletteLabel: "warm rose & dark obsidian",
      lightingMood: "moody evening glow",
      suggestedStyle: "Realistic",
      suggestedVibe: "cinematic evening glamour",
    };
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d");
        ctx.drawImage(img, 0, 0, 16, 16);
        const pixels = ctx.getImageData(0, 0, 16, 16).data;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        const n = pixels.length / 4;
        for (let i = 0; i < pixels.length; i += 4) {
          rSum += pixels[i];
          gSum += pixels[i + 1];
          bSum += pixels[i + 2];
        }
        const r = rSum / n;
        const g = gSum / n;
        const b = bSum / n;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const isNeon = b > r * 1.05 || (r > 165 && b > 145 && g < 130);
        const isWarm = r > b * 1.15;
        const lightingMood =
          luma < 85 ? "low-key midnight studio glow" : luma > 165 ? "bright sunlit portrait" : "golden-hour soft focus";
        const paletteLabel = isNeon
          ? "electric neon violet & magenta"
          : isWarm
            ? "warm amber, coral & bronze"
            : "clean editorial monochrome";
        resolve({
          paletteLabel,
          lightingMood,
          suggestedStyle: isNeon ? "Soft glam" : "Realistic",
          suggestedVibe: `${paletteLabel} tones with ${lightingMood}`,
        });
      } catch {
        resolve({
          paletteLabel: "warm rose & dark obsidian",
          lightingMood: "moody evening glow",
          suggestedStyle: "Realistic",
          suggestedVibe: "cinematic evening glamour",
        });
      }
    };
    img.onerror = () =>
      resolve({
        paletteLabel: "warm rose & dark obsidian",
        lightingMood: "moody evening glow",
        suggestedStyle: "Realistic",
        suggestedVibe: "cinematic evening glamour",
      });
    img.src = dataUrl;
  });
}

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
  const [voiceDesign, setVoiceDesign] = useState<VoiceDesign>(DEFAULT_VOICE_DESIGN);
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
  const [fictionalConfirmed, setFictionalConfirmed] = useState(false);
  const [extractedMood, setExtractedMood] = useState<ExtractedImageMood | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Character | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
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

  const onFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPermHint(null);
    try {
      const compressed = await compressUploadWebp(file);
      setPhotoDataUrl(compressed);
      const mood = await extractPaletteMood(compressed);
      setExtractedMood(mood);
      setStyle(mood.suggestedStyle);
      if (!bio.trim()) {
        setBio(`Stepped right out of that ${mood.lightingMood} scene just to catch you alone. Tell me what caught your eye first.`);
      }
    } catch {
      setPermHint("Could not read that image. Try another fictional image from your device.");
    }
  };

  const clearPhoto = () => {
    setPhotoDataUrl(null);
    setExtractedMood(null);
    setFictionalConfirmed(false);
    setPermHint(null);
  };

  const buildCharacter = (finalId: string, avatarUrl: string): Character => {
    const autoNames = ["Lyra Vance", "Seren Vale", "Kiera Sol", "Nyx Monroe"];
    const fallbackName = autoNames[Math.abs(draftId.length + finalId.length) % autoNames.length];
    const displayName = name.trim() || fallbackName;
    const moodContext = extractedMood ? `${extractedMood.paletteLabel}, ${extractedMood.lightingMood}` : figure;
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
        `Just leaned back against the balcony railing (${extractedMood?.lightingMood || "late-night glow"}) waiting on your text. How are you spending tonight?`,
      tags: [personality, relationship, style, "Custom", "Fictional 18+"],
      intimacy: 55,
      voice: {
        label: voiceDesign.voiceId,
        pitch: voiceDesign.pitch,
        rate: voiceDesign.rate,
        style: `${personality} energy. Speaks like a real adult partner.`,
      },
      voiceId: voiceDesign.voiceId,
      visualDna: `${figure}, ${moodContext}, 6-scene consistent fictional 18+ persona`,
      personality,
      traits: [personality, relationship, style],
      background: `Original fictional adult created by the user. Visual mood: ${moodContext}. Backstory: lives independently in the city with a soft spot for late-night voice notes and private ${personality.toLowerCase()} chemistry.`,
      figure: `${figure}, ${moodContext}`,
      kink,
      reply: `She smiles. “I'm ${displayName}. Your move.”`,
    };
  };

  const finish = async () => {
    if (photoDataUrl && !fictionalConfirmed) {
      setPermHint("Please confirm this uploaded artwork depicts a fictional/AI-generated 18+ character before creating.");
      return;
    }
    const check = validateCharacterCompliance({
      name: name || "Lyra Vance",
      age: 24,
      personality,
      tagline: kink,
      figure: `${figure} ${extractedMood?.suggestedVibe || ""}`,
      kink,
    });
    if (!check.ok) {
      setPermHint(check.reason);
      return;
    }

    setBusy(true);
    setGenNote(photoDataUrl ? "Saving original portrait reference…" : "Saving companion profile and portrait preview…");

    const finalId = `custom-${Date.now()}`;
    const displayName = name.trim() || "Your Girl";

    const generatedAvatar = aiPreviewSrc || characterMediaUrl({ id: finalId, name: displayName, figure, age: 24 }, "beauty", `${style} beauty portrait`);
    const avatarUrl = photoDataUrl || generatedAvatar;

    const character = buildCharacter(finalId, avatarUrl);

    void saveCustomCompanionDB(character.id, character as unknown as Record<string, unknown>);
    emitVaultUpdated();

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
            ? "Your original fictional artwork is saved as her portrait. Consistent generated images require a compatible reference-aware model."
            : "Saved from your choices with a curated portrait preview. AI image generation requires a connected model."}
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
            className="w-full py-3.5 rounded-2xl neon-btn-primary font-semibold shadow-lg shadow-pink-500/25"
          >
            Sextext with {first}
          </button>
          <button
            type="button"
            onClick={async () => {
              const url = await encodeSharedCharacterUrl(created, typeof window !== "undefined" ? window.location.origin : undefined);
              await navigator.clipboard?.writeText(url).catch(() => {});
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2200);
            }}
            className="w-full py-3.5 rounded-2xl border border-[#00f5ff]/55 bg-[#00f5ff]/15 text-[#00f5ff] font-bold hover:bg-[#00f5ff]/25"
          >
            {shareCopied ? "Share Link Copied ✓" : "🔗 Copy Share Link"}
          </button>
          <button
            type="button"
            onClick={() => {
              const card = exportCharacterToCardV2(created);
              const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${created.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v2.json`;
              a.click();
            }}
            className="w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white font-semibold hover:border-[#ff5678]/60"
          >
            📦 Export Character Card V2 (.json)
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
          Try the Studio for new media. Only original fictional adults may be used for mature visual generation; results depend on your model.
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
          <span className="text-zinc-500"> · Curated preview; actual generation requires a model</span>
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
              {!photoDataUrl && <span className="text-emerald-400/90"> · Curated preview · not a new generation</span>}
              {photoDataUrl && <span className="text-fuchsia-300"> · photo ref</span>}
            </div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div
          className="space-y-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFile(e.dataTransfer.files?.[0] || null);
          }}
          onPaste={(e) => {
            const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
            const f = item?.getAsFile() || null;
            if (f) void onFile(f);
          }}
        >
          {/* Step 1: Upload Fictional Character Art / Reference */}
          <div className="rounded-2xl border border-dashed border-[#ff5678]/45 bg-[#1a1a20] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-white">Upload Fictional Character Art / Reference (Optional)</p>
                <p className="text-[11px] text-zinc-400">
                  Drag &amp; drop, browse, or paste (Ctrl/Cmd+V). Extracts palette/lighting mood &amp; builds full companion.
                </p>
              </div>
              <label className="shrink-0 cursor-pointer rounded-full neon-btn-primary px-3.5 py-1.5 text-[11px] font-bold text-white">
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {photoDataUrl && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={photoDataUrl}
                    alt="Uploaded art preview"
                    className="h-20 w-16 rounded-xl object-cover border border-[#ff5678]/50 shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-[11px] space-y-1">
                    {extractedMood && (
                      <p className="text-[#ff8aa1] font-semibold">
                        Detected mood: {extractedMood.paletteLabel} · {extractedMood.lightingMood}
                      </p>
                    )}
                    <button type="button" onClick={clearPhoto} className="text-zinc-400 underline hover:text-white">
                      Remove uploaded art
                    </button>
                  </div>
                </div>
              </div>
            )}
            <label className="flex items-start gap-2 pt-1 text-[11px] text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={fictionalConfirmed}
                onChange={(e) => setFictionalConfirmed(e.target.checked)}
                className="mt-0.5 accent-[#ff5678]"
              />
              <span>
                I confirm this companion &amp; any uploaded artwork depict a fictional/AI-generated 18+ character — NOT a real third-party person.
              </span>
            </label>
            {permHint && <p className="text-xs text-rose-300">{permHint}</p>}
          </div>

          <p className="text-sm text-mist">Art style — generated variations require a compatible connected model</p>
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
          <VoiceDesigner value={voiceDesign} onChange={setVoiceDesign} sample={`Hey, it’s ${name.trim() || "your new companion"}. I’m so glad we met.`} />
          <div>
            <label className="text-xs text-zinc-500">First message (optional)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm resize-none outline-none focus:border-pink-500" placeholder="How she opens the chat…" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <strong className="font-medium">Photo is optional.</strong> Without a reference, your companion uses a curated portrait preview.
            Upload only original artwork of a fictional adult to use as her reference.
          </div>
          <p className="text-sm text-mist">
            Original fictional-adult artwork can become her portrait and reference for compatible models.{" "}
            <span className="text-zinc-500">For your own real-life selfie and nonsexual animation, use Media Studio instead.</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-pink-500/40 bg-pink-500/5 py-10 cursor-pointer hover:bg-pink-500/10 transition">
              <span className="text-3xl">🖼️</span>
              <span className="text-xs text-pink-200 text-center px-2">Fictional adult artwork</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
            <a href="/studio/" className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 py-10 text-center transition hover:bg-fuchsia-500/10">
              <span className="text-3xl">📷</span>
              <span className="text-xs text-fuchsia-200 px-2">Animate your own selfie in Studio (nonsexual)</span>
            </a>
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
              <p className="text-[11px] text-zinc-500 px-3 pt-2">Curated portrait preview (not generated yet)</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiPreviewSrc} alt="AI preview" className="w-full max-h-64 object-cover object-top" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep(5)}
            className="w-full py-3 rounded-2xl border border-pink-500/40 text-sm text-pink-100 hover:bg-pink-500/10"
          >
            Continue without a photo →
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
              {photoDataUrl ? "Original fictional portrait selected · model reference support varies" : "Using a curated portrait until you generate new media"}
            </p>
          </div>
              {photoDataUrl && (
                <label className="flex items-start gap-2 text-[11px] text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fictionalConfirmed}
                    onChange={(e) => setFictionalConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#ff5678]"
                  />
                  <span>
                    I confirm I own or have permission to use this original fictional adult artwork. It does not depict a real person.
                  </span>
                </label>
              )}
              {genNote && <p className="text-xs text-pink-300 animate-pulse">{genNote}</p>}
              {permHint && <p className="text-xs text-rose-300">{permHint}</p>}
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
            {busy ? "Saving companion…" : "Create companion"}
          </button>
        )}
      </div>
    </div>
  );
}
