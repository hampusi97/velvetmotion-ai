"use client";
import { useEffect, useState } from "react";
import {
  Lock,
  Unlock,
  ShieldAlert,
  Trash2,
  Sparkles,
  Upload,
  Film,
  Image as ImageIcon,
  Music,
} from "lucide-react";
import {
  getGallery,
  clearGallery,
  getCoins,
  addCoins,
  addToGallery,
  type GalleryItem,
} from "@/lib/storage";
import {
  hasVaultPin,
  setVaultPin,
  checkVaultPin,
  getVaultIds,
  toggleVaultItem,
} from "@/lib/vault";
import {
  subscribeAuthState,
  subscribeUserGallery,
  deleteMediaFromFirestore,
} from "@/lib/firebase";
import { CHARACTERS } from "@/lib/characters";
import { MotionSequencePlayer } from "@/components/MotionSequencePlayer";
import { generateStudioPicture } from "@/lib/mediaGenerator";
import { generateStudioVideoClip } from "@/lib/canvasVideoExporter";
import { generateFictionalReferenceVariation } from "@/lib/referenceImageGenerator";
import { getMediaSettings } from "@/lib/mediaSettings";
import { assertCompliance } from "@/lib/complianceFilter";
import { useLocalEngineStatus } from "@/lib/localEngineBridge";

const STUDIO_TYPES = [
  { id: "portrait", label: "Portrait", cost: 8 },
  { id: "lingerie", label: "Lingerie", cost: 12 },
  { id: "nude", label: "Nude", cost: 15 },
  { id: "explicit", label: "Explicit", cost: 20 },
  { id: "video", label: "Omni Flash Video", cost: 30 },
] as const;

const STUDIO_POSES = [
  "looking at viewer, seductive expression",
  "lying on black velvet sheets, candlelight",
  "in shower, wet skin, warm steam",
  "from behind, looking over shoulder",
  "straddling, intimate POV angle",
  "kneeling, upward gaze, neon boudoir light",
];

