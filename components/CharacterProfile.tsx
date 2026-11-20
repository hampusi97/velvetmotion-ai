"use client";

import { useEffect, useState } from "react";
import { HardDrive, Mail, Video, CheckCircle2, AlertTriangle, ImageIcon, Sparkles } from "lucide-react";
import type { Character } from "@/lib/characters";
import { characterPortraitUrl } from "@/lib/portraits";
import { characterGallery, characterMediaUrl, resolveBestMediaUrl, resolveCharacterAvatar, type MediaMood } from "@/lib/media";
import { speak } from "@/lib/speech";
import { auth, getAccessToken, googleSignIn } from "@/lib/firebase";

interface CharacterProfileProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
  onChat: () => void;
  onTag: (tag: string) => void;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function CharacterProfile({
  character,
  romanceMode,
  onBack,
  onChat,
  onTag,
}: CharacterProfileProps) {
  const [wsBusy, setWsBusy] = useState(false);
  const [wsNotice, setWsNotice] = useState<string | null>(null);
  const [wsModal, setWsModal] = useState<null | "drive" | "gmail">(null);
  const [gmailTo, setGmailTo] = useState("");
  const [bondageLevel, setBondageLevel] = useState(character.kinkSettings?.bondageLevel ?? 50);
  const [intensityFactor, setIntensityFactor] = useState(character.kinkSettings?.intensityFactor ?? 8);
  const [preferredActs, setPreferredActs] = useState<string[]>(
    character.kinkSettings?.preferredActs ?? [character.kink || "Sensual worship"]
  );
  const [newActInput, setNewActInput] = useState("");
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [renderedGallery, setRenderedGallery] = useState<Record<string, string>>({});
  const [renderingMood, setRenderingMood] = useState<MediaMood | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const gallery = characterGallery(character);
  const portraitSrc = resolveCharacterAvatar(character);
  const selectedGalleryMood = gallery[activeGalleryIndex]?.mood;
  const heroSrc = (selectedGalleryMood && renderedGallery[`${character.id}:${selectedGalleryMood}`]) || portraitSrc;

  useEffect(() => {
    setActiveGalleryIndex(0);
    setLightbox(null);
    setGalleryError(null);
  }, [character.id]);

  const generateGalleryImage = async (mood: MediaMood, index: number) => {
    if (renderingMood) return;
    setActiveGalleryIndex(index);
    setGalleryError(null);
    const key = `${character.id}:${mood}`;
    if (renderedGallery[key]) {
      setLightbox(renderedGallery[key]);
      return;
    }
    setRenderingMood(mood);
    try {
      const result = await resolveBestMediaUrl(character, mood);
      if (result.isFallback || !result.url) {
        throw new Error(result.error || result.note || "No compatible image model responded.");
      }
      setRenderedGallery((prev) => ({ ...prev, [key]: result.url }));
      setLightbox(result.url);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setRenderingMood(null);
    }
  };

  const ensureToken = async (): Promise<string | null> => {
    const existing = await getAccessToken();
    if (existing) return existing;
    try {
      const res = await googleSignIn();
      return res?.accessToken || null;
    } catch {
      setWsNotice("Sign in with Google to use Meet, Drive, or Gmail actions.");
      return null;
    }
  };

  const handleCreateMeet = async () => {
    setWsBusy(true);
    setWsNotice(null);
    try {
      const token = await ensureToken();
      if (!token) return;
      const res = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create Meet space.");
      const uri = data.meetingUri || `https://meet.google.com/${data.meetingCode || ""}`;
      setWsNotice(`Private Google Meet room created for ${character.name}: ${uri}`);
    } catch (err) {
      setWsNotice(err instanceof Error ? err.message : "Could not create Meet space.");
    } finally {
      setWsBusy(false);
    }
  };

  const handleSaveDossierToDrive = async () => {
    setWsBusy(true);
    setWsNotice(null);
    try {
      const token = await ensureToken();
      if (!token) {
        setWsModal(null);
        return;
      }
      const fileName = `VelvetMotion-${character.name.replace(/\s+/g, "-")}-Dossier.json`;
      const metadata = { name: fileName, mimeType: "application/json" };
      const boundary = "-------velvetmotion_profile_boundary";
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(character, null, 2)}\r\n` +
        `--${boundary}--`;

      const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Drive upload failed.");
      setWsNotice(`Saved \"${fileName}\" to your Google Drive.`);
      setWsModal(null);
    } catch (err) {
      setWsNotice(err instanceof Error ? err.message : "Could not upload dossier to Drive.");
      setWsModal(null);
    } finally {
      setWsBusy(false);
    }
  };

  const handleSendIntroEmail = async () => {
    const recipient = gmailTo.trim() || auth.currentUser?.email || "";
    if (!recipient) {
      setWsNotice("Enter a recipient email address.");
      return;
    }
    setWsBusy(true);
    setWsNotice(null);
    try {
      const token = await ensureToken();
      if (!token) {
        setWsModal(null);
        return;
      }
      const subject = `${character.name} — VelvetMotion AI Companion`;
      const body = `${character.name} (${character.age}, ${character.category})\n\"${character.tagline}\"\n\nOpening message:\n${character.initialMessage}`;
      const mime = [
        `To: ${recipient}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        body,
      ].join("\r\n");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: toBase64Url(mime) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gmail send failed.");
      setWsNotice(`Sent ${character.name}'s intro note to ${recipient}.`);
      setWsModal(null);
    } catch (err) {
      setWsNotice(err instanceof Error ? err.message : "Could not send Gmail note.");
      setWsModal(null);
    } finally {
      setWsBusy(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-pink-400 text-sm">
        ← Back to list
      </button>

      {/* Main hero portrait */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroSrc}
        alt={`${character.name} portrait`}
        className="mt-4 w-full max-w-md h-[28rem] object-cover rounded-2xl bg-zinc-900 border border-white/10 cursor-pointer"
        onClick={() => setLightbox(heroSrc)}
      />

      {/* NSFW Gallery strip */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-4 w-4 text-pink-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-300">
            Private Gallery
          </span>
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {gallery.map((item, idx) => (
            <button
              key={item.mood}
              type="button"
              onClick={() => void generateGalleryImage(item.mood, idx)}
              className={`relative shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 transition ${
                activeGalleryIndex === idx
                  ? "border-pink-500 ring-2 ring-pink-500/40"
                  : "border-white/10 hover:border-pink-500/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedGallery[`${character.id}:${item.mood}`] || portraitSrc}
                alt={item.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center py-0.5 text-pink-200">
                {renderingMood === item.mood
                  ? "Generating..."
                  : renderedGallery[`${character.id}:${item.mood}`]
                    ? item.label
                    : `Generate ${item.label}`}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Tap a category to generate a new image. Until it renders, thumbnails show the original portrait. Consistent identity requires a reference-aware model, not just a seed.
        </p>
        {galleryError && (
          <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="alert">
            Image unavailable: {galleryError}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold">{character.name}</h2>
        <span className="text-pink-300 text-sm">Age {character.age}</span>
      </div>
      <p className="text-xs uppercase tracking-wide text-zinc-500 mt-1">
        {character.category}
        {romanceMode ? " · Romance mode" : ""}
      </p>
      <p className="text-zinc-300 mt-3">{character.tagline}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        {character.tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTag(tag)}
            className="px-2 py-1 rounded-full text-xs bg-zinc-900 border border-zinc-800 text-zinc-300"
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Closeness</span>
          <span>{character.intimacy}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-pink-500"
            style={{ width: `${character.intimacy}%` }}
          />
        </div>
      </div>

      {/* Quick generate buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["lingerie", "nude", "explicit", "sex"] as const).map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => {
              const idx = gallery.findIndex((g) => g.mood === mood);
              if (idx >= 0) void generateGalleryImage(mood, idx);
            }}
            disabled={renderingMood !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-pink-500/40 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 capitalize disabled:opacity-50"
          >
            {mood === "sex" ? "Sex Pose" : mood}
          </button>
        ))}
      </div>

      {/* Direct Companion Private Suite Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-3 text-xs">
        <span className="text-zinc-400 font-medium mr-1">Private Suite:</span>
        <button
          type="button"
          disabled={wsBusy}
          onClick={() => void handleCreateMeet()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-200 hover:border-pink-500/40"
        >
          <Video className="h-3.5 w-3.5 text-pink-400" />
          Private Video Room
        </button>
        <button
          type="button"
          disabled={wsBusy}
          onClick={() => setWsModal("drive")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-200 hover:border-pink-500/40"
        >
          <HardDrive className="h-3.5 w-3.5 text-fuchsia-400" />
          Cloud Dossier Backup
        </button>
        <button
          type="button"
          disabled={wsBusy}
          onClick={() => {
            setGmailTo(auth.currentUser?.email || "");
            setWsModal("gmail");
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-zinc-200 hover:border-pink-500/40"
        >
          <Mail className="h-3.5 w-3.5 text-amber-300" />
          Send Midnight Note
        </button>
      </div>

      {wsNotice && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-xs text-pink-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-pink-400" />
            <span className="break-all">{wsNotice}</span>
          </div>
          <button type="button" onClick={() => setWsNotice(null)} className="text-zinc-400">
            ✕
          </button>
        </div>
      )}

      <section className="mt-6 space-y-4 text-sm">
        <div>
          <h3 className="text-pink-400 font-medium mb-1">Personality</h3>
          <p className="text-zinc-300">{character.personality}</p>
          <p className="text-zinc-400 mt-2">{character.traits.join(" · ")}</p>
        </div>
        <div>
          <h3 className="text-pink-400 font-medium mb-1">Background</h3>
          <p className="text-zinc-300">{character.background}</p>
        </div>
        <div>
          <h3 className="text-pink-400 font-medium mb-1">Figure</h3>
          <p className="text-zinc-300">{character.figure}</p>
        </div>
        <div>
          <h3 className="text-pink-400 font-medium mb-1">Voice</h3>
          <p className="text-zinc-300">{character.voice.style}</p>
          <p className="text-zinc-500 mt-1 text-xs">
            {character.voice.label} · pitch {character.voice.pitch} · rate {character.voice.rate}
          </p>
          <button
            onClick={() => speak(character.voiceIntro, character.voice)}
            className="mt-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs"
          >
            Speak
          </button>
        </div>
        <div>
          <h3 className="text-pink-400 font-medium mb-1">Focus</h3>
          <p className="text-zinc-300">{character.kink}</p>
        </div>

        {/* Kink & Fantasy Fine-Tuning Panel */}
        <div className="rounded-2xl border border-pink-500/30 bg-zinc-950/80 p-4 space-y-3.5">
          <h3 className="text-pink-300 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
            🔥 Kink & Fantasy Fine-Tuning
          </h3>
          <p className="text-[11px] text-zinc-400">
            Fine-tune restraint levels, intensity, and preferred acts to adapt her personality and NSFW prompt generator.
          </p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Bondage & Restraint Level</span>
              <span className="text-pink-300 font-mono">{bondageLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bondageLevel}
              onChange={(e) => {
                const val = Number(e.target.value);
                setBondageLevel(val);
                if (!character.kinkSettings) {
                  character.kinkSettings = { bondageLevel: val, intensityFactor: 8, preferredActs: [character.kink] };
                } else {
                  character.kinkSettings.bondageLevel = val;
                }
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Intensity Factor</span>
              <span className="text-fuchsia-300 font-mono">{intensityFactor}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensityFactor}
              onChange={(e) => {
                const val = Number(e.target.value);
                setIntensityFactor(val);
                if (!character.kinkSettings) {
                  character.kinkSettings = { bondageLevel: 50, intensityFactor: val, preferredActs: [character.kink] };
                } else {
                  character.kinkSettings.intensityFactor = val;
                }
              }}
              className="w-full accent-fuchsia-500 cursor-pointer"
            />
          </div>

          <div>
            <span className="text-xs text-zinc-400 block mb-1.5">Preferred Acts & Desires</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {preferredActs.map((act) => (
                <span
                  key={act}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-pink-500/40 bg-pink-500/15 text-pink-200"
                >
                  {act}
                  <button
                    type="button"
                    onClick={() => {
                      const next = preferredActs.filter((a) => a !== act);
                      setPreferredActs(next);
                      if (character.kinkSettings) character.kinkSettings.preferredActs = next;
                    }}
                    className="text-pink-300 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom act (e.g. edging, silk ropes)…"
                value={newActInput}
                onChange={(e) => setNewActInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newActInput.trim()) {
                    e.preventDefault();
                    const next = [...preferredActs, newActInput.trim()];
                    setPreferredActs(next);
                    setNewActInput("");
                    if (!character.kinkSettings) {
                      character.kinkSettings = { bondageLevel, intensityFactor, preferredActs: next };
                    } else {
                      character.kinkSettings.preferredActs = next;
                    }
                  }
                }}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (newActInput.trim()) {
                    const next = [...preferredActs, newActInput.trim()];
                    setPreferredActs(next);
                    setNewActInput("");
                    if (!character.kinkSettings) {
                      character.kinkSettings = { bondageLevel, intensityFactor, preferredActs: next };
                    } else {
                      character.kinkSettings.preferredActs = next;
                    }
                  }
                }}
                className="rounded-xl bg-pink-600 px-3 py-1.5 text-xs text-white font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-pink-400 font-medium mb-1">Opening line</h3>
          <p className="text-zinc-300 whitespace-pre-wrap">{character.initialMessage}</p>
        </div>
      </section>

      <button
        onClick={onChat}
        className="mt-6 w-full py-3 rounded-2xl bg-pink-600 font-medium hover:bg-pink-500"
      >
        Chat with {character.name.split(" ")[0]}
      </button>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}

      {wsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setWsModal(null)} />
          <div className="relative w-full max-w-md rounded-3xl border border-pink-500/30 bg-zinc-950 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-lg font-semibold text-white">
                {wsModal === "drive"
                  ? `Save ${character.name}'s Dossier to Google Drive?`
                  : `Send ${character.name}'s Intro via Gmail?`}
              </h3>
            </div>
            {wsModal === "drive" ? (
              <p className="text-xs text-zinc-300 leading-relaxed">
                This will create{" "}
                <strong className="text-pink-300">
                  VelvetMotion-{character.name.replace(/\s+/g, "-")}-Dossier.json
                </strong>{" "}
                in your Google Drive.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Send {character.name}&apos;s character profile and opening line to your inbox via Gmail.
                </p>
                <input
                  type="email"
                  aria-label="Recipient email for companion intro"
                  placeholder="Recipient email…"
                  value={gmailTo}
                  onChange={(e) => setGmailTo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWsModal(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wsBusy}
                onClick={() =>
                  void (wsModal === "drive" ? handleSaveDossierToDrive() : handleSendIntroEmail())
                }
                className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-medium text-white"
              >
                {wsBusy ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
