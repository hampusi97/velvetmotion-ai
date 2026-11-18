"use client";

import { useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { createFantasyCode, loadFantasyCode } from "@/lib/fantasyCodes";

export function FantasyCodePanel({
  onLoadPair,
}: {
  onLoadPair?: (a: string, b: string, prompt: string) => void;
}) {
  const [code, setCode] = useState("");
  const [girlA, setGirlA] = useState(CHARACTERS[0]?.id || "");
  const [girlB, setGirlB] = useState(CHARACTERS[1]?.id || "");
  const [prompt, setPrompt] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");

  const create = () => {
    if (girlA === girlB) {
      setError("Pick two different girls");
      return;
    }
    const payload = createFantasyCode(girlA, girlB, prompt);
    setCreated(payload.code);
    setError("");
  };

  const load = () => {
    const payload = loadFantasyCode(code);
    if (!payload) {
      setError("Invalid code");
      return;
    }
    setError("");
    onLoadPair?.(payload.girlA, payload.girlB, payload.prompt);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-cream">Shared fantasy codes</h3>
        <p className="text-xs text-mist mt-1">
          Generate a code so two logged-in users can load the same dual-girl scene.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={girlA}
          onChange={(e) => setGirlA(e.target.value)}
          className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
        >
          {CHARACTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={girlB}
          onChange={(e) => setGirlB(e.target.value)}
          className="rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
        >
          {CHARACTERS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional scene prompt…"
        className="w-full rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={create}
        className="w-full py-2.5 rounded-xl bg-pink-600 text-sm font-medium"
      >
        Create code
      </button>
      {created && (
        <div className="rounded-xl bg-pink-500/10 border border-pink-500/30 px-3 py-2 text-center">
          <p className="text-xs text-pink-200">Share this code</p>
          <p className="text-lg font-mono font-bold tracking-widest text-cream">{created}</p>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-xs text-zinc-500">Have a code?</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VM-XXXXXX"
            className="flex-1 rounded-xl bg-zinc-950 border border-white/10 px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={load}
            className="px-4 rounded-xl border border-pink-500/40 text-sm text-pink-200"
          >
            Load
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
