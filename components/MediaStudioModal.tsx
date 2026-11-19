'use client';

import React, { useRef, useState } from 'react';
import { CompanionProfile, FLAGSHIP_COMPANIONS } from "@/data/companions";

interface MediaStudioModalProps {
  isOpen: boolean;
  initialTab?: 'photo' | 'video' | 'upload';
  imageWorkerUrl?: string;
  /** Optional Cloudflare Tunnel URL to local ComfyUI / Wan 2.2 / FramePack video server */
  videoBackendUrl?: string;
  onClose: () => void;
  onCompanionCreated?: (companion: CompanionProfile) => void;
}

const SCENE_PRESETS = [
  { id: 'sunset-pool', label: 'Sunset Pool', suffix: 'golden-hour infinity pool, warm reflections, crisp DSLR candid', nsfw: false },
  { id: 'mirror', label: 'Mirror Selfie', suffix: 'candid bedroom mirror selfie, warm fairy lights, natural skin texture', nsfw: false },
  { id: 'penthouse', label: 'Penthouse Night', suffix: 'city skyline bokeh at night, moody luxury glass window lighting', nsfw: false },
  { id: 'neon', label: 'Neon Bedroom', suffix: 'soft magenta and cyan LED bedroom lighting, cinematic shadows', nsfw: true },
  { id: 'after-hours', label: 'After Hours', suffix: 'intimate candlelit boudoir photography, realistic skin texture, shallow DOF', nsfw: true },
] as const;

const MOTION_PRESETS = [
  { id: 'zoom-in', label: 'Slow Push-In', dx: 0, dy: -8, scaleEnd: 1.12 },
  { id: 'pan-right', label: 'Cinema Pan', dx: -18, dy: 0, scaleEnd: 1.1 },
  { id: 'drift-up', label: 'Vertical Reveal', dx: 0, dy: -22, scaleEnd: 1.14 },
] as const;

/**
 * Generates a real downloadable .webm motion clip 100% in the browser via Canvas + MediaRecorder
 * whenever a local ComfyUI / Wan 2.2 GPU tunnel isn't connected.
 */
async function renderBrowserWebmClip(
  imageUrl: string,
  motion: (typeof MOTION_PRESETS)[number],
  durationMs = 3200
): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not load source image for animation'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 810;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };
  });

  recorder.start();
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function frame(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;
      const scale = 1 + (motion.scaleEnd - 1) * ease;
      const drawW = canvas.width * scale;
      const drawH = canvas.height * scale;
      const offsetX = (canvas.width - drawW) / 2 + motion.dx * ease;
      const offsetY = (canvas.height - drawH) / 2 + motion.dy * ease;

      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, offsetX, offsetY, drawW, drawH);

      // Subtle cinema vignette
      const grad = ctx!.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.25,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.65
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        recorder.stop();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });

  return done;
}

/** Extracts SillyTavern V2 PNG tEXt `chara` metadata if present in an uploaded PNG */
async function tryExtractCharaMetadata(file: File): Promise<{ name?: string; description?: string; first_mes?: string } | null> {
  try {
    const text = await file.text();
    const match = text.match(/chara\x00([A-Za-z0-9+/=]{20,})/);
    if (!match?.[1]) return null;
    const decoded = atob(match[1]);
    const json = JSON.parse(decoded);
    const data = json.data ?? json;
    return {
      name: data.name,
      description: data.description || data.personality,
      first_mes: data.first_mes,
    };
  } catch {
    return null;
  }
}

