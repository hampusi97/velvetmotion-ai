"use client";

import Image from "next/image";
import type { Character } from "@/lib/characters";
import { speak } from "@/lib/speech";

interface CharacterProfileProps {
  character: Character;
  romanceMode: boolean;
  onBack: () => void;
  onChat: () => void;
  onTag: (tag: string) => void;
}

export function CharacterProfile({
  character,
  romanceMode,
  onBack,
  onChat,
  onTag,
}: CharacterProfileProps) {
  return (
    <div>
      <button onClick={onBack} className="text-pink-400 text-sm">
        ← Back to list
      </button>

      <Image
        src={character.avatar}
        alt={`${character.name} placeholder portrait`}
        width={160}
        height={200}
        unoptimized
        className="mt-4 w-full max-w-xs h-64 object-cover rounded-2xl bg-zinc-900"
      />

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
          <span>{character.intimacy}</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-pink-500"
            style={{ width: `${character.intimacy}%` }}
          />
        </div>
      </div>

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
    </div>
  );
}
