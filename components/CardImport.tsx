"use client";

import { useState } from "react";
import type { Character } from "@/lib/charactersTypes";
import {
  loadImportedCharacters,
  parseSillyTavernCard,
  saveImportedCharacter,
} from "@/lib/sillyTavernImport";
import { parseCharacterCardFile } from "@/lib/pngCardDecode";
import { compactCardPortrait } from "@/lib/avatarOptimize";
import { parseCharacterLorebook, saveLorebook } from "@/lib/lorebook";

export function CardImport({
  onHome,
  onOpen,
}: {
  onHome: () => void;
  onOpen: (c: Character) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [list, setList] = useState<Character[]>(() =>
    typeof window !== "undefined" ? loadImportedCharacters() : [],
  );

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
        setError("Parsed file but missing name/fields. Export V2 JSON from SillyTavern.");
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
    <div className="max-w-lg mx-auto space-y-6">
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
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
