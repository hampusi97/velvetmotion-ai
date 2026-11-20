"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, ChevronDown, Download, Film, Image as ImageIcon, Loader2, Play, Plus, Square, Trash2 } from "lucide-react";
import { FLAGSHIP_COMPANIONS } from "@/data/companions";
import { generateStudioPicture } from "@/lib/mediaGenerator";
import { generateFictionalReferenceVariation } from "@/lib/referenceImageGenerator";
import { generateStudioVideoClip } from "@/lib/canvasVideoExporter";
import { useLocalEngineStatus } from "@/lib/localEngineBridge";
import { getMediaSettings } from "@/lib/mediaSettings";
import { assertCompliance } from "@/lib/complianceFilter";
import { addToGallery } from "@/lib/storage";
import {
  buildAtelierShotPrompt, DEFAULT_ATELIER_SHOTS,
  sanitizeAtelierShots, SHOT_COMPOSITIONS, SHOT_LIGHTING, SHOT_WARDROBE,
  STORYBOARD_STORAGE_KEY,
  type AtelierShot,
} from "@/lib/storyboard";

type ShotResult = {
  id: string; imageUrl?: string; videoUrl?: string;
  videoType?: "mp4" | "webm" | "unknown";
  generativeVideo?: boolean; engine?: string; error?: string;
};

