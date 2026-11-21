"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Download,
  Heart,
  ImagePlus,
  MessageCircle,
  Mic2,
  Palette,
  Sparkles,
  Upload,
} from "lucide-react";
import type { Character } from "@/lib/characters";
import {
  COMPANION_LIBRARY_EVENT,
  loadFavoriteCompanions,
  saveCompanionCustomization,
  toggleFavoriteCompanion,
} from "@/lib/companionLibrary";
import { createLocalCompanionPortrait } from "@/lib/companionPortrait";
import { discoveryFor, VISUAL_STYLES } from "@/lib/companionDiscovery";
import {
  compactCardPortrait,
  safeCompanionAvatarUrl,
} from "@/lib/avatarOptimize";
import { staticPortraitUrl } from "@/lib/portraitFallback";
import { getIntimacy, loadChat } from "@/lib/storage";
import { stageFromIntimacy } from "@/lib/relationship";
import { loadLorebook } from "@/lib/lorebook";
import { exportCharacterCard } from "@/lib/characterCardExport";
import { speakWithNeuralVoice, stopNeuralSpeech } from "@/lib/kokoroTts";
import { MemoryVaultPanel } from "@/components/MemoryVaultDrawer";
import KinkStatusPanel from "@/components/KinkStatusPanel";
import { SafeImage } from "@/components/SafeImage";

interface CharacterProfileProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
  onChat: () => void;
  onTag: (tag: string) => void;
  onUpdate: (character: Character) => void;
  onStudio: () => void;
}

