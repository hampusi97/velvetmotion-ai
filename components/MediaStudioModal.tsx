'use client';

import React, { useRef, useState } from 'react';
import { Download, BookmarkPlus, Film, MessageSquare, Sparkles, Lock, Upload } from 'lucide-react';
import { CompanionProfile, FLAGSHIP_COMPANIONS } from '@/data/companions';
import {
  generateStudioVideoClip,
  VIDEO_DURATIONS,
  VIDEO_MOTION_PRESETS,
  VIDEO_SPEEDS,
  type VideoMotionPreset,
} from '@/lib/canvasVideoExporter';
import { generateStudioPicture } from '@/lib/mediaGenerator';
import { assertCompliance } from '@/lib/complianceFilter';
import { useLocalEngineStatus } from '@/lib/localEngineBridge';
import { addToGallery, getGallery, loadChat, saveChat } from '@/lib/storage';
import { saveCustomCompanionDB, saveGalleryDB } from '@/lib/db';
import { emitVaultUpdated } from '@/lib/firebaseSync';
import { extractCharaFromPngBuffer, parseCardV2Json } from '@/lib/characterCardV2';
import { SafeImage } from '@/components/SafeImage';

interface MediaStudioModalProps {
  isOpen: boolean;
  standalone?: boolean;
  initialTab?: 'photo' | 'video' | 'upload';
  imageWorkerUrl?: string;
  videoBackendUrl?: string;
  activeChatCompanionId?: string;
  onClose: () => void;
  onCompanionCreated?: (companion: CompanionProfile) => void;
  onDropIntoChat?: (companionId: string, imageUrl: string, caption: string) => void;
}

const SCENE_PRESETS = [
  { id: 'sunset-pool', label: 'Sunset Pool', suffix: 'golden-hour infinity pool, warm reflections, crisp DSLR candid', nsfw: false },
  { id: 'mirror', label: 'Mirror Selfie', suffix: 'candid bedroom mirror selfie, warm fairy lights, natural skin texture', nsfw: false },
  { id: 'penthouse', label: 'Penthouse Night', suffix: 'city skyline bokeh at night, moody luxury glass window lighting', nsfw: false },
  { id: 'neon', label: 'Neon Bedroom', suffix: 'soft magenta and cyan LED bedroom lighting, cinematic shadows', nsfw: true },
  { id: 'after-hours', label: 'After Hours', suffix: 'intimate candlelit boudoir photography, realistic skin texture, shallow DOF', nsfw: true },
] as const;

const STUDIO_STYLES = ['Candid Flash', 'Neon Noir', 'Studio Glamour', 'Anime/3D'] as const;
const QUICK_CHIPS = [
  'silk evening dress',
  'streetwear crop top',
  'poolside bikini',
  'cozy oversized hoodie',
  'over-the-shoulder glance',
  'bedroom mirror selfie',
  'golden hour sunlight',
  'cyberpunk magenta neon',
  'candlelit bokeh',
] as const;
const ASPECT_RATIOS = [
  { id: '2:3', width: 640, height: 960, label: '2:3' },
  { id: '9:16', width: 576, height: 1024, label: '9:16' },
  { id: '1:1', width: 768, height: 768, label: '1:1' },
  { id: '16:9', width: 960, height: 544, label: '16:9' },
] as const;

/** Client-side Canvas resize + WebP compression (max 1024px) so IndexedDB stays fast */
async function compressUploadToWebp(file: File): Promise<string> {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  }
  bmp.close?.();
  return canvas.toDataURL('image/webp', 0.86);
}

