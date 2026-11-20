'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, BookmarkPlus, Film, MessageSquare, Sparkles, Lock, Upload } from 'lucide-react';
import { CompanionProfile, FLAGSHIP_COMPANIONS } from '@/data/companions';
import {
  generateStudioVideoClip,
  VIDEO_DURATIONS,
  VIDEO_MOTION_PRESETS,
  VIDEO_SPEEDS,
  type VideoMotionPreset,
} from '@/lib/canvasVideoExporter';
import { generateComfySfwPortrait, probeComfyUi } from '@/lib/comfyBridge';
import { generateStudioPicture } from '@/lib/mediaGenerator';
import { getMediaSettings, saveMediaSettings } from '@/lib/mediaSettings';
import { VoiceDesigner, DEFAULT_VOICE_DESIGN, type VoiceDesign } from '@/components/VoiceDesigner';
import { generateFictionalReferenceVariation } from '@/lib/referenceImageGenerator';
import { assertCompliance } from '@/lib/complianceFilter';
import { useLocalEngineStatus } from '@/lib/localEngineBridge';
import { addToGallery, getGallery, loadChat, saveChat } from '@/lib/storage';
import { saveCustomCompanionDB, saveGalleryDB } from '@/lib/db';
import { emitVaultUpdated } from '@/lib/firebaseSync';
import { extractCharaFromPngBuffer, parseCardV2Json } from '@/lib/characterCardV2';
import { SafeImage } from '@/components/SafeImage';
import { AtelierStoryboard } from '@/components/AtelierStoryboard';
import { fetchStudioVideoBlob, saveStudioVideoBlob } from '@/lib/studioVideoDownload';

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
  const [cameraStyle, setCameraStyle] = useState("cinematic 85mm portrait lens");
  const [lightingStyle, setLightingStyle] = useState("warm rose-gold studio");
  const [wardrobeStyle, setWardrobeStyle] = useState("elegant evening fashion");
  const [negativePrompt, setNegativePrompt] = useState("watermarks, extra fingers, distorted faces");
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
  const [videoDownloading, setVideoDownloading] = useState(false);
  const videoAbortRef = useRef<AbortController | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoEngineUsed, setVideoEngineUsed] = useState<string | null>(null);

  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charAge, setCharAge] = useState(23);
  const [charVibe, setCharVibe] = useState('');
  const [charGreeting, setCharGreeting] = useState('');
  const [fictionalConfirmed, setFictionalConfirmed] = useState(false);
  const [uploadSourceKind, setUploadSourceKind] = useState<'fictional' | 'self' | null>(null);
  const [uploadedAdultMode, setUploadedAdultMode] = useState(false);
  const [customVoice, setCustomVoice] = useState<VoiceDesign>(DEFAULT_VOICE_DESIGN);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceResult, setReferenceResult] = useState<string | null>(null);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
  const [videoIsGenerative, setVideoIsGenerative] = useState(false);
  const [videoFormat, setVideoFormat] = useState<'mp4' | 'webm' | 'unknown'>('unknown');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const localEngine = useLocalEngineStatus();
  const [comfyCheckpoints, setComfyCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(() => getMediaSettings().comfyCheckpoint);

  // Closing the Studio or unmounting its route must stop client-side video work.
  useEffect(() => {
    if (!isOpen && !standalone) videoAbortRef.current?.abort();
  }, [isOpen, standalone]);
  useEffect(() => () => { videoAbortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!isOpen && !standalone) return;
    let active = true;
    void probeComfyUi().then((info) => {
      if (active && info.online) {
        setComfyCheckpoints(info.checkpoints);
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, standalone]);

  if (!isOpen && !standalone) return null;

  const companion = FLAGSHIP_COMPANIONS.find((c) => c.id === selectedId) ?? FLAGSHIP_COMPANIONS[0];
  const aspect = ASPECT_RATIOS.find((a) => a.id === aspectId) ?? ASPECT_RATIOS[0];

  async function handleGeneratePhoto() {
    const preset = SCENE_PRESETS.find((p) => p.id === sceneId) ?? SCENE_PRESETS[0];
    const prompt = [
      companion.visualDna,
      preset.suffix,
      studioStyle,
      cameraStyle,
      lightingStyle,
      wardrobeStyle,
      customPrompt.trim(),
      `aspect ${aspect.id}, photorealistic lighting, consenting adult 21+`,
    ]
      .filter(Boolean)
      .join(', ');
    const parsedSeed = Number(seedLock) || Math.floor(Math.random() * 90000 + 1000);
    const wantsNsfw = nsfwMode || preset.nsfw;
    const safeNegative = negativePrompt.trim().slice(0, 360);

    setPhotoBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      if (!wantsNsfw && !safeNegative) {
        const comfyInfo = await probeComfyUi();
        if (comfyInfo.online) {
          setComfyCheckpoints(comfyInfo.checkpoints);
          try {
            const t0 = performance.now();
            const activeCheckpoint = comfyInfo.checkpoints.includes(selectedCheckpoint)
              ? selectedCheckpoint : comfyInfo.checkpoints[0];
            const blobUrl = await generateComfySfwPortrait({
              prompt,
              checkpointName: activeCheckpoint,
              width: aspect.width,
              height: aspect.height,
              seed: parsedSeed,
            });
            const elapsedSec = Number(((performance.now() - t0) / 1000).toFixed(1));
            const engineLabel = `ComfyUI (${activeCheckpoint || 'Local :8188'})`;
            setGeneratedPhoto(blobUrl);
            setPhotoRevealed(true);
            setVideoSourceUrl(blobUrl);
            setEngineBadge(engineLabel);
            handleSaveToCollection(blobUrl, 'studio-photo');
            setStatusMsg(`Rendered via ${engineLabel} in ${elapsedSec}s (seed ${parsedSeed}) · Auto-saved to Photo Diary & Collection`);
            return;
          } catch {
            /* Fall back seamlessly to studio pipeline / Cloudflare Image Worker GET /generate */
          }
        }
      }

      const result = await generateStudioPicture({
        prompt,
        seed: parsedSeed,
        width: aspect.width,
        height: aspect.height,
        nsfw: wantsNsfw,
        characterId: companion.id,
        imageWorkerUrl,
        localEngine,
        negativePrompt,
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

  async function handleGenerateReferenceVariant() {
    if (!uploadedPreview || uploadSourceKind !== 'fictional' || !uploadRightsConfirmed) {
      setErrorMsg('This feature requires an original fictional adult image and confirmed usage rights.');
      return;
    }
    setReferenceBusy(true);
    setErrorMsg(null);
    setStatusMsg('Requesting a reference-aware variation from your configured image model...');
    try {
      const response = await generateFictionalReferenceVariation({
        referenceImage: uploadedPreview,
        prompt: customPrompt.trim() || charVibe.trim() || 'cinematic portrait with soft evening lighting',
        adultMode: uploadedAdultMode,
        sourceType: 'fictional',
      });
      setReferenceResult(response.imageUrl);
      setVideoSourceUrl(response.imageUrl);
      setStatusMsg(`New fictional portrait generated with ${response.engine}. You can animate it or use it as this companion’s avatar.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reference image generation failed.');
      setStatusMsg(null);
    } finally {
      setReferenceBusy(false);
    }
  }

  async function handleGenerateVideo() {
    if (videoAbortRef.current) return;
    const derivedFromUpload = Boolean(uploadedPreview && (
      videoSourceUrl === uploadedPreview ||
      (referenceResult && videoSourceUrl === referenceResult)
    ));
    if (derivedFromUpload && (!uploadSourceKind || !uploadRightsConfirmed)) {
      setErrorMsg('Choose the image source and confirm that you have permission to use it before animating.');
      return;
    }
    const controller = new AbortController();
    videoAbortRef.current = controller;
    setVideoBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await generateStudioVideoClip({
        imageUrl: videoSourceUrl,
        motionId,
        durationSec,
        speed: videoSpeed,
        // A real-person photograph may only be used for a neutral, nonsexual animation.
        prompt: derivedFromUpload && uploadSourceKind === 'self'
          ? 'Nonsexual portrait animation, subtle natural blink, gentle head turn, fully clothed, natural lighting'
          : `${companion.name} ${customPrompt}`,
        sourceType: derivedFromUpload
          ? uploadSourceKind === 'fictional' ? 'fictional' : 'real-person'
          : 'unspecified',
        adultMode: derivedFromUpload && uploadSourceKind === 'fictional' && uploadedAdultMode,
        comfyOnline: localEngine.comfyOnline,
        videoBackendUrl: videoBackendUrl || getMediaSettings().img2vidUrl,
        signal: controller.signal,
        onProgress: (stage) => { if (!controller.signal.aborted) setStatusMsg(stage); },
      });
      if (controller.signal.aborted) return;
      setGeneratedVideoUrl(res.videoUrl);
      setVideoEngineUsed(res.engine);
      setVideoIsGenerative(res.isGenerative);
      setVideoFormat(res.videoFormat);
      if (res.isGenerative) {
        setStatusMsg(`Generated ${durationSec}s via ${res.engine}.`);
      } else {
        setStatusMsg(`Created ${durationSec}s animated-still effect, not generative AI video.`);
        setErrorMsg(res.warning || 'Set up a compatible video backend to generate motion.');
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setErrorMsg(null);
        setStatusMsg('Video request canceled locally. A job already queued on your video server may continue using its GPU.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Video rendering failed.');
      }
    } finally {
      if (videoAbortRef.current === controller) {
        videoAbortRef.current = null;
        setVideoBusy(false);
      }
    }
  }

  async function downloadVideoClip() {
    if (!generatedVideoUrl || videoDownloading) return;
    setVideoDownloading(true);
    setErrorMsg(null);
    try {
      const blob = await fetchStudioVideoBlob(generatedVideoUrl);
      const extension = videoFormat === 'unknown'
        ? (blob.type.includes('mp4') ? 'mp4' : 'webm')
        : videoFormat;
      saveStudioVideoBlob(blob, `velvetmotion-short.${extension}`);
      setStatusMsg('Clip saved from your selected video provider.');
    } catch (error) {
      setErrorMsg((error instanceof Error ? error.message : 'Video download failed.') +
        ' If the model server blocks browser downloads, use Open clip and save the file directly.');
    } finally {
      setVideoDownloading(false);
    }
  }

  async function processFile(file: File) {
    setErrorMsg(null);
    setStatusMsg(null);
    const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    if (!isJson && !isImage) {
      setErrorMsg('Choose PNG, JPG, WebP, or a Character Card V2 JSON file.');
      return;
    }
    if (file.size > (isJson ? 1024 * 1024 : 12 * 1024 * 1024)) {
      setErrorMsg(isJson ? 'Character cards must be under 1 MB.' : 'Pictures must be under 12 MB.');
      return;
    }
    // Never attempt to decode JSON as a photograph.
    if (isJson) {
      const parsed = parseCardV2Json(await file.text());
      if (parsed.ok) {
        setCharName(parsed.character.name);
        setCharAge(parsed.character.age);
        setCharVibe(parsed.character.personality);
        setCharGreeting(parsed.character.initialMessage);
        setStatusMsg('Imported character card. Add a portrait to animate it.');
      } else {
        setErrorMsg(parsed.error);
      }
      return;
    }

    try {
      const webpData = await compressUploadToWebp(file);
      setUploadedPreview(webpData);
      setReferenceResult(null);
      setVideoSourceUrl(webpData);
      setUploadSourceKind(null);
      setUploadRightsConfirmed(false);
      setUploadedAdultMode(false);
      setFictionalConfirmed(false);
      setGeneratedVideoUrl(null);
      setStatusMsg('Portrait loaded locally. Confirm permission, then animate or create a fictional companion.');

      if (file.type === 'image/png') {
        const charaRaw = extractCharaFromPngBuffer(await file.arrayBuffer());
        if (charaRaw) {
          const parsed = parseCardV2Json(charaRaw, webpData);
          if (parsed.ok) {
            setCharName(parsed.character.name);
            setCharAge(parsed.character.age);
            setCharVibe(parsed.character.personality);
            setCharGreeting(parsed.character.initialMessage);
            setStatusMsg('Character Card V2 portrait imported; confirm the source before continuing.');
          } else {
            setErrorMsg(parsed.error);
          }
        }
      }
    } catch {
      setErrorMsg('Could not decode this image. Please try another PNG, JPG, or WebP.');
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
    if (!uploadedPreview || !charName.trim() || !fictionalConfirmed || !uploadRightsConfirmed || uploadSourceKind !== 'fictional') {
      setErrorMsg('Creating a companion from a portrait requires original fictional adult artwork and confirmation that you own or can use it. Real-person photos can only be used for nonsexual animations.');
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
      voiceId: customVoice.voiceId,
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
            voice: { label: created.voiceId, pitch: customVoice.pitch, rate: customVoice.rate, style: created.personality },
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
          ? 'mx-auto w-full max-w-6xl rounded-3xl neon-glass bg-[#0c0c16]/90 p-5 sm:p-6 text-[#f7f7fc] space-y-4'
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

          <div className="grid gap-2 rounded-2xl border border-[#e8b1c4]/20 bg-[#241923]/55 p-3 sm:grid-cols-3">
            <label className="text-[11px] text-zinc-300">Camera lens
              <select value={cameraStyle} onChange={(e) => setCameraStyle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-xs text-white">
                <option value="cinematic 85mm portrait lens">85mm portrait</option>
                <option value="editorial 35mm film still">35mm film</option>
                <option value="clean 50mm fashion photography">50mm fashion</option>
                <option value="wide 24mm environmental shot">24mm wide</option>
              </select>
            </label>
            <label className="text-[11px] text-zinc-300">Lighting direction
              <select value={lightingStyle} onChange={(e) => setLightingStyle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-xs text-white">
                <option value="warm rose-gold studio">Rose-gold studio</option>
                <option value="cinematic candlelight shadows">Candlelight</option>
                <option value="dramatic moonlit window">Moonlight</option>
                <option value="luxury softbox fashion lighting">Editorial softbox</option>
              </select>
            </label>
            <label className="text-[11px] text-zinc-300">Wardrobe
              <select value={wardrobeStyle} onChange={(e) => setWardrobeStyle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-xs text-white">
                <option value="elegant evening fashion">Evening fashion</option>
                <option value="silk robe, tasteful boudoir photography">Silk robe</option>
                <option value="luxury tailored couture">Tailored couture</option>
                <option value="cozy casual knitwear">Casual knitwear</option>
              </select>
            </label>
            <label className="block text-[11px] text-zinc-300 sm:col-span-3">
              Negative prompt (supported local engines)
              <input value={negativePrompt} maxLength={360} onChange={(e) => setNegativePrompt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#151019] p-2 text-xs text-white" />
            </label>
            <p className="text-[10px] leading-relaxed text-zinc-500 sm:col-span-3">
              A locked seed helps repeat conditions but does not guarantee identical faces. Facial reference adapters and compatible models are required for visual consistency.
              Negative prompts are passed to local engines that support them; cloud providers may ignore them.
            </p>
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

          {comfyCheckpoints.length > 0 && (
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/5 px-3 py-2">
              <label htmlFor="vm-comfy-checkpoint" className="block text-[10px] font-bold text-[#00ffa3] mb-1">
                Local ComfyUI detected — choose an installed checkpoint
              </label>
              <select id="vm-comfy-checkpoint" value={comfyCheckpoints.includes(selectedCheckpoint) ? selectedCheckpoint : comfyCheckpoints[0]}
                onChange={(event) => { setSelectedCheckpoint(event.target.value); saveMediaSettings({ comfyCheckpoint: event.target.value }); }}
                className="w-full rounded-lg bg-[#18101d] p-2 text-xs text-white border border-white/20">
                {comfyCheckpoints.map((checkpoint) => <option key={checkpoint} value={checkpoint}>{checkpoint}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-zinc-400">Model detected, not yet generation-tested.</p>
            </div>
          )}

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
            A connected AI video workflow creates new motion. Without one, the browser exports a pan/zoom animated still. Choose a portrait or upload one first.
          </p>

          <div>
            <label className="mb-1 block text-[11px] text-[#a6a6c4]">Source Image (Portrait or Generated Selfie)</label>
            <select
              value={videoSourceUrl}
              onChange={(e) => setVideoSourceUrl(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white outline-none focus:border-[#ff5678]"
            >
              {generatedPhoto && <option value={generatedPhoto}>Latest Studio Photo</option>}
              {uploadedPreview && <option value={uploadedPreview}>My uploaded portrait</option>}
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

          {uploadedPreview && (videoSourceUrl === uploadedPreview || videoSourceUrl === referenceResult) && (
            <div className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 text-[11px] text-zinc-200">
              <p className="font-semibold text-fuchsia-200">Uploaded portrait permissions</p>
              <p className="mt-1">Original fictional-adult artwork can use adult mode if your video model allows it. Your own real-life selfies can be animated nonsexually, never converted into intimate imagery.</p>
              <label className="mt-2 flex items-start gap-2">
                <input type="checkbox" checked={uploadRightsConfirmed} onChange={(e) => setUploadRightsConfirmed(e.target.checked)} />
                <span>I own or have permission to animate this image and all depicted people are adults.</span>
              </label>
            </div>
          )}
          {uploadedPreview && (videoSourceUrl === uploadedPreview || videoSourceUrl === referenceResult) && uploadSourceKind === 'fictional' && (
            <label className="flex items-center justify-between rounded-xl border border-fuchsia-300/20 bg-black/30 p-3 text-[11px] text-pink-100">
              <span>18+ mode for original fictional adult artwork
                <small className="mt-0.5 block text-zinc-400">Requires a compatible model; not a guarantee of content.</small>
              </span>
              <input type="checkbox" checked={uploadedAdultMode} onChange={(e) => setUploadedAdultMode(e.target.checked)} className="accent-[#dc789c]" />
            </label>
          )}
          <button
            type="button"
            disabled={videoBusy}
            onClick={() => void handleGenerateVideo()}
            className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {videoBusy ? `Processing ${durationSec}s clip...` : `Create ${durationSec}s Video · AI if connected`}
          </button>
          {videoBusy && (
            <button type="button"
              onClick={() => {
                videoAbortRef.current?.abort();
                setStatusMsg('Canceling this video request...');
              }}
              className="w-full rounded-full border border-rose-300/35 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/20">
              Cancel video request
            </button>
          )}
          {generatedVideoUrl && (
            <div className="space-y-2 pt-2 text-center">
              {videoEngineUsed && (
                <p className="text-[10px] font-bold text-[#00f5ff]">
                  {videoIsGenerative ? 'AI-generated motion' : 'Animated still'} · {videoEngineUsed}
                </p>
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
                  onClick={() => {
                    if (!generatedVideoUrl) return;
                    if (generatedVideoUrl.startsWith('blob:')) {
                      setErrorMsg('This is a temporary video URL. Download the clip to keep it; permanent video storage is not connected yet.');
                      return;
                    }
                    handleSaveToCollection(generatedVideoUrl, 'video');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ff5678]/45 bg-[#2a1820] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save to Shorts / Collection
                </button>
                <button type="button" disabled={videoDownloading}
                  onClick={() => void downloadVideoClip()}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  <Download className="h-3.5 w-3.5" /> {videoDownloading ? 'Downloading…' : 'Download clip'}
                </button>
                <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300">
                  Open clip
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
          {uploadedPreview && (
            <div className="rounded-2xl border border-pink-400/25 bg-pink-400/10 p-3 space-y-3">
              <p className="font-bold text-pink-200">Use this portrait</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-start gap-2 text-zinc-200">
                  <input type="radio" checked={uploadSourceKind === 'fictional'} onChange={() => { setUploadSourceKind('fictional'); setUploadedAdultMode(false); }} name="studio-photo-source" />
                  <span>Original fictional adult / AI-created character</span>
                </label>
                <label className="flex items-start gap-2 text-zinc-200">
                  <input type="radio" checked={uploadSourceKind === 'self'} onChange={() => { setUploadSourceKind('self'); setUploadedAdultMode(false); }} name="studio-photo-source" />
                  <span>My own adult selfie (nonsexual animation only)</span>
                </label>
              </div>
              <label className="flex items-start gap-2 text-zinc-200">
                <input type="checkbox" checked={uploadRightsConfirmed} onChange={(e) => setUploadRightsConfirmed(e.target.checked)} />
                <span>I own or have rights to use this image, and every depicted person is an adult. Selfies must show me, not someone else.</span>
              </label>
              {uploadSourceKind === 'fictional' && (
                <label className="flex items-center justify-between gap-3 rounded-xl border border-pink-300/25 bg-black/25 p-3">
                  <span>
                    <strong className="block text-xs text-pink-200">18+ fictional fantasy mode</strong>
                    <span className="mt-0.5 block text-[10px] text-zinc-400">
                      Pass an adult-mode request to a compatible configured video model. Only original fictional adults qualify.
                    </span>
                  </span>
                  <input type="checkbox" checked={uploadedAdultMode} onChange={(e) => setUploadedAdultMode(e.target.checked)} className="h-4 w-4 accent-[#dc789c]" />
                </label>
              )}
              {uploadSourceKind === 'fictional' && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                  <label className="block text-[11px] text-zinc-300">
                    Change the setting, outfit, composition, or mood
                    <textarea
                      rows={2}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="For example: cinematic portrait, satin evening dress, warm lantern glow"
                      className="mt-1 w-full rounded-xl border border-white/15 bg-[#0b0910] px-3 py-2 text-xs text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!uploadRightsConfirmed || referenceBusy}
                    onClick={() => void handleGenerateReferenceVariant()}
                    className="w-full rounded-full border border-[#e8b9ba]/40 bg-[#ad4969]/25 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {referenceBusy ? 'Generating with reference model...' : 'Generate new fictional portrait'}
                  </button>
                  <p className="text-[10px] text-zinc-500">
                    Requires an img2img endpoint in Advanced Media or compatible local ComfyUI reference nodes. Your original source image is sent only to that chosen provider when you click Generate.
                  </p>
                  {referenceResult && (
                    <div className="space-y-2">
                      <SafeImage src={referenceResult} alt="New fictional portrait from your selected model" className="mx-auto h-52 w-40 rounded-xl object-cover" />
                      <div className="flex flex-wrap gap-2">
                        <button type="button"
                          onClick={() => {
                            setUploadedPreview(referenceResult);
                            setVideoSourceUrl(referenceResult);
                            setReferenceResult(null);
                            setStatusMsg('Generated image selected as the fictional companion portrait.');
                          }}
                          className="rounded-full border border-pink-300/40 px-3 py-2 text-xs font-semibold text-pink-100">
                          Use as companion portrait
                        </button>
                        <button type="button" onClick={() => { setVideoSourceUrl(referenceResult); setTab('video'); }}
                          className="rounded-full border border-white/25 px-3 py-2 text-xs text-white">
                          Animate generated image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!uploadSourceKind || !uploadRightsConfirmed}
                onClick={() => { setVideoSourceUrl(uploadedPreview); setTab('video'); }}
                className="rounded-full border border-[#ff5678]/50 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <Film className="inline-block h-3.5 w-3.5 mr-1" /> Animate this photo
              </button>
              <p className="text-[10px] text-zinc-400">Video is only generated when a compatible video model is connected. Your upload stays in this browser unless you save a companion or submit it to a configured AI provider.</p>
            </div>
          )}
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

          {uploadedPreview && uploadSourceKind === 'fictional' && (
            <VoiceDesigner value={customVoice} onChange={setCustomVoice} compact
              sample={charGreeting.trim() || `Hi! I'm ${charName.trim() || "your companion"}. It's lovely to meet you.`} />
          )}

          <label className="flex items-start gap-2 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={fictionalConfirmed}
              onChange={(e) => setFictionalConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#ff1e8e]"
            />
            <span>I confirm this is an original fictional adult (18+) character. Real-person photos cannot be converted into sexualized AI companions.</span>
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

      {standalone && (
        <div className="mt-8 border-t border-white/10 pt-8">
          <AtelierStoryboard />
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