export function CharacterProfile({
  character,
  romanceMode,
  onBack,
  onChat,
  onTag,
  onUpdate,
  onStudio,
}: CharacterProfileProps) {
  const [draft, setDraft] = useState<Character>(character);
  const [tab, setTab] = useState<"story" | "customize" | "memory">("story");
  const [favorite, setFavorite] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [intimacy, setIntimacy] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loreCount, setLoreCount] = useState(0);
  const voiceRequest = useRef(0);
  const mounted = useRef(true);
  const meta = discoveryFor(character);
  const portrait =
    safeCompanionAvatarUrl(character.avatar) || staticPortraitUrl(character.id);

  useEffect(() => {
    const refresh = () =>
      setFavorite(loadFavoriteCompanions().includes(character.id));
    mounted.current = true;
    refresh();
    // A relationship starts at zero until the first conversation, regardless of catalogue flavor values.
    const messages = loadChat(character.id);
    setMessageCount(messages.length);
    setIntimacy(
      messages.length ? getIntimacy(character.id, character.intimacy) : 0,
    );
    setLoreCount(loadLorebook(character.id).length);
    window.addEventListener(COMPANION_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      mounted.current = false;
      voiceRequest.current++;
      stopNeuralSpeech();
      window.removeEventListener(COMPANION_LIBRARY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [character.id, character.intimacy]);

  const save = () => {
    setError("");
    setNotice("");
    try {
      const next = {
        ...draft,
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
      };
      if (!next.name || !next.personality.trim())
        throw new Error("Name and personality are required.");
      saveCompanionCustomization(next);
      onUpdate(next);
      setNotice(
        "Profile saved. Your conversations and memories are still connected.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The profile could not be saved.",
      );
    }
  };

  const replacePortrait = async (file: File) => {
    setError("");
    setNotice("");
    setPortraitBusy(true);
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10_000_000)
        throw new Error(
          "Choose a PNG, JPEG or WebP under 10 MB that you have permission to use.",
        );
      const avatar = await compactCardPortrait(file);
      if (!mounted.current) return;
      setDraft((previous) => ({ ...previous, avatar }));
      setNotice(
        "Portrait prepared. Save your profile to use it throughout the app.",
      );
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "The portrait could not be read.",
        );
    } finally {
      if (mounted.current) setPortraitBusy(false);
    }
  };

  const generatePortrait = async () => {
    setError("");
    setNotice("");
    setPortraitBusy(true);
    try {
      const result = await createLocalCompanionPortrait(draft);
      if (!mounted.current) return;
      setDraft((previous) => ({ ...previous, avatar: result.avatar }));
      setNotice(
        `Portrait generated via ${result.engine}. Save your profile to keep it.`,
      );
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "No portrait was generated.");
    } finally {
      if (mounted.current) setPortraitBusy(false);
    }
  };

  const previewVoice = async () => {
    if (voiceBusy) {
      voiceRequest.current++;
      stopNeuralSpeech();
      setVoiceBusy(false);
      return;
    }
    const request = ++voiceRequest.current;
    setVoiceBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await speakWithNeuralVoice(character.voiceIntro, {
        voiceId: character.voiceId,
        ...character.voice,
      });
      if (mounted.current && voiceRequest.current === request)
        setNotice(`Voice preview: ${result.label}.`);
    } catch {
      if (mounted.current && voiceRequest.current === request)
        setError("Voice preview is unavailable on this device.");
    } finally {
      if (mounted.current && voiceRequest.current === request)
        setVoiceBusy(false);
    }
  };

  const download = (version: "v2" | "v3") => {
    try {
      const card = exportCharacterCard(
        character,
        version,
        loadLorebook(character.id),
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(card, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${character.name.replace(/[^a-z0-9_-]/gi, "-")}-${version}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        `Character card ${version.toUpperCase()} exported with its lorebook. Personal chat memories are excluded.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not export this character.",
      );
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-16">
      <button type="button" onClick={onBack} className="vm-text-button">
        <ArrowLeft className="h-4 w-4" /> All companions
      </button>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(260px,.8fr)_1.2fr] lg:gap-10">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#201727]">
            <SafeImage
              src={portrait}
              fallbackId={character.id}
              alt={`Portrait of ${character.name}`}
              className="aspect-[4/5] w-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#110c17] to-transparent" />
            <div className="absolute bottom-5 left-5">
              <p className="vm-eyebrow">Fictional adult · {character.age}</p>
              <p className="mt-2 text-sm text-white/80">
                {meta.visualStyle === "Unspecified"
                  ? "Character portrait"
                  : `${meta.visualStyle} portrait`}
              </p>
            </div>
            <button
              type="button"
              aria-label={
                favorite ? "Remove from favorites" : "Save to favorites"
              }
              aria-pressed={favorite}
              onClick={() => {
                try {
                  setFavorite(
                    toggleFavoriteCompanion(character.id).includes(
                      character.id,
                    ),
                  );
                } catch {
                  setError(
                    "Favorites could not be saved. Browser storage may be unavailable.",
                  );
                }
              }}
              className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/50 p-3 text-white backdrop-blur"
            >
              <Heart
                className={
                  "h-5 w-5 " + (favorite ? "fill-pink-300 text-pink-300" : "")
                }
              />
            </button>
          </div>
          <button
            type="button"
            onClick={onChat}
            className="neon-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm"
          >
            <MessageCircle className="h-4 w-4" /> Start a conversation{" "}
            <ArrowUpRight className="ml-auto h-4 w-4" />
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void previewVoice()}
              className="vm-secondary-button"
            >
              <Mic2 className="h-4 w-4" />{" "}
              {voiceBusy ? "Stop preview" : "Preview voice"}
            </button>
            <button
              type="button"
              onClick={onStudio}
              className="vm-secondary-button"
            >
              <Palette className="h-4 w-4" /> Open Studio
            </button>
          </div>
          <p className="px-1 text-xs leading-6 text-[#a99bb3]">
            Chat and generated media use your connected model. Voice can fall
            back to your device’s speech engine.
          </p>
        </aside>

        <div className="min-w-0 space-y-6 pt-1">
          <header>
            <p className="vm-eyebrow">
              <Sparkles className="h-3.5 w-3.5" /> {character.category}
              {romanceMode ? " / Romance mode" : ""}
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {character.name}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#c8bbd0]">
              {character.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {character.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-xs text-[#d3bfdc]"
                >
                  {trait}
                </span>
              ))}
            </div>
          </header>
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-[#1b1422] py-5 text-center">
            <div>
              <p className="text-sm text-[#eadcf2]">
                {stageFromIntimacy(intimacy).label}
              </p>
              <p className="mt-1 text-[11px] text-[#a99bb3]">
                Story progression
              </p>
            </div>
            <div>
              <p className="text-sm text-[#eadcf2]">{messageCount}</p>
              <p className="mt-1 text-[11px] text-[#a99bb3]">Saved messages</p>
            </div>
            <div>
              <p className="text-sm text-[#eadcf2]">{loreCount}</p>
              <p className="mt-1 text-[11px] text-[#a99bb3]">Lore entries</p>
            </div>
          </div>
          <div
            role="group"
            aria-label="Profile sections"
            className="flex gap-2 border-b border-white/10 pb-3"
          >
            {(
              [
                ["story", "Their story"],
                ["customize", "Make it yours"],
                ["memory", "Memory"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={
                  "vm-filter-chip " + (tab === value ? "vm-filter-active" : "")
                }
              >
                {label}
              </button>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm leading-6 text-amber-200"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border border-violet-300/20 bg-violet-300/5 p-3 text-sm leading-6 text-[#ddc5e9]"
            >
              <Check className="mt-1 h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}
          {tab === "story" && (
            <div className="space-y-7">
              <section>
                <h2 className="font-display text-2xl">A world of their own</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#bfb1c9]">
                  {character.background}
                </p>
              </section>
              <section>
                <h2 className="font-display text-2xl">
                  The way they see things
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#bfb1c9]">
                  {character.personality}
                </p>
              </section>
              <KinkStatusPanel
                companionId={character.id}
                bullName={character.kinkDoctrine?.bullName}
                defaultStatus={character.kinkDoctrine?.status}
                defaultSphTier={character.kinkDoctrine?.sphTier}
              />
              {!!meta.interests.length && (
                <section>
                  <p className="vm-eyebrow">Common ground</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meta.interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-lg bg-[#ad82c5]/10 px-3 py-2 text-xs text-[#d7b7e7]"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              <section className="rounded-2xl border border-[#c8a1d7]/15 bg-gradient-to-br from-[#30203d]/60 to-[#17121f] p-6">
                <p className="vm-eyebrow">Your first moment</p>
                <blockquote className="mt-4 whitespace-pre-wrap font-display text-lg leading-8 text-[#e1d1e9]">
                  {character.initialMessage}
                </blockquote>
              </section>
              <section>
                <p className="vm-eyebrow">Explore similar personalities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {character.tags
                    .filter((tag) => tag !== "NEW")
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onTag(tag)}
                        className="vm-filter-chip"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </section>
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <span className="mr-auto text-xs text-[#a99bb3]">
                  Take this character with you
                </span>
                <button
                  type="button"
                  onClick={() => download("v2")}
                  className="vm-text-button"
                >
                  <Download className="h-4 w-4" /> V2 JSON
                </button>
                <button
                  type="button"
                  onClick={() => download("v3")}
                  className="vm-text-button"
                >
                  <Download className="h-4 w-4" /> V3 JSON
                </button>
              </div>
            </div>
          )}
          {tab === "customize" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-5"
            >
              <p className="text-sm leading-6 text-[#bfb1c9]">
                Shape this fictional adult’s personality and portrait. Changes
                save on this device and apply to future conversations. Signed-in
                cloud backup may also sync your profile. Existing messages are
                kept.
              </p>
              <label className="vm-field-label">
                Name
                <input
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="vm-field py-3 text-sm"
                />
              </label>
              <label className="vm-field-label">
                Introduction
                <input
                  maxLength={140}
                  value={draft.tagline}
                  onChange={(e) =>
                    setDraft({ ...draft, tagline: e.target.value })
                  }
                  className="vm-field py-3 text-sm"
                />
              </label>
              <label className="vm-field-label">
                Personality
                <textarea
                  required
                  rows={5}
                  maxLength={3000}
                  value={draft.personality}
                  onChange={(e) =>
                    setDraft({ ...draft, personality: e.target.value })
                  }
                  className="vm-field py-3 text-sm leading-6"
                />
              </label>
              <label className="vm-field-label">
                Opening message
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={draft.initialMessage}
                  onChange={(e) =>
                    setDraft({ ...draft, initialMessage: e.target.value })
                  }
                  className="vm-field py-3 text-sm leading-6"
                />
              </label>
              <label className="vm-field-label">
                Appearance direction
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={draft.figure}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      figure: e.target.value,
                      visualDna: e.target.value,
                    })
                  }
                  className="vm-field py-3 text-sm leading-6"
                />
              </label>
              <div className="rounded-2xl border border-white/10 p-4">
                <p className="flex items-center gap-2 text-sm">
                  <ImagePlus className="h-4 w-4 text-[#d4b2dc]" /> Portrait
                </p>
                <p className="mt-2 text-xs leading-6 text-[#a99bb3]">
                  Upload fictional character artwork you have permission to use,
                  or open Studio to generate a portrait. A seed alone cannot
                  guarantee consistent identity.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="vm-secondary-button cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {portraitBusy ? "Preparing…" : "Choose portrait"}
                    <input
                      aria-label="Choose character portrait"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={portraitBusy}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void replacePortrait(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={portraitBusy}
                    onClick={() => void generatePortrait()}
                    className="vm-secondary-button"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate locally
                  </button>
                  {draft.avatar !== character.avatar && (
                    <SafeImage
                      src={draft.avatar}
                      alt="New portrait preview"
                      className="h-16 w-14 rounded-lg object-cover"
                    />
                  )}
                </div>
              </div>
              <label className="vm-field-label">
                Portrait style
                <select
                  value={discoveryFor(draft).visualStyle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      discovery: {
                        ...discoveryFor(draft),
                        visualStyle: e.target
                          .value as (typeof VISUAL_STYLES)[number],
                      },
                    })
                  }
                  className="vm-field py-3 text-sm"
                >
                  {VISUAL_STYLES.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={portraitBusy}
                className="neon-btn-primary flex items-center gap-2 rounded-xl px-5 py-3 text-sm disabled:opacity-50"
              >
                <Bookmark className="h-4 w-4" /> Save profile
              </button>
            </form>
          )}
          {tab === "memory" && (
            <MemoryVaultPanel
              characterId={character.id}
              characterName={character.name}
            />
          )}
        </div>
      </div>
    </main>
  );
}
