"use client";

import { useState } from "react";
import type { Character } from "@/lib/characters";
import {
  decodeShareCode,
  encodeShareCode,
  saveCustomGirl,
  loadCustomGirls,
  copyShareCode,
  type ShareableGirl,
} from "@/lib/shareGirls";

export function ShareImport({
  onImport,
  onHome,
}: {
  onImport?: (girl: Character) => void;
  onHome?: () => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [locals, setLocals] = useState<ShareableGirl[]>(() => loadCustomGirls());

  const handleImport = () => {
    const girl = decodeShareCode(code);
    if (!girl) {
      setStatus("Invalid share code. Check and try again.");
      return;
    }
    saveCustomGirl(girl);
    setLocals(loadCustomGirls());
    setStatus(`Imported ${girl.name}. She is ready in your custom list.`);
    setCode("");
    if (onImport) {
      onImport(girl as Character);
    }
  };

  const handleCopy = async (girl: ShareableGirl) => {
    const ok = await copyShareCode(girl);
    setStatus(ok ? `Share code for ${girl.name} copied.` : "Could not copy. Try again.");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {onHome && (
        <button type="button" onClick={onHome} className="text-pink-400 text-sm">
          ← Home
        </button>
      )}
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Share & Import Girls
      </h2>
      <p className="text-sm text-zinc-400">
        Paste a share code from a friend, or copy codes from your custom girls to send them.
      </p>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <label className="text-xs text-zinc-500">Paste share code</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={3}
          placeholder="Paste the long code here…"
          className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono resize-none outline-none focus:border-pink-500"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!code.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-semibold disabled:opacity-50"
        >
          Import girl
        </button>
      </div>

      {status && <p className="text-sm text-pink-300">{status}</p>}

      {locals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-cream">Your custom girls</h3>
          {locals.slice(0, 12).map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{g.name}</div>
                <div className="text-xs text-zinc-500 truncate">{g.tagline}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(g)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-pink-500/40 text-xs text-pink-200"
              >
                Copy code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