export default function MediaStudioModal({
  isOpen,
  standalone = false,
  initialTab = 'photo',
  imageWorkerUrl = process.env.NEXT_PUBLIC_IMAGE_WORKER_URL || 'https://velvetmotion-image.hampusi97.workers.dev',
  videoBackendUrl = process.env.NEXT_PUBLIC_VIDEO_WORKER_URL || '',
  activeChatCompanionId,
  onClose,
  onCompanionCreated,
  onDropIntoChat,
}: MediaStudioModalProps) {
  const [tab, setTab] = useState<'photo' | 'video' | 'upload'>(initialTab);
  const [selectedId, setSelectedId] = useState(activeChatCompanionId || FLAGSHIP_COMPANIONS[0].id);
  const [sceneId, setSceneId] = useState<string>(SCENE_PRESETS[0].id);
  const [studioStyle, setStudioStyle] = useState<(typeof STUDIO_STYLES)[number]>('Neon Noir');
  const [aspectId, setAspectId] = useState<(typeof ASPECT_RATIOS)[number]['id']>('2:3');
  const [seedLock, setSeedLock] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [nsfwMode, setNsfwMode] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
  const [photoRevealed, setPhotoRevealed] = useState(true);
  const [engineBadge, setEngineBadge] = useState<string | null>(null);

  const [videoSourceUrl, setVideoSourceUrl] = useState<string>(FLAGSHIP_COMPANIONS[0].portraitUrl);
  const [motionId, setMotionId] = useState<VideoMotionPreset['id']>(VIDEO_MOTION_PRESETS[0].id);
  const [durationSec, setDurationSec] = useState<3 | 5 | 8>(5);
  const [videoSpeed, setVideoSpeed] = useState<0.75 | 1 | 1.25>(1);
  const [videoBusy, setVideoBusy] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoEngineUsed, setVideoEngineUsed] = useState<string | null>(null);

  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charAge, setCharAge] = useState(23);
  const [charVibe, setCharVibe] = useState('');
  const [charGreeting, setCharGreeting] = useState('');
  const [fictionalConfirmed, setFictionalConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const localEngine = useLocalEngineStatus();

  if (!isOpen && !standalone) return null;

  const companion = FLAGSHIP_COMPANIONS.find((c) => c.id === selectedId) ?? FLAGSHIP_COMPANIONS[0];
  const aspect = ASPECT_RATIOS.find((a) => a.id === aspectId) ?? ASPECT_RATIOS[0];

  async function handleGeneratePhoto() {
    const preset = SCENE_PRESETS.find((p) => p.id === sceneId) ?? SCENE_PRESETS[0];
    const prompt = [
      companion.visualDna,
      preset.suffix,
      studioStyle,
      customPrompt.trim(),
      `aspect ${aspect.id}, photorealistic lighting, consenting adult 21+`,
    ]
      .filter(Boolean)
      .join(', ');
    const parsedSeed = Number(seedLock) || Math.floor(Math.random() * 90000 + 1000);
    const wantsNsfw = nsfwMode || preset.nsfw;

    setPhotoBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const result = await generateStudioPicture({
        prompt,
        seed: parsedSeed,
        width: aspect.width,
        height: aspect.height,
        nsfw: wantsNsfw,
        characterId: companion.id,
        imageWorkerUrl,
        localEngine,
      });

      setGeneratedPhoto(result.imageUrl);
      setPhotoRevealed(!wantsNsfw);
      setVideoSourceUrl(result.imageUrl);
      setEngineBadge(result.engine);
      handleSaveToCollection(result.imageUrl, wantsNsfw ? 'selfie' : 'studio-photo');
      setStatusMsg(`Rendered via ${result.engine} in ${result.elapsedSec}s (seed ${result.seed}) · Auto-saved to Photo Diary & Collection`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Photo generation failed.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleGenerateVideo() {
    setVideoBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await generateStudioVideoClip({
        imageUrl: videoSourceUrl,
        motionId,
        durationSec,
        speed: videoSpeed,
        prompt: `${companion.name} ${customPrompt}`,
        comfyOnline: localEngine.comfyOnline,
        videoBackendUrl,
      });
      setGeneratedVideoUrl(res.videoUrl);
      setVideoEngineUsed(res.engine);
      setStatusMsg(`Rendered ${durationSec}s @ ${videoSpeed}x via ${res.engine}!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Video rendering failed.');
    } finally {
      setVideoBusy(false);
    }
  }

  async function processFile(file: File) {
    setErrorMsg(null);
    const webpData = await compressUploadToWebp(file);
    setUploadedPreview(webpData);
    setVideoSourceUrl(webpData);

    if (file.name.toLowerCase().endsWith('.json')) {
      const txt = await file.text();
      const parsed = parseCardV2Json(txt);
      if (parsed.ok) {
        setCharName(parsed.character.name);
        setCharAge(parsed.character.age);
        setCharVibe(parsed.character.personality);
        setCharGreeting(parsed.character.initialMessage);
        setStatusMsg('Imported Character Card Spec V2 JSON!');
      } else {
        setErrorMsg(parsed.error);
      }
      return;
    }

    const rawBuf = await file.arrayBuffer();
    const charaRaw = extractCharaFromPngBuffer(rawBuf);
    if (charaRaw) {
      const parsed = parseCardV2Json(charaRaw, webpData);
      if (parsed.ok) {
        setCharName(parsed.character.name);
        setCharAge(parsed.character.age);
        setCharVibe(parsed.character.personality);
        setCharGreeting(parsed.character.initialMessage);
        setStatusMsg('Extracted Character Card V2 PNG metadata!');
      } else {
        setErrorMsg(parsed.error);
      }
    }
  }

  function handleSaveToCollection(url: string, type = 'studio') {
    const saved = addToGallery({
      characterId: companion.id,
      characterName: companion.name,
      type,
      url,
      prompt: `${companion.name} · ${studioStyle}`,
    });
    if (saved) {
      void saveGalleryDB({
        id: saved.id,
        characterId: saved.characterId,
        url: saved.url,
        mood: type,
        createdAt: saved.createdAt,
      });
    }
    setStatusMsg('Saved permanently to Collection!');
  }

  function handleDropToChat(url: string) {
    const targetId = activeChatCompanionId || companion.id;
    const caption = `*Studio drop (${studioStyle}):* ${SCENE_PRESETS.find((s) => s.id === sceneId)?.label || 'Custom'}`;
    if (onDropIntoChat) {
      onDropIntoChat(targetId, url, caption);
    } else {
      const prev = loadChat(targetId);
      saveChat(targetId, [...prev, { role: 'assistant', content: caption, imageUrl: url }]);
    }
    setStatusMsg(`Dropped directly into ${companion.name}'s chat!`);
  }

  function handleSaveUploadedCompanion() {
    if (!uploadedPreview || !charName.trim() || !fictionalConfirmed) {
      setErrorMsg('Upload fictional/AI art, enter a name, and confirm 18+ fictional character.');
      return;
    }
    const check = assertCompliance(`${charName} ${charVibe} ${charGreeting}`);
    if (!check.ok) {
      setErrorMsg(check.reason);
      return;
    }

    const id = `custom-${Date.now()}`;
    const created: CompanionProfile = {
      id,
      name: charName.trim(),
      age: Math.max(18, Math.min(60, charAge)),
      archetype: 'Custom Companion',
      category: 'Sweetheart',
      tagline: charVibe.trim() || 'Custom companion created in Pro Media Studio',
      portraitUrl: uploadedPreview,
      visualDna: `${Math.max(18, charAge)}-year-old fictional woman, ${charVibe.trim() || 'stylish candid portrait, warm lighting'}`,
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
      const existing = JSON.parse(window.localStorage.getItem('velvetmotion_custom_companions') || '[]') as CompanionProfile[];
      window.localStorage.setItem('velvetmotion_custom_companions', JSON.stringify([created, ...existing]));
      const rosterRaw = JSON.parse(window.localStorage.getItem('velvet-custom-girls') || '[]') as unknown[];
      window.localStorage.setItem(
        'velvet-custom-girls',
        JSON.stringify([
          {
            id: created.id,
            name: created.name,
            age: created.age,
            tagline: created.tagline,
            category: created.category,
            avatar: created.portraitUrl,
            voiceIntro: created.voiceSampleLine,
            initialMessage: created.greeting,
            tags: ['Custom', created.category],
            intimacy: 55,
            voice: { label: created.voiceId, pitch: 1, rate: 0.96, style: created.personality },
            voiceId: created.voiceId,
            visualDna: created.visualDna,
            personality: created.personality,
            traits: ['Custom', 'Studio'],
            background: created.backstory,
            figure: created.visualDna,
            kink: created.category,
            reply: created.greeting,
          },
          ...rosterRaw,
        ].slice(0, 40)),
      );
    } catch {
      /* ignore */
    }
    void saveCustomCompanionDB(created.id, created as unknown as Record<string, unknown>);
    emitVaultUpdated();

    onCompanionCreated?.(created);
    setStatusMsg(`${created.name} added to your roster!`);
    if (!standalone) window.setTimeout(() => onClose(), 800);
  }

  const cardContent = (
    <div
      className={
        standalone
          ? 'mx-auto w-full max-w-2xl rounded-3xl neon-glass bg-[#0c0c16]/90 p-5 sm:p-6 text-[#f7f7fc] space-y-4'
          : 'max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl sm:rounded-3xl neon-glass bg-[#0c0c16]/95 p-5 text-[#f7f7fc] shadow-2xl space-y-4'
      }
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) {
          setTab('upload');
          void processFile(f);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight neon-text-glow flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#ff1e8e]" />
            Pro Media <span className="text-[#00f5ff]">Studio</span>
          </h2>
          <p className="text-[11px] text-[#a6a6c4]">
            {localEngine.anyLocalOnline
              ? `⚡ Dual-Engine: Local Ultra (${localEngine.ramTier}) ready`
              : '☁️ Dual-Engine: Cloud Free (CF Flux + AI Horde)'}
          </p>
        </div>
        {!standalone && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close studio"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff1e8e]/45 bg-black/50 text-sm text-zinc-200 hover:bg-[#ff1e8e]/20"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-[#05050a] p-1 text-xs font-bold">
        {(
          [
            ['photo', 'Photo Studio'],
            ['video', 'Shorts Video'],
            ['upload', 'Face Lock / V2'],
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
              tab === id ? 'neon-btn-primary text-white' : 'text-[#a6a6c4] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <p className="rounded-xl border border-rose-500/45 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">{errorMsg}</p>
      )}
      {statusMsg && (
        <p className="rounded-xl border border-[#00ffa3]/40 bg-[#00ffa3]/12 px-3 py-2 text-xs text-[#00ffa3]">{statusMsg}</p>
      )}

      {tab === 'photo' && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-[#a6a6c4]">Companion</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  const found = FLAGSHIP_COMPANIONS.find((c) => c.id === e.target.value);
                  if (found) setVideoSourceUrl(found.portraitUrl);
                }}
                className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white focus:border-[#00f5ff] focus:outline-none"
              >
                {FLAGSHIP_COMPANIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.age} — {c.archetype}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[#a6a6c4] flex items-center gap-1">
                <Lock className="h-3 w-3 text-[#00f5ff]" /> Seed Lock (optional)
              </label>
              <input
                value={seedLock}
                onChange={(e) => setSeedLock(e.target.value.replace(/\D/g, ''))}
                placeholder="Random seed (e.g. 42190)"
                className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white focus:border-[#00f5ff] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SCENE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSceneId(p.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  sceneId === p.id ? 'border-[#ff1e8e] bg-[#ff1e8e]/20 text-white' : 'border-white/10 bg-[#05050a] text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {STUDIO_STYLES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStudioStyle(st)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                    studioStyle === st ? 'border-[#00f5ff] bg-[#00f5ff]/15 text-[#00f5ff]' : 'border-white/10 text-[#a6a6c4]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  type="button"
                  onClick={() => setAspectId(ar.id)}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                    aspectId === ar.id ? 'border-[#ff1e8e] bg-[#ff1e8e]/20 text-white' : 'border-white/10 text-zinc-400'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setCustomPrompt((p) => (p.includes(chip) ? p : p.trim() ? `${p.trim()}, ${chip}` : chip))}
                className="rounded-full border border-white/10 bg-[#141418] px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:border-[#ff5678]/60 hover:text-white"
              >
                + {chip}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Custom outfit, neon lighting, pose or mood..."
            className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff1e8e] focus:outline-none"
          />

          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
            <input type="checkbox" checked={nsfwMode} onChange={(e) => setNsfwMode(e.target.checked)} className="accent-[#ff1e8e]" />
            Enable 18+ Adult Mode (fictional consenting adults only)
          </label>

          <button
            type="button"
            disabled={photoBusy}
            onClick={() => void handleGeneratePhoto()}
            className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {photoBusy ? 'Generating Neon Portrait...' : 'Generate Photo'}
          </button>

          {generatedPhoto && (
            <div className="space-y-2.5 pt-2">
              <div className="relative mx-auto aspect-[2/3] w-56 overflow-hidden rounded-2xl border border-[#ff1e8e]/45 bg-black">
                <SafeImage
                  src={generatedPhoto}
                  alt="Generated studio photo"
                  onClick={() => setPhotoRevealed(true)}
                  className={`h-full w-full cursor-pointer object-cover transition duration-500 ${
                    photoRevealed ? '' : 'blur-2xl scale-110'
                  }`}
                />
                {engineBadge && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/75 border border-[#00f5ff]/40 px-2 py-0.5 text-[9px] font-bold text-[#00f5ff]">
                    {engineBadge}
                  </span>
                )}
                {!photoRevealed && (
                  <button type="button" onClick={() => setPhotoRevealed(true)} className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="rounded-full neon-btn-primary px-4 py-1.5 text-xs font-bold">Tap to Reveal</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <a
                  href={generatedPhoto}
                  download={`velvetmotion-${companion.id}.png`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </a>
                <button
                  type="button"
                  onClick={() => handleSaveToCollection(generatedPhoto, 'studio-photo')}
                  className="inline-flex items-center gap-1 rounded-full border border-[#00f5ff]/45 bg-[#00f5ff]/15 px-3 py-1.5 text-[11px] font-bold text-[#00f5ff]"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save to Collection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoSourceUrl(generatedPhoto);
                    setTab('video');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ff5678]/50 bg-[#ff5678]/20 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  <Film className="h-3.5 w-3.5" /> Animate into Video
                </button>
                <button
                  type="button"
                  onClick={() => handleDropToChat(generatedPhoto)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ff1e8e]/50 bg-[#ff1e8e]/20 px-3 py-1.5 text-[11px] font-bold text-pink-100"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Drop into Active Chat
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'video' && (
        <div className="space-y-3 text-xs">
          <p className="text-[11px] text-[#a6a6c4]">
            Render looping `.webm` motion Shorts at $0 in-browser—or accelerate automatically with FramePack / Wan 2.2 / LTX-2 on ComfyUI (:8188).
          </p>

          <div>
            <label className="mb-1 block text-[11px] text-[#a6a6c4]">Source Image (Portrait or Generated Selfie)</label>
            <select
              value={videoSourceUrl}
              onChange={(e) => setVideoSourceUrl(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#ff5678]"
            >
              {generatedPhoto && <option value={generatedPhoto}>Latest Studio Photo</option>}
              {FLAGSHIP_COMPANIONS.map((c) => (
                <option key={c.id} value={c.portraitUrl}>
                  {c.name} — Flagship Portrait
                </option>
              ))}
              {getGallery()
                .filter((g) => g.url && !g.url.startsWith('blob:'))
                .slice(0, 10)
                .map((g) => (
                  <option key={g.id} value={g.url}>
                    Saved: {g.characterName} ({g.type})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] text-[#a6a6c4]">Motion Preset</span>
            <div className="flex flex-wrap gap-1.5">
              {VIDEO_MOTION_PRESETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotionId(m.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    motionId === m.id ? 'border-[#ff5678] bg-[#2a1820] text-white' : 'border-white/10 bg-[#05050a] text-zinc-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[11px] text-[#a6a6c4]">Duration</span>
              <div className="flex gap-1">
                {VIDEO_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationSec(d)}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-bold ${
                      durationSec === d ? 'border-[#ff5678] bg-[#2a1820] text-white' : 'border-white/10 bg-[#05050a] text-zinc-400'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-[#a6a6c4]">Speed</span>
              <div className="flex gap-1">
                {VIDEO_SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setVideoSpeed(sp)}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] font-bold ${
                      videoSpeed === sp ? 'border-[#00f5ff] bg-[#00f5ff]/15 text-[#00f5ff]' : 'border-white/10 bg-[#05050a] text-zinc-400'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={videoBusy}
            onClick={() => void handleGenerateVideo()}
            className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {videoBusy ? `Rendering ${durationSec}s @ ${videoSpeed}x .webm clip...` : `Generate ${durationSec}s Video Clip (.webm)`}
          </button>
          {generatedVideoUrl && (
            <div className="space-y-2 pt-2 text-center">
              {videoEngineUsed && (
                <p className="text-[10px] font-bold text-[#00f5ff]">{videoEngineUsed}</p>
              )}
              <video
                src={generatedVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="mx-auto aspect-[2/3] w-56 rounded-2xl border border-[#ff5678]/40 object-cover"
              />
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveToCollection(videoSourceUrl, 'shorts-video')}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ff5678]/45 bg-[#2a1820] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save to Shorts / Collection
                </button>
                <a
                  href={generatedVideoUrl}
                  download={`velvetmotion-short-${Date.now()}.webm`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download .webm
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div className="space-y-3 text-xs">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#00f5ff]/35 bg-[#05050a] px-4 py-6 text-center hover:border-[#ff1e8e]"
          >
            {uploadedPreview ? (
              <img src={uploadedPreview} alt="Uploaded preview" className="h-36 w-28 rounded-xl object-cover object-top" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-[#00f5ff] mb-1.5" />
                <span className="text-sm font-bold text-white">Drop / Paste Photo or Character Card V2</span>
                <span className="mt-1 text-[11px] text-[#a6a6c4]">
                  Client-side compressed to ≤1024px WebP for fast IndexedDB storage (.png `chara`, .json, .webp, .jpg)
                </span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/webp,image/jpeg,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void processFile(f);
            }}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="Companion name"
              className="col-span-2 rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white focus:border-[#ff1e8e] focus:outline-none"
            />
            <input
              type="number"
              min={18}
              max={60}
              value={charAge}
              onChange={(e) => setCharAge(Number(e.target.value))}
              className="rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white focus:border-[#ff1e8e] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setCustomPrompt((p) => (p.includes(chip) ? p : p.trim() ? `${p.trim()}, ${chip}` : chip))}
                className="rounded-full border border-white/10 bg-[#141418] px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:border-[#ff5678]/60 hover:text-white"
              >
                + {chip}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={charVibe}
            onChange={(e) => setCharVibe(e.target.value)}
            placeholder="Visual description & personality vibe..."
            className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff1e8e] focus:outline-none"
          />

          <input
            type="text"
            value={charGreeting}
            onChange={(e) => setCharGreeting(e.target.value)}
            placeholder="Opening line..."
            className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#ff1e8e] focus:outline-none"
          />

          <label className="flex items-start gap-2 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={fictionalConfirmed}
              onChange={(e) => setFictionalConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#ff1e8e]"
            />
            <span>I confirm this image depicts a consenting fictional adult (18+) and is not a real person without consent.</span>
          </label>

          <button
            type="button"
            onClick={handleSaveUploadedCompanion}
            className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white"
          >
            Create Companion &amp; Add to Roster
          </button>
        </div>
      )}
    </div>
  );

  if (standalone) return cardContent;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center sm:p-4">
      {cardContent}
    </div>
  );
}