export function UtilitySection({
  view,
  onHome,
  onOpenCustom,
}: {
  view: string;
  onHome: () => void;
  onOpenCustom: (name: string) => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "vault">("all");
  const [coins, setCoins] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Studio Generator, Photo Animation, Image Edit & Lyria Music state
  const [studioCharId, setStudioCharId] = useState(CHARACTERS[0].id);
  const [studioDualId, setStudioDualId] = useState("");
  const [studioType, setStudioType] = useState<(typeof STUDIO_TYPES)[number]["id"]>("lingerie");
  const [studioPose, setStudioPose] = useState(STUDIO_POSES[0]);
  const [studioExtra, setStudioExtra] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [referencePhotoDataUrl, setReferencePhotoDataUrl] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState(false);
  const [referenceRightsConfirmed, setReferenceRightsConfirmed] = useState(false);
  const engine = useLocalEngineStatus();
  const [studioNotice, setStudioNotice] = useState<string | null>(null);
  const [tempVideoUrl, setTempVideoUrl] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  // Lyria 3 Music Studio state
  const [lyriaModel, setLyriaModel] = useState<"lyria-3-clip-preview" | "lyria-3-pro-preview">(
    "lyria-3-clip-preview",
  );
  const [lyriaPrompt, setLyriaPrompt] = useState(
    "Midnight velvet R&B slow jam with warm Rhodes chords and sensual bass",
  );
  const [lyriaBusy, setLyriaBusy] = useState(false);
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState<string | null>(null);
  const [lyriaCaption, setLyriaCaption] = useState<string | null>(null);

  // PIN Vault state
  const [pinConfigured, setPinConfigured] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultIds, setVaultIds] = useState<string[]>([]);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  useEffect(() => {
    setText("");
    setConfirmClear(false);
    setConfirmDeleteId(null);
    try {
      const saved = JSON.parse(localStorage.getItem(`vm-${view}`) || "[]");
      setItems(Array.isArray(saved) ? saved.filter((x) => typeof x === "string") : []);
    } catch {
      setItems([]);
    }
    if (view === "gallery") {
      setGallery(getGallery());
      setCoins(getCoins());
      setPinConfigured(hasVaultPin());
      setVaultIds(getVaultIds());
    }
  }, [view]);

  // Cross-device Firestore gallery restore when signed in
  useEffect(() => {
    if (view !== "gallery") return;
    let unsubGallery: (() => void) | null = null;
    const unsubAuth = subscribeAuthState((user) => {
      if (unsubGallery) {
        unsubGallery();
        unsubGallery = null;
      }
      if (user && user.emailVerified) {
        unsubGallery = subscribeUserGallery(user.uid, (remoteItems) => {
          const local = getGallery();
          const map = new Map<string, GalleryItem>();
          for (const item of local) map.set(item.id, item);
          for (const r of remoteItems) {
            if (!map.has(r.id)) {
              map.set(r.id, {
                id: r.id,
                characterId: r.characterId,
                characterName: r.characterName,
                type: r.type,
                url: r.url,
                prompt: r.prompt,
                createdAt: r.createdAt,
              });
            }
          }
          const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          setGallery(merged);
        });
      }
    });
    return () => {
      unsubAuth();
      if (unsubGallery) unsubGallery();
    };
  }, [view]);

  const handleReferencePhotoSelect = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferencePhotoDataUrl(String(reader.result || ""));
      setReferenceRightsConfirmed(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStudioGenerate = async () => {
    if (studioBusy) return;
    const char = CHARACTERS.find((c) => c.id === studioCharId) || CHARACTERS[0];
    const dual = studioDualId ? CHARACTERS.find((c) => c.id === studioDualId) : null;
    const prompt = [char.visualDna || char.figure, studioPose, studioExtra.trim(),
      dual ? `fictional adult scene with ${dual.name}` : "", "cinematic portrait, fictional consenting adults 21+"].filter(Boolean).join(", ");
    const compliance = assertCompliance(prompt);
    if (!compliance.ok) { setStudioNotice(compliance.reason); return; }
    if (referencePhotoDataUrl && !referenceRightsConfirmed) {
      setStudioNotice("Confirm the reference is original fictional adult artwork you own. Real selfies can only be animated nonsexually in the main Media Studio.");
      return;
    }
    setStudioBusy(true);
    setStudioNotice("Requesting a compatible AI provider…");
    try {
      const characterName = dual ? `${char.name} & ${dual.name}` : char.name;
      if (studioType === "video") {
        const result = await generateStudioVideoClip({
          imageUrl: referencePhotoDataUrl || char.avatar,
          prompt, motionId: "slow-zoom-blink", durationSec: 5, speed: 1,
          sourceType: "fictional", adultMode: true,
          comfyOnline: engine.comfyOnline, videoBackendUrl: getMediaSettings().img2vidUrl,
        });
        if (result.videoUrl.startsWith("blob:")) {
          setTempVideoUrl(result.videoUrl);
        } else {
          setTempVideoUrl(null);
          addToGallery({ characterId: char.id, characterName, type: "video", url: result.videoUrl, prompt });
          setGallery(getGallery());
        }
        setStudioNotice(`${result.isGenerative ? "Generated AI video" : "Created animated still"} via ${result.engine}. ${result.videoUrl.startsWith("blob:") ? "Temporary clip: use main Video Studio to download a file." : "Added to Gallery."} ${result.warning || ""}`);
      } else {
        const result = referencePhotoDataUrl
          ? await generateFictionalReferenceVariation({
              referenceImage: referencePhotoDataUrl, prompt,
              sourceType: "fictional", adultMode: studioType !== "portrait",
            })
          : await generateStudioPicture({
              prompt, width: 640, height: 960, characterId: char.id,
              nsfw: studioType !== "portrait", localEngine: engine,
            });
        addToGallery({ characterId: char.id, characterName, type: studioType, url: result.imageUrl, prompt });
        setGallery(getGallery());
        setStudioNotice(`Generated image via ${result.engine}. No browser-demo coins charged; external provider fees may apply.`);
      }
    } catch (error) {
      setStudioNotice(error instanceof Error ? error.message : "No compatible generation backend responded.");
    } finally {
      setStudioBusy(false);
    }
  };

  const handleGenerateLyriaMusic = async () => {
    if (lyriaBusy) return;
    setLyriaBusy(true);
    setLyriaAudioUrl(null);
    const endpoint = (process.env.NEXT_PUBLIC_MUSIC_WORKER_URL || "").trim();
    if (!endpoint) {
      setLyriaCaption("Music generation is not connected. No audio has been generated.");
      setLyriaBusy(false);
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: lyriaModel, prompt: lyriaPrompt.slice(0, 600) }),
      });
      if (!res.ok) throw new Error(`Music model HTTP ${res.status}`);
      const data = (await res.json()) as { audioUrl?: string; title?: string };
      if (!data.audioUrl || !data.audioUrl.startsWith("https://")) throw new Error("Music provider returned no valid HTTPS audio");
      setLyriaAudioUrl(data.audioUrl);
      setLyriaCaption(data.title || "Audio generated by configured service.");
    } catch (error) {
      setLyriaCaption(error instanceof Error ? error.message : "Music provider unavailable.");
    } finally {
      setLyriaBusy(false);
    }
  };

  const handleImportExternalUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = importUrl.trim();
    if (!cleaned) return;
    const char = CHARACTERS.find((c) => c.id === studioCharId) || CHARACTERS[0];
    addToGallery({
      characterId: char.id,
      characterName: char.name,
      type: studioType === "video" ? "video" : "portrait",
      url: cleaned,
      prompt: "Imported media URL",
    });
    setGallery(getGallery());
    setImportUrl("");
    setImportOpen(false);
    setStudioNotice(`Imported custom media for ${char.name} into Gallery.`);
  };

  const handleUploadLocalFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const char = CHARACTERS.find((c) => c.id === studioCharId) || CHARACTERS[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      addToGallery({
        characterId: char.id,
        characterName: char.name,
        type: "portrait",
        url: dataUrl,
        prompt: `Uploaded file: ${file.name}`,
      });
      setGallery(getGallery());
      setImportOpen(false);
      setStudioNotice(`Uploaded "${file.name}" to your Gallery.`);
    };
    reader.readAsDataURL(file);
  };

  const add = () => {
    if (!text.trim()) return;
    const next = [...items, text.trim()];
    setItems(next);
    setText("");
    try {
      localStorage.setItem(`vm-${view}`, JSON.stringify(next));
    } catch {
      /* session state remains available */
    }
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinStatus(null);
    const cleaned = pinInput.trim();
    if (cleaned.length < 4) {
      setPinError("PIN must be at least 4 characters.");
      return;
    }
    if (setVaultPin(cleaned)) {
      setPinConfigured(true);
      setVaultUnlocked(true);
      setPinInput("");
      setPinStatus("Private Vault PIN configured and unlocked.");
    } else {
      setPinError("Could not save PIN on this device.");
    }
  };

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinStatus(null);
    if (checkVaultPin(pinInput.trim())) {
      setVaultUnlocked(true);
      setPinInput("");
    } else {
      setPinError("Incorrect PIN. Try again.");
    }
  };

  const handleToggleVault = (id: string) => {
    const next = toggleVaultItem(id);
    setVaultIds(next);
  };

  const handleDeleteItem = (id: string) => {
    const next = gallery.filter((g) => g.id !== id);
    setGallery(next);
    setConfirmDeleteId(null);
    try {
      localStorage.setItem("vm-gallery", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    void deleteMediaFromFirestore(id).catch(() => {});
  };

  const title =
    view === "create"
      ? "Create Girl"
      : view === "suggest"
        ? "Suggest a Feature"
        : view === "gallery"
          ? "Gallery"
          : "Room";

  if (view === "gallery") {
    const shown = gallery.filter((g) => {
      const inVault = vaultIds.includes(g.id);
      if (filter === "vault") return inVault;
      if (inVault) return false;
      if (filter === "all") return true;
      if (filter === "video") return g.type === "video";
      return g.type !== "video";
    });

    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <button onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
              Velvet Studio, Gallery & Vault
            </h1>
            {vaultIds.length > 0 && (
              <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-0.5 text-xs text-fuchsia-300">
                {vaultIds.length} vaulted
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-amber-300">{coins} coins</div>
        </div>

        {/* Direct Picture, Photo Edit, & Omni Flash Video Studio Generator */}
        <div className="rounded-3xl border border-pink-500/30 bg-zinc-950/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-pink-400">
                <Sparkles className="h-3.5 w-3.5" /> Instant Media Lab
              </div>
              <h2 className="text-lg font-semibold text-white mt-0.5">
                Connected Image / Video Studio
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setImportOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:border-pink-500/40"
            >
              <Upload className="h-3.5 w-3.5 text-pink-400" />
              {importOpen ? "Close Import" : "Upload / Paste Media URL"}
            </button>
          </div>

          {importOpen && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <p className="text-xs text-zinc-400">
                Upload a photo from your device or paste any image/video URL to add it directly to your Gallery & Vault.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-xs font-medium text-pink-200 cursor-pointer hover:bg-pink-500/25">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Choose Image File
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadLocalFile(e.target.files?.[0] || null)}
                  />
                </label>
                <form onSubmit={handleImportExternalUrl} className="flex-1 min-w-[220px] flex gap-2">
                  <input
                    type="url"
                    aria-label="External image or video URL"
                    placeholder="Or paste https:// image URL…"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-pink-600 px-3.5 py-2 text-xs font-medium text-white"
                  >
                    Add URL
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-400">Companion</label>
              <select
                aria-label="Select studio companion"
                value={studioCharId}
                onChange={(e) => setStudioCharId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
              >
                {CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-400">
                Duo Partner (Optional)
              </label>
              <select
                aria-label="Select optional second companion"
                value={studioDualId}
                onChange={(e) => setStudioDualId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
              >
                <option value="">Solo scene</option>
                {CHARACTERS.filter((c) => c.id !== studioCharId).map((c) => (
                  <option key={c.id} value={c.id}>
                    + {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-400">
                Pose & Camera
              </label>
              <select
                aria-label="Select studio pose"
                value={studioPose}
                onChange={(e) => setStudioPose(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white"
              >
                {STUDIO_POSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {STUDIO_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStudioType(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    studioType === t.id
                      ? "border-pink-500 bg-pink-500/20 text-pink-200"
                      : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-pink-500/40"
                  }`}
                >
                  {t.id === "video" && <Film className="h-3.5 w-3.5 text-fuchsia-400" />}
                  {t.label}
                </button>
              ))}
            </div>

            {studioType === "video" && (
              <div className="flex items-center gap-1.5">
                {(["9:16", "16:9"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setVideoAspectRatio(ratio)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
                      videoAspectRatio === ratio
                        ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200"
                        : "border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {ratio === "9:16" ? "9:16 Portrait" : "16:9 Landscape"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reference Photo Upload for Image Editing or Photo-to-Video Animation */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-900/50 px-3.5 py-2.5">
            <span className="text-xs text-zinc-300">
              {studioType === "video"
                ? "Optional original fictional artwork reference for motion:"
                : "Optional original fictional adult artwork reference:"}
            </span>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-xs font-medium text-pink-200 cursor-pointer hover:bg-pink-500/25">
                <Upload className="h-3.5 w-3.5" />
                {referencePhotoDataUrl ? "Photo Attached ✓" : "Attach Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleReferencePhotoSelect(e.target.files?.[0] || null)}
                />
              </label>
              {referencePhotoDataUrl && (
                <button
                  type="button"
                  onClick={() => { setReferencePhotoDataUrl(null); setReferenceRightsConfirmed(false); }}
                  className="text-xs text-rose-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {referencePhotoDataUrl && (
            <label className="flex gap-2 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-[11px] text-zinc-200">
              <input type="checkbox" checked={referenceRightsConfirmed} onChange={(e) => setReferenceRightsConfirmed(e.target.checked)} />
              <span>This reference is original fictional-adult artwork I own or may use; it is not a photograph of a real person. For a nonsexual self-portrait animation, use the main Media Studio.</span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              aria-label="Custom lighting or scene details"
              placeholder="Prompt / Edit instruction: red darkroom light, silk stockings, slow motion arch…"
              value={studioExtra}
              onChange={(e) => setStudioExtra(e.target.value)}
              className="flex-1 min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-pink-500"
            />
            <button
              type="button"
              disabled={studioBusy}
              onClick={() => void handleStudioGenerate()}
              className="rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 disabled:opacity-50"
            >
              {studioBusy
                ? "Rendering…"
                : studioType === "video"
                  ? referencePhotoDataUrl
                    ? `Animate fictional art (${videoAspectRatio})`
                    : `Create ${videoAspectRatio} Video`
                  : referencePhotoDataUrl
                    ? "Edit original fictional art"
                    : "Generate Picture"}
            </button>
          </div>

          {tempVideoUrl && (
            <div className="space-y-2 rounded-xl border border-rose-300/20 bg-black/40 p-3">
              <p className="text-[11px] text-rose-200">Temporary video clip — download before leaving the page</p>
              <video src={tempVideoUrl} controls playsInline className="max-h-80 w-full rounded-xl object-contain" />
              <a href={tempVideoUrl} download="velvetmotion-clip.webm" className="inline-block rounded-full bg-rose-700 px-4 py-2 text-xs font-bold text-white">Download video</a>
            </div>
          )}
          {studioNotice && (
            <p className="text-xs text-pink-300 bg-pink-500/10 border border-pink-500/30 rounded-xl px-3 py-2">
              {studioNotice}
            </p>
          )}
        </div>

        {/* Lyria 3 Soundtrack Studio */}
        <div className="rounded-3xl border border-fuchsia-500/30 bg-zinc-950/90 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-fuchsia-400" />
              <h2 className="text-base font-semibold text-white">
                Music Studio (optional connected model)
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "lyria-3-clip-preview", label: "Lyria Clip (30s)" },
                  { id: "lyria-3-pro-preview", label: "Lyria Pro (Full Track)" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLyriaModel(m.id)}
                  className={`rounded-xl border px-3 py-1 text-xs font-medium ${
                    lyriaModel === m.id
                      ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200"
                      : "border-zinc-800 text-zinc-400"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={lyriaPrompt}
              onChange={(e) => setLyriaPrompt(e.target.value)}
              placeholder="Describe the music mood: slow synth-wave, candlelit R&B, breathy lounge…"
              className="flex-1 min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white"
            />
            <button
              type="button"
              disabled={lyriaBusy}
              onClick={() => void handleGenerateLyriaMusic()}
              className="rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {lyriaBusy ? "Composing…" : "Generate with connected model"}
            </button>
          </div>

          {lyriaCaption && !lyriaAudioUrl && <p role="status" className="rounded-xl border border-white/10 p-3 text-xs text-zinc-300">{lyriaCaption}</p>}
          {lyriaAudioUrl && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2.5 text-xs text-fuchsia-200">
              <span className="truncate max-w-md">{lyriaCaption}</span>
              <audio src={lyriaAudioUrl} controls autoPlay className="h-8 w-60" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "image", "video", "vault"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setPinError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${
                filter === f
                  ? "border-pink-500 bg-pink-500/15 text-pink-200"
                  : "border-zinc-700 text-zinc-300"
              }`}
            >
              {f === "vault" &&
                (vaultUnlocked ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                ))}
              {f === "all"
                ? "All"
                : f === "image"
                  ? "Pictures"
                  : f === "video"
                    ? "Videos"
                    : `Private Vault (${vaultIds.length})`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              addCoins(150);
              setCoins(getCoins());
            }}
            className="px-3 py-1.5 rounded-full text-sm border border-amber-500/40 text-amber-300"
          >
            +150 demo coins
          </button>
          {gallery.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 rounded-full text-sm border border-red-500/30 text-red-300"
            >
              Clear gallery
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearGallery();
                  setGallery([]);
                  setConfirmClear(false);
                }}
                className="px-3 py-1.5 rounded-full text-sm bg-red-600 text-white"
              >
                Confirm clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-full text-sm border border-white/15 text-cream"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {filter === "vault" && !vaultUnlocked ? (
          <div className="rounded-3xl border border-pink-500/30 bg-zinc-950/90 p-6 max-w-md space-y-4">
            <div className="flex items-center gap-2.5 text-pink-300">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-white">
                {pinConfigured ? "Unlock Private Vault" : "Set Private Vault PIN"}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {pinConfigured
                ? "Enter your PIN to view media hidden from the main gallery tabs."
                : "Create a 4+ character PIN to lock sensitive portraits, nudes, and videos inside your Private Vault."}
            </p>
            {pinError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                <span>{pinError}</span>
              </div>
            )}
            <form
              onSubmit={pinConfigured ? handleUnlockVault : handleSetPin}
              className="flex gap-2"
            >
              <input
                type="password"
                aria-label={pinConfigured ? "Enter vault PIN" : "Create vault PIN"}
                placeholder={pinConfigured ? "Enter PIN…" : "New PIN (4+ chars)…"}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white"
              >
                {pinConfigured ? "Unlock Vault" : "Set Vault PIN"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {filter === "vault" && vaultUnlocked && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-emerald-400" />
                  <span>
                    {pinStatus ||
                      "Private Vault unlocked. Items here are hidden from All, Pictures, and Videos tabs."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVaultUnlocked(false);
                    setPinStatus(null);
                  }}
                  className="rounded-lg border border-emerald-400/40 bg-black/30 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-black/50"
                >
                  Lock Vault
                </button>
              </div>
            )}

            {shown.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 rounded-3xl border border-white/5 bg-zinc-950/50">
                <div className="text-4xl mb-2">{filter === "vault" ? "🔒" : "🖼️"}</div>
                <p className="text-sm">
                  {filter === "vault"
                    ? "Your Private Vault is empty. Click 'Vault' on any gallery item to hide it here."
                    : "No media in this tab yet. Use the Instant Media Lab above to generate a picture or video!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {shown.map((item) => {
                  const isVaulted = vaultIds.includes(item.id);
                  return (
                    <figure
                      key={item.id}
                      className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col"
                    >
                      {item.frames && item.frames.length > 1 ? (
                        <MotionSequencePlayer frames={item.frames} compact />
                      ) : item.url.startsWith("data:video/") ? (
                        <video
                          src={item.url}
                          controls
                          loop
                          playsInline
                          className="w-full aspect-[3/4] object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.type}
                          onError={(e) => {
                            e.currentTarget.src = `/portraits/maren.jpg`;
                          }}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      )}
                      <figcaption className="p-2.5 text-[11px] text-zinc-400 space-y-2 mt-auto">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            <span className="text-pink-300">{item.characterName}</span> ·{" "}
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => handleToggleVault(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:border-pink-500/40 hover:text-pink-200"
                          >
                            {isVaulted ? (
                              <>
                                <Unlock className="h-3 w-3" /> Unvault
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" /> Vault
                              </>
                            )}
                          </button>
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="rounded-lg bg-red-600 px-2 py-1 text-[10px] text-white"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-lg border border-white/15 px-1.5 py-1 text-[10px] text-zinc-300"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete ${item.characterName} ${item.type}`}
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={onHome} className="text-pink-400">
        ← Home
      </button>
      <h1 className="text-2xl font-bold">{title}</h1>
      {view === "room" ? (
        <p>This room is a demo. Live group chat is not connected.</p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Saved on this device.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <input
              aria-label={view === "create" ? "Her name" : "Feature idea"}
              placeholder={view === "create" ? "Her name" : "What do you want?"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3"
            />
            <button
              disabled={!text.trim()}
              className="rounded-xl bg-pink-600 px-4 disabled:opacity-40"
            >
              {view === "create" ? "Create" : "Send"}
            </button>
          </form>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="rounded-xl bg-zinc-900 p-4">
                {item}
                {view === "create" && (
                  <button onClick={() => onOpenCustom(item)} className="ml-4 text-pink-400">
                    Chat
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
