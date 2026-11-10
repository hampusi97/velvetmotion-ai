"use client";

import { useMemo, useState } from "react";
import { CharacterChat } from "@/components/CharacterChat";
import { CharacterProfile } from "@/components/CharacterProfile";
import { CharacterRoster } from "@/components/CharacterRoster";
import { CHARACTERS, characterCategories, type Character } from "@/lib/characters";

type HomeView =
  | "home"
  | "girls"
  | "create"
  | "romance"
  | "bnwo"
  | "tinder"
  | "joi"
  | "room"
  | "suggest"
  | "gallery"
  | "packs";

type View = HomeView | "profile" | "chat";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [romanceMode, setRomanceMode] = useState(false);
  const [listView, setListView] = useState<"girls" | "romance">("girls");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState<string | null>(null);

  const categories = useMemo(() => ["All", ...characterCategories()], []);
  const tags = useMemo(
    () => Array.from(new Set(CHARACTERS.flatMap((character) => character.tags))).sort(),
    [],
  );
  const selected = CHARACTERS.find((character) => character.id === selectedId) ?? null;

  const openRoster = (romance: boolean) => {
    setRomanceMode(romance);
    setListView(romance ? "romance" : "girls");
    setView(romance ? "romance" : "girls");
  };

  const openProfile = (character: Character) => {
    setSelectedId(character.id);
    setView("profile");
  };

  const showRoster = view === "girls" || view === "romance";

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-pink-400 mb-4">VelvetMotion</h1>

        {view === "home" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openRoster(false)} className="p-4 bg-zinc-900 rounded-xl">
              Fictional Girls
            </button>
            <button onClick={() => setView("create")} className="p-4 bg-zinc-900 rounded-xl">
              Create Girl
            </button>
            <button onClick={() => openRoster(true)} className="p-4 bg-zinc-900 rounded-xl">
              Romance
            </button>
            <button onClick={() => setView("bnwo")} className="p-4 bg-zinc-900 rounded-xl">
              BNWO
            </button>
            <button onClick={() => setView("tinder")} className="p-4 bg-zinc-900 rounded-xl">
              Tinder
            </button>
            <button onClick={() => setView("joi")} className="p-4 bg-zinc-900 rounded-xl">
              JOI
            </button>
            <button onClick={() => setView("room")} className="p-4 bg-zinc-900 rounded-xl">
              Goon Room
            </button>
            <button onClick={() => setView("suggest")} className="p-4 bg-zinc-900 rounded-xl">
              Suggest
            </button>
            <button onClick={() => setView("gallery")} className="p-4 bg-zinc-900 rounded-xl">
              Gallery
            </button>
            <button onClick={() => setView("packs")} className="p-4 bg-zinc-900 rounded-xl">
              Story Packs
            </button>
          </div>
        )}

        {showRoster && (
          <CharacterRoster
            romanceMode={romanceMode}
            query={query}
            category={category}
            tag={tag}
            categories={categories}
            tags={tags}
            onQuery={setQuery}
            onCategory={(value) => {
              setCategory(value);
              setTag(null);
            }}
            onTag={setTag}
            onSelect={openProfile}
            onBack={() => setView("home")}
          />
        )}

        {view === "profile" && selected && (
          <CharacterProfile
            character={selected}
            romanceMode={romanceMode}
            onBack={() => setView(listView)}
            onChat={() => setView("chat")}
            onTag={(nextTag) => {
              setTag(nextTag);
              setCategory("All");
              setView(listView);
            }}
          />
        )}

        {view === "chat" && selected && (
          <CharacterChat
            character={selected}
            romanceMode={romanceMode}
            onBack={() => setView("profile")}
          />
        )}

        {view !== "home" && !showRoster && view !== "profile" && view !== "chat" && (
          <button onClick={() => setView("home")} className="mt-4 text-pink-400">
            ← Home
          </button>
        )}

        {view !== "home" && !showRoster && view !== "profile" && view !== "chat" && (
          <p className="mt-8 text-zinc-500 text-sm">Full features loading... Pull latest.</p>
        )}
      </div>
    </div>
  );
}
