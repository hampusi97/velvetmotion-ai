"use client";

import { useState } from "react";
import { CHARACTERS } from "@/lib/characters";
import { createFantasyCode, loadFantasyCode } from "@/lib/fantasyCodes";

export function FantasyCodePanel({
  onLoad,
}: {
  onLoad: (girlA: string, girlB: string, prompt: string) => void;
}) {
  const [a, setA] = useState(CHARACTERS[0].id);
  const [b, setB] = useState(CHARACTERS[1]?.id || CHARACTERS[0].id);
  const [code, setCode] = useState("");
  const [created, setCreated] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
      <h3 className="font-semibold text-cream">Shared fantasy code</h3>
      <p className="text-xs text-mist">Generate a code so another logged-in user loads the same dual-girl scene.</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className="rounded-xl bg-black border border-white/10 px-2 py-2 text-sm">
          {CHARACTERS.map((c) => (
            <option key={c.id} value={c.id}>{c.name.split(" ")[0]}</option>
          ))}
        </select>
        <select value={b} onChange={(e) => setB(e.target.value)} className="rounded-xl bg-black border border-white/10 px-2 py-2 text-sm">
          {CHARACTERS.map((c) => (
            <option key={c.id} value={c.id}>{c.name.split(" ")[0]}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => {
          const p = createFantasyCode(a, b);
          setCreated(p.code);
        }}
        className="w-full py-2 rounded-xl bg-pink-600 text-sm font-medium"
      >
        Generate code
      </button>
      {created && (
        <p className="text-center text-lg font-mono text-pink-300 tracking-widest">{created}</p>
      )}
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="VM-XXXXXX"
          className="flex-1 rounded-xl bg-black border border-white/10 px-3 py-2 text-sm font-mono uppercase"
        />
        <button
          type="button"
          onClick={() => {
            const p = loadFantasyCode(code);
            if (!p) {
              setErr("Invalid code");
              return;
            }
            setErr("");
            onLoad(p.girlA, p.girlB, p.prompt);
          }}
          className="px-4 py-2 rounded-xl border border-white/15 text-sm"
        >
          Load
        </button>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