export function AtelierStoryboard() {
  const [characterId, setCharacterId] = useState(FLAGSHIP_COMPANIONS[0].id);
  const [location, setLocation] = useState("An intimate rooftop penthouse after sunset, modern architecture, soft velvet interiors");
  const [shots, setShots] = useState<AtelierShot[]>(DEFAULT_ATELIER_SHOTS);
  const [adultMode, setAdultMode] = useState(false);
  const [referenceMode, setReferenceMode] = useState(false);
  const [fictionConfirmed, setFictionConfirmed] = useState(false);
  const [results, setResults] = useState<Record<string, ShotResult>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const stopAfterCurrent = useRef(false);
  const localEngine = useLocalEngineStatus();
  const character = FLAGSHIP_COMPANIONS.find((c) => c.id === characterId) || FLAGSHIP_COMPANIONS[0];
  const settings = getMediaSettings();
  const referenceBackendAvailable = Boolean(settings.img2imgUrl || (settings.localImageBase && settings.localImageMode === "comfy"));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORYBOARD_STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as { characterId?: string; location?: string; shots?: unknown };
      if (state.characterId && FLAGSHIP_COMPANIONS.some((c) => c.id === state.characterId)) setCharacterId(state.characterId);
      if (typeof state.location === "string") setLocation(state.location.slice(0, 380));
      if (state.shots) setShots(sanitizeAtelierShots(state.shots));
    } catch { /* old local state may be missing or invalid */ }
  }, []);

  useEffect(() => {
    try {
      // Only shot plans, NOT generated intimate media or prompt logs, are persisted here.
      window.localStorage.setItem(STORYBOARD_STORAGE_KEY, JSON.stringify({ characterId, location: location.slice(0, 380), shots }));
    } catch { /* storage disabled; the current session still works */ }
  }, [characterId, location, shots]);

  const edit = <K extends keyof AtelierShot>(id: string, field: K, value: AtelierShot[K]) => {
    setShots((prev) => prev.map((shot) => shot.id === id ? { ...shot, [field]: value } : shot));
    setResults((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const addShot = () => {
    if (shots.length >= 5) return;
    const id = `shot-${Date.now().toString(36)}`;
    setShots((prev) => [...prev, {
      id, title: `${String(prev.length + 1).padStart(2, "0")} · New moment`,
      composition: "portrait", lighting: "candlelight",
      wardrobe: "silk eveningwear", direction: "An original adult character chooses what happens next",
      type: "image", durationSec: 5,
    }]);
  };

  const render = async (onlyId?: string) => {
    if (processing || !shots.length) return;
    if (!fictionConfirmed) {
      setError("Confirm you are using original fictional adult characters before rendering.");
      return;
    }
    if (referenceMode && !referenceBackendAvailable) {
      setError("Face-reference generation needs an img2img endpoint or ComfyUI reference nodes in Advanced Media Settings.");
      return;
    }
    setProcessing(true);
    setError("");
    stopAfterCurrent.current = false;
    let referenceDataUrl = "";
    if (referenceMode) {
      try {
        const response = await fetch(character.portraitUrl);
        if (!response.ok) throw new Error("Original fictional reference portrait unavailable");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/") || blob.size > 12 * 1024 * 1024) {
          throw new Error("Fictional portrait is unavailable or too large");
        }
        referenceDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not decode character portrait"));
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        setProcessing(false);
        setError(e instanceof Error ? e.message : "Could not open character reference");
        return;
      }
    }
    const queue = onlyId ? shots.filter((s) => s.id === onlyId) : shots;
    for (let index = 0; index < queue.length; index++) {
      if (stopAfterCurrent.current) break;
      const shot = queue[index];
      setProgress(`Rendering shot ${index + 1} / ${queue.length}: ${shot.title}`);
      try {
        const prompt = buildAtelierShotPrompt({
          visualDna: character.visualDna, characterName: character.name,
          scene: location, shot, adultMode,
        });
        const compliance = assertCompliance(prompt);
        if (!compliance.ok) throw new Error(compliance.reason);
        const image = referenceMode
          ? await generateFictionalReferenceVariation({
              referenceImage: referenceDataUrl, prompt,
              sourceType: "fictional", adultMode: adultMode || shot.wardrobe === "editorial lingerie",
            })
          : await generateStudioPicture({
              prompt, width: 640, height: 960, nsfw: adultMode || shot.wardrobe === "editorial lingerie",
              characterId: character.id, localEngine,
            });
        if (shot.type === "video") {
          const clip = await generateStudioVideoClip({
            imageUrl: image.imageUrl, sourceType: "fictional", adultMode,
            prompt: `Fictional adult ${character.name}, gentle character motion. ${shot.direction}`,
            motionId: "balcony-breeze", durationSec: shot.durationSec, speed: 1,
            comfyOnline: localEngine.comfyOnline,
            videoBackendUrl: getMediaSettings().img2vidUrl,
          });
          setResults((prev) => ({
            ...prev, [shot.id]: {
              id: shot.id, imageUrl: image.imageUrl, videoUrl: clip.videoUrl,
              videoType: clip.videoFormat, generativeVideo: clip.isGenerative,
              engine: `${image.engine} + ${clip.engine}`, error: clip.warning,
            },
          }));
        } else {
          setResults((prev) => ({
            ...prev, [shot.id]: { id: shot.id, imageUrl: image.imageUrl, engine: image.engine },
          }));
        }
      } catch (e) {
        setResults((prev) => ({
          ...prev, [shot.id]: { id: shot.id, error: e instanceof Error ? e.message : "Model generation failed" },
        }));
        // Continue the user's other shots without inventing an image for this one.
      }
    }
    setProgress(stopAfterCurrent.current ? "Queue stopped after current shot." : "Storyboard rendering complete.");
    setProcessing(false);
  };

  const saveToGallery = (shot: AtelierShot) => {
    const item = results[shot.id];
    if (!item?.imageUrl || item.imageUrl.startsWith("blob:")) {
      setError("This temporary image is not persistable. Download it before closing the session.");
      return;
    }
    const saved = addToGallery({
      characterId: character.id,
      characterName: character.name,
      type: "storyboard",
      url: item.imageUrl,
      prompt: `${shot.title} · ${shot.direction}`,
    });
    setProgress(saved
      ? "Shot added to local gallery. Download or back up important images."
      : "Local gallery is unavailable. Download the image to keep it.");
  };

  const downloadPlan = () => {
    const plan = {
      format: "velvetmotion-storyboard-v1", exportedAt: new Date().toISOString(),
      fictionalAdult: true, characterId, location, shots,
      note: "Shot plan only. Rendered media files are separate and not included.",
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "velvetmotion-storyboard.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-labelledby="storyboard-title" className="space-y-5 rounded-[28px] border border-[#e6b8c7]/20 bg-gradient-to-br from-[#2b1829] via-[#18141f] to-[#111019] p-4 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#e9b1c6]">Atelier / Film room</p>
          <h2 id="storyboard-title" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Cinematic Storyboard Director</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-300">
            Direct original fictional adult characters shot by shot. A compatible image model creates portraits;
            a configured video model creates real AI motion. Otherwise, video exports are labeled animated stills.
            This is not a stitched full-length movie editor.
          </p>
        </div>
        <span className="rounded-full border border-[#e1bdcf]/25 bg-white/[.045] px-3 py-1.5 text-[10px] font-bold text-[#e7c4d2]">1–5 shots</span>
      </div>
      <div className="grid gap-3 md:grid-cols-[.7fr_1.3fr]">
        <label className="text-xs text-zinc-300">Featured fictional character
          <select value={characterId} disabled={processing} onChange={(e) => setCharacterId(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-white/15 bg-[#141019] p-3 text-sm text-white">
            {FLAGSHIP_COMPANIONS.map((c) => <option value={c.id} key={c.id}>{c.name} · {c.category}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-300">Scene and atmosphere
          <input maxLength={380} value={location} disabled={processing}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-white/15 bg-[#141019] p-3 text-sm text-white" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <label className="flex items-center gap-2 text-xs text-zinc-200">
          <input type="checkbox" checked={fictionConfirmed} onChange={(e) => setFictionConfirmed(e.target.checked)}
            className="accent-[#ce779e]" />
          Original fictional adults only, with no real-person likenesses
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-200">
          <input type="checkbox" checked={referenceMode} disabled={!fictionConfirmed}
            onChange={(e) => setReferenceMode(e.target.checked)} className="accent-[#ce779e]" />
          Use original fictional portrait as a face reference (requires compatible img2img model)
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-200">
          <input type="checkbox" checked={adultMode} disabled={!fictionConfirmed}
            onChange={(e) => setAdultMode(e.target.checked)} className="accent-[#ce779e]" />
          Adult-fiction styling where a connected model permits it
        </label>
      </div>
      <div className="space-y-3">
        {shots.map((shot, index) => {
          const result = results[shot.id];
          return (
            <article key={shot.id} className="grid gap-3 rounded-[20px] border border-white/10 bg-[#100e15]/80 p-3 sm:grid-cols-[110px_1fr] sm:p-4">
              <div className="min-h-[135px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#332137] to-[#140f1b]">
                {result?.videoUrl ? <video src={result.videoUrl} controls playsInline className="aspect-[2/3] h-full w-full object-cover" />
                  : result?.imageUrl ? <img src={result.imageUrl} alt={shot.title} className="aspect-[2/3] h-full w-full object-cover" />
                    : <div className="flex h-full min-h-[135px] flex-col items-center justify-center gap-2 text-[#dbbbcb]">
                        {shot.type === "video" ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                        <span className="text-[10px]">{String(index + 1).padStart(2, "0")} / Frame</span>
                      </div>}
              </div>
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input aria-label={`Title for shot ${index + 1}`} value={shot.title} disabled={processing}
                    maxLength={90} onChange={(e) => edit(shot.id, "title", e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[.035] px-2 py-2 text-xs font-semibold text-white" />
                  <button type="button" title="Remove shot" aria-label={`Remove shot ${index + 1}`} disabled={processing}
                    onClick={() => { setShots((p) => p.filter((x) => x.id !== shot.id)); setResults((p) => { const n = { ...p }; delete n[shot.id]; return n; }); }}
                    className="rounded-lg border border-white/10 p-2 text-zinc-300 hover:text-rose-200"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <label className="text-[10px] text-zinc-400">Camera
                    <select disabled={processing} value={shot.composition} onChange={(e) => edit(shot.id, "composition", e.target.value as AtelierShot["composition"])}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#201626] p-2 text-[11px] text-white">
                      {SHOT_COMPOSITIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] text-zinc-400">Lighting
                    <select disabled={processing} value={shot.lighting} onChange={(e) => edit(shot.id, "lighting", e.target.value as AtelierShot["lighting"])}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#201626] p-2 text-[11px] text-white">
                      {SHOT_LIGHTING.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] text-zinc-400">Outfit
                    <select disabled={processing} value={shot.wardrobe} onChange={(e) => edit(shot.id, "wardrobe", e.target.value as AtelierShot["wardrobe"])}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#201626] p-2 text-[11px] text-white">
                      {SHOT_WARDROBE.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] text-zinc-400">Output
                    <select disabled={processing} value={shot.type} onChange={(e) => edit(shot.id, "type", e.target.value as AtelierShot["type"])}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#201626] p-2 text-[11px] text-white">
                      <option value="image">Image</option><option value="video">Video</option>
                    </select>
                  </label>
                </div>
                <label className="block text-[10px] text-zinc-400">Director notes
                  <input maxLength={400} disabled={processing} value={shot.direction}
                    onChange={(e) => edit(shot.id, "direction", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#201626] px-3 py-2 text-xs text-white" />
                </label>
                {shot.type === "video" && <label className="inline-flex items-center gap-2 text-[10px] text-zinc-300">
                  Duration <select disabled={processing} value={shot.durationSec} onChange={(e) => edit(shot.id, "durationSec", Number(e.target.value) as 3 | 5 | 8)}
                    className="rounded-lg border border-white/10 bg-[#201626] px-2 py-1">
                    {[3,5,8].map((d) => <option key={d} value={d}>{d} seconds</option>)}
                  </select>
                </label>}
                {result?.engine && <p className="text-[10px] text-[#e7b1c4]">{result.generativeVideo === false ? "Animated still (not generative AI video)" : result.videoUrl ? "AI video" : "Image"} · {result.engine}</p>}
                {result?.error && <p className="text-[10px] leading-5 text-amber-200">{result.error}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={processing || !fictionConfirmed} onClick={() => void render(shot.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/25 px-3 py-1.5 text-[10px] font-semibold text-[#e8bdca] disabled:opacity-50">
                    <Play className="h-3 w-3" /> Generate shot
                  </button>
                  {result?.imageUrl && <>
                    <a href={result.imageUrl} download={`velvetmotion-${shot.id}.png`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white"><Download className="h-3 w-3" /> Image</a>
                    <button type="button" onClick={() => saveToGallery(shot)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white"><BookmarkPlus className="h-3 w-3" /> Save local</button>
                  </>}
                  {result?.videoUrl && <a href={result.videoUrl} download={`velvetmotion-${shot.id}.${result.videoType === "mp4" ? "mp4" : "webm"}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white"><Download className="h-3 w-3" /> Download video</a>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
        <button type="button" onClick={addShot} disabled={shots.length >= 5 || processing}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 px-4 py-2 text-xs text-rose-200 disabled:opacity-40">
          <Plus className="h-4 w-4" /> Add shot
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadPlan} className="rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200">
            Export shot plan
          </button>
          {processing
            ? <button type="button" onClick={() => { stopAfterCurrent.current = true; setProgress("Stopping after the current model request..."); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-800 px-4 py-2 text-xs text-white"><Square className="h-3.5 w-3.5" /> Stop after shot</button>
            : <button type="button" disabled={!shots.length || !fictionConfirmed} onClick={() => void render()}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ce7999] to-[#a65c86] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                <Film className="h-4 w-4" /> Render all shots
              </button>}
        </div>
      </div>
      {(progress || processing) && <p role="status" className="inline-flex items-center gap-2 text-xs text-[#e8becd]">
        {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{progress}
      </p>}
      {error && <p role="alert" className="rounded-xl border border-rose-400/20 p-3 text-xs text-rose-200">{error}</p>}
      <p className="text-[10px] leading-5 text-zinc-500">
        Progress and assets live in this browser session. The draft shot plan is kept locally, but video blob URLs expire on reload;
        download your clips. A model connection is required for real generated imagery, and the stop button does not interrupt the current backend request.
      </p>
    </section>
  );
}