export default function MediaStudioModal({
  isOpen,
  initialTab = 'photo',
  imageWorkerUrl = process.env.NEXT_PUBLIC_IMAGE_WORKER_URL ||
    'https://velvetmotion-image.hampusi97.workers.dev',
  videoBackendUrl = process.env.NEXT_PUBLIC_VIDEO_WORKER_URL || '',
  onClose,
  onCompanionCreated,
}: MediaStudioModalProps) {
  const [tab, setTab] = useState<'photo' | 'video' | 'upload'>(initialTab);

  // Photo tab state
  const [selectedId, setSelectedId] = useState(FLAGSHIP_COMPANIONS[0].id);
  const [sceneId, setSceneId] = useState<string>(SCENE_PRESETS[0].id);
  const [customPrompt, setCustomPrompt] = useState('');
  const [nsfwMode, setNsfwMode] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
  const [photoRevealed, setPhotoRevealed] = useState(true);

  // Video tab state
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>(FLAGSHIP_COMPANIONS[0].portraitUrl);
  const [motionId, setMotionId] = useState<string>(MOTION_PRESETS[0].id);
  const [videoBusy, setVideoBusy] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Upload fictional character tab state
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charAge, setCharAge] = useState(23);
  const [charVibe, setCharVibe] = useState('');
  const [charGreeting, setCharGreeting] = useState('');
  const [fictionalConfirmed, setFictionalConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const companion =
    FLAGSHIP_COMPANIONS.find((c) => c.id === selectedId) ?? FLAGSHIP_COMPANIONS[0];

  async function handleGeneratePhoto() {
    setPhotoBusy(true);
    setErrorMsg(null);
    const preset = SCENE_PRESETS.find((p) => p.id === sceneId) ?? SCENE_PRESETS[0];
    const prompt = [
      companion.visualDna,
      preset.suffix,
      customPrompt.trim(),
      'vertical 2:3 framing, photorealistic lighting',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch(imageWorkerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          nsfw: nsfwMode || preset.nsfw,
          width: 768,
          height: 1152,
        }),
      });
      if (!res.ok) throw new Error(`Image worker returned ${res.status}`);
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (!data.imageUrl) throw new Error(data.error || 'No image returned');
      setGeneratedPhoto(data.imageUrl);
      setPhotoRevealed(!(nsfwMode || preset.nsfw));
      setVideoSourceUrl(data.imageUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Photo generation failed.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleGenerateVideo() {
    setVideoBusy(true);
    setErrorMsg(null);
    const motion = MOTION_PRESETS.find((m) => m.id === motionId) ?? MOTION_PRESETS[0];

    try {
      // 1. If a self-hosted ComfyUI / Wan 2.2 / FramePack tunnel URL is configured, use it first
      if (videoBackendUrl) {
        const res = await fetch(videoBackendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: videoSourceUrl, motion: motion.id }),
        });
        if (res.ok) {
          const data = (await res.json()) as { videoUrl?: string };
          if (data.videoUrl) {
            setGeneratedVideoUrl(data.videoUrl);
            setVideoBusy(false);
            return;
          }
        }
      }

      // 2. Zero-GPU instant browser .webm generator fallback (always works at $0)
      const webmUrl = await renderBrowserWebmClip(videoSourceUrl, motion);
      setGeneratedVideoUrl(webmUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video rendering failed.');
    } finally {
      setVideoBusy(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPreview(String(reader.result));
    };
    reader.readAsDataURL(file);

    const meta = await tryExtractCharaMetadata(file);
    if (meta) {
      if (meta.name) setCharName(meta.name);
      if (meta.description) setCharVibe(meta.description.slice(0, 220));
      if (meta.first_mes) setCharGreeting(meta.first_mes.slice(0, 220));
      setStatusMsg('Imported SillyTavern character card metadata!');
    }
  }

  function handleSaveUploadedCompanion() {
    if (!uploadedPreview || !charName.trim() || !fictionalConfirmed) {
      setErrorMsg('Upload a fictional/AI image, enter a name, and confirm 18+ fictional character.');
      return;
    }

    const id = `custom-${Date.now()}`;
    const created: CompanionProfile = {
      id,
      name: charName.trim(),
      age: Math.max(18, Math.min(60, charAge)),
      archetype: 'Custom Companion',
      category: 'Sweetheart',
      tagline: charVibe.trim() || 'Custom companion created in Velvet Studio',
      portraitUrl: uploadedPreview,
      visualDna: `${Math.max(18, charAge)}-year-old fictional woman, ${charVibe.trim() || 'stylish candid portrait, warm natural lighting'}`,
      voiceId: 'af_heart',
      voiceSampleLine: charGreeting.trim() || `Hey... I'm ${charName.trim()}. Ready to talk?`,
      personality: charVibe.trim() || 'Playful, affectionate, expressive.',
      backstory: charVibe.trim() || 'Created directly in your private VelvetMotion studio.',
      greeting: charGreeting.trim() || `Hey... I'm ${charName.trim()}. Glad you brought me to life.`,
      isNew: true,
      isPrivate: true,
      sceneSelfiePresets: FLAGSHIP_COMPANIONS[0].sceneSelfiePresets,
      guidedPaceStages: FLAGSHIP_COMPANIONS[0].guidedPaceStages,
    };

    try {
      const existing = JSON.parse(
        window.localStorage.getItem('velvetmotion_custom_companions') || '[]'
      ) as CompanionProfile[];
      window.localStorage.setItem(
        'velvetmotion_custom_companions',
        JSON.stringify([created, ...existing])
      );
    } catch {
      // Ignore quota errors
    }

    onCompanionCreated?.(created);
    setStatusMsg(`${created.name} added to your roster!`);
    window.setTimeout(() => onClose(), 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111018] p-5 text-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              Velvet <span className="text-[#f45b84]">Studio</span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Generate photos, animate looping Shorts, or import fictional character art
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close studio"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-zinc-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#181724] p-1 text-xs font-bold">
          {(
            [
              ['photo', 'Photo Studio'],
              ['video', 'Video / Shorts'],
              ['upload', 'Upload / Import'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setErrorMsg(null);
              }}
              className={`rounded-xl py-2 transition ${
                tab === id
                  ? 'bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <p className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            {errorMsg}
          </p>
        )}
        {statusMsg && (
          <p className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
            {statusMsg}
          </p>
        )}

        {/* TAB 1: PHOTO STUDIO */}
        {tab === 'photo' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Companion</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  const found = FLAGSHIP_COMPANIONS.find((c) => c.id === e.target.value);
                  if (found) setVideoSourceUrl(found.portraitUrl);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white focus:border-[#f45b84] focus:outline-none"
              >
                {FLAGSHIP_COMPANIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.age} — {c.archetype}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SCENE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSceneId(p.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    sceneId === p.id
                      ? 'border-[#f45b84] bg-[#f45b84]/20 text-white'
                      : 'border-white/10 bg-[#181724] text-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Optional extra details (outfit color, pose, setting)..."
              className="w-full rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#f45b84] focus:outline-none"
            />

            <label className="flex items-center gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                checked={nsfwMode}
                onChange={(e) => setNsfwMode(e.target.checked)}
                className="accent-[#f45b84]"
              />
              Enable 18+ Adult Mode (routes via free AI Horde opt-in workers)
            </label>

            <button
              type="button"
              disabled={photoBusy}
              onClick={() => void handleGeneratePhoto()}
              className="w-full rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              {photoBusy ? 'Generating portrait...' : 'Generate Photo'}
            </button>

            {generatedPhoto && (
              <div className="space-y-2 pt-2">
                <div className="relative mx-auto aspect-[2/3] w-56 overflow-hidden rounded-2xl border border-white/15 bg-black">
                  <img
                    src={generatedPhoto}
                    alt="Generated studio photo"
                    onClick={() => setPhotoRevealed(true)}
                    className={`h-full w-full cursor-pointer object-cover transition duration-500 ${
                      photoRevealed ? '' : 'blur-2xl scale-110'
                    }`}
                  />
                  {!photoRevealed && (
                    <button
                      type="button"
                      onClick={() => setPhotoRevealed(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                      <span className="rounded-full bg-[#f45b84] px-4 py-1.5 text-xs font-bold text-white">
                        Tap to Reveal
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex justify-center gap-2">
                  <a
                    href={generatedPhoto}
                    download={`velvetmotion-${companion.id}.png`}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoSourceUrl(generatedPhoto);
                      setTab('video');
                    }}
                    className="rounded-full bg-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white"
                  >
                    Animate into Short &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VIDEO / SHORTS GENERATOR */}
        {tab === 'video' && (
          <div className="space-y-3 text-xs">
            <p className="text-[11px] text-zinc-400">
              Animates any portrait into a downloadable looping `.webm` Short (uses your GPU tunnel if connected, or instant $0 browser rendering).
            </p>

            <div className="flex flex-wrap gap-1.5">
              {MOTION_PRESETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotionId(m.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    motionId === m.id
                      ? 'border-[#f45b84] bg-[#f45b84]/20 text-white'
                      : 'border-white/10 bg-[#181724] text-zinc-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={videoBusy}
              onClick={() => void handleGenerateVideo()}
              className="w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-[#f45b84] py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              {videoBusy ? 'Rendering looping .webm clip...' : 'Generate Looping Short (.webm)'}
            </button>

            {generatedVideoUrl && (
              <div className="space-y-2 pt-2 text-center">
                <video
                  src={generatedVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="mx-auto aspect-[2/3] w-56 rounded-2xl border border-white/15 object-cover"
                />
                <a
                  href={generatedVideoUrl}
                  download={`velvetmotion-short-${Date.now()}.webm`}
                  className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Download .webm Clip
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD FICTIONAL ART / SILLYTAVERN CARD */}
        {tab === 'upload' && (
          <div className="space-y-3 text-xs">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#181724] px-4 py-6 text-center hover:border-[#f45b84]"
            >
              {uploadedPreview ? (
                <img
                  src={uploadedPreview}
                  alt="Uploaded character preview"
                  className="h-36 w-28 rounded-xl object-cover object-top"
                />
              ) : (
                <>
                  <span className="text-sm font-bold text-white">
                    Upload Fictional Art or SillyTavern PNG Card
                  </span>
                  <span className="mt-1 text-[11px] text-zinc-400">
                    Auto-reads SillyTavern V2 metadata if embedded (.png, .webp, .jpg)
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={(e) => void handleFileSelect(e)}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="Companion name"
                className="col-span-2 rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white focus:border-[#f45b84] focus:outline-none"
              />
              <input
                type="number"
                min={18}
                max={60}
                value={charAge}
                onChange={(e) => setCharAge(Number(e.target.value))}
                className="rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white focus:border-[#f45b84] focus:outline-none"
              />
            </div>

            <textarea
              rows={2}
              value={charVibe}
              onChange={(e) => setCharVibe(e.target.value)}
              placeholder="Visual description & personality vibe..."
              className="w-full rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#f45b84] focus:outline-none"
            />

            <input
              type="text"
              value={charGreeting}
              onChange={(e) => setCharGreeting(e.target.value)}
              placeholder="Opening line (e.g. 'Glad you finally messaged me...')"
              className="w-full rounded-xl border border-white/10 bg-[#181724] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#f45b84] focus:outline-none"
            />

            <label className="flex items-start gap-2 text-[11px] text-zinc-300">
              <input
                type="checkbox"
                checked={fictionalConfirmed}
                onChange={(e) => setFictionalConfirmed(e.target.checked)}
                className="mt-0.5 accent-[#f45b84]"
              />
              <span>
                I confirm this image depicts a fictional adult (18+) or original artwork and is not a real person without consent.
              </span>
            </label>

            <button
              type="button"
              onClick={handleSaveUploadedCompanion}
              className="w-full rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] py-2.5 text-xs font-bold text-white shadow-lg"
            >
              Create Companion &amp; Add to Roster
            </button>
          </div>
        )}
      </div>
    </div>
  );
}