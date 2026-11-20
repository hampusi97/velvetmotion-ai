"use client";

import { useState } from "react";
import type { Character } from "@/lib/charactersTypes";
import {
  loadImportedCharacters,
  parseSillyTavernCard,
  saveImportedCharacter,
} from "@/lib/sillyTavernImport";
import { parseCharacterCardFile } from "@/lib/pngCardDecode";
import { compactCardPortrait, rasterizeStarterIllustration } from "@/lib/avatarOptimize";
import { loadLorebook, parseCharacterLorebook, saveLorebook } from "@/lib/lorebook";
import { createLocalCompanionPortrait } from "@/lib/companionPortrait";
import { ORIGINAL_STARTER_COMPANIONS } from "@/lib/originalStarterCompanions";

export function CardImport({
  onHome,
  onOpen,
}: {
  onHome: () => void;
  onOpen: (c: Character) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [portraitBusyId, setPortraitBusyId] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [list, setList] = useState<Character[]>(() =>
    typeof window !== "undefined" ? loadImportedCharacters() : [],
  );

  const addStarter = async (character: Character) => {
    setError(null);
    setOk(null);
    let avatar: string;
    try {
      avatar = await rasterizeStarterIllustration(character.avatar);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not prepare the new companion illustration.");
      return;
    }
    if (!saveImportedCharacter({ ...character, avatar })) {
      setError("Could not add the companion. Browser storage is full or disabled.");
      return;
    }
    setList(loadImportedCharacters());
    setOk(`Added ${character.name} to your imported library. Original illustrated avatar is a placeholder; generate or import a portrait later.`);
  };

  const generateStarterPortrait = async (character: Character) => {
    if (portraitBusyId) return;
    setPortraitBusyId(character.id);
    setError(null);
    setOk(null);
    try {
      const generated = await createLocalCompanionPortrait(character);
      const avatar = generated.avatar;
      if (!saveImportedCharacter({ ...character, avatar, discovery: character.discovery ? { ...character.discovery, visualStyle: "Unspecified" } : undefined })) {
        throw new Error("Portrait was generated but browser storage could not save it.");
      }
      setList(loadImportedCharacters());
      setOk(`Generated a unique portrait for ${character.name} using ${generated.engine}. Saved to your character library.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Local portrait generation failed.");
    } finally {
      setPortraitBusyId(null);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setOk(null);
    try {
      const raw = await parseCharacterCardFile(file);
      if (!raw) {
        setError(
          "Could not read card. Use SillyTavern PNG (chara/ccv3 chunk) or JSON export.",
        );
        return;
      }
      const character = parseSillyTavernCard(raw);
      if (!character) {
        setError("Parsed file but missing name/fields. Use a valid fictional adult V2/V3 JSON card.");
        return;
      }
      // Prefer PNG itself as avatar when image card
      if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
        character.avatar = await compactCardPortrait(file);
      }
      if (!saveImportedCharacter(character)) {
        setError("Character could not be saved: browser storage is full or unavailable.");
        return;
      }
      const lore = parseCharacterLorebook(raw);
      const loreSaved = lore.length === 0 || saveLorebook(character.id, lore);
      setList(loadImportedCharacters());
      setOk(`Imported ${character.name} — ${lore.length} lorebook entries${loreSaved ? " saved" : " could not be saved (local storage full)"}; ready to chat.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid file.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <div>
        <h1 className="font-display text-2xl text-cream">Import character card</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Drop a SillyTavern <strong className="text-zinc-300">PNG</strong> (embedded chara/ccv3) or
          JSON / OpenChara export. Portrait is kept when you import a PNG card.
        </p>
      </div>

      <label onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) void handleFile(file); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 cursor-pointer transition-all duration-200 ${dragging ? "border-fuchsia-300 bg-fuchsia-500/15 scale-[1.01]" : "border-pink-500/40 bg-gradient-to-br from-zinc-950/80 to-fuchsia-950/20 hover:border-pink-400/60"}`}>
        <span className="text-3xl">🃏</span>
        <span className="text-sm text-zinc-300">Click or drop .png or .json card</span>
        <span className="text-xs text-zinc-500">V2/V3 • PNG portrait • contextual lorebook • max 12 MB</span>
        <input
          type="file"
          accept=".json,.png,application/json,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      <section aria-labelledby="starter-title" className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="starter-title" className="text-lg font-semibold text-pink-100">Original starter companions</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Ten original fictional adult personalities created for VelvetMotion, not copied from third-party games.
              Preview and add only the ones you want. Illustrations are placeholders for portraits you generate.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-pink-300/20 bg-pink-500/10 px-2 py-1 text-[10px] text-pink-200">{ORIGINAL_STARTER_COMPANIONS.length} ORIGINAL</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ORIGINAL_STARTER_COMPANIONS.map((character) => {
            const saved = list.find((item) => item.id === character.id);
            const alreadyAdded = Boolean(saved);
            return (
              <article key={character.id} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#2d2031] to-[#16101b]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={saved?.avatar || character.avatar} alt={`Portrait or illustrated placeholder for ${character.name}`}
                  className="aspect-[3/4] w-full object-cover" loading="lazy" />
                <div className="space-y-1.5 p-2.5">
                  <p className="truncate text-xs font-semibold text-white">{character.name} · {character.age}</p>
                  <p className="line-clamp-2 min-h-8 text-[10px] leading-4 text-zinc-300">{character.tagline}</p>
                  <button type="button" onClick={() => alreadyAdded ? onOpen(saved || character) : void addStarter(character)}
                    className="w-full rounded-lg border border-pink-300/30 bg-pink-500/15 px-2 py-2 text-[11px] font-semibold text-pink-100 hover:bg-pink-500/30">
                    {alreadyAdded ? "Start chatting" : "Add companion"}
                  </button>
                  <button type="button" disabled={portraitBusyId !== null}
                    onClick={() => void generateStarterPortrait(saved || character)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[10px] font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50">
                    {portraitBusyId === character.id ? "Generating locally…" : "Generate unique portrait"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {ok && <p role="status" className="text-sm text-emerald-400">{ok}</p>}

      {list.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-pink-300">Imported library</h2>
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c)}
              className="w-full text-left rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 hover:border-pink-500/40 flex gap-3 items-center"
            >
              {c.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt="" className="h-12 w-12 rounded-lg object-cover" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-cream">{c.name}</div>
                <div className="text-xs text-zinc-500 truncate">{c.tagline}</div>
                <div className="mt-1 text-[10px] text-fuchsia-200/80">
                  {loadLorebook(c.id).length > 0 ? `${loadLorebook(c.id).length} contextual lore entries` : "Character profile imported"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
