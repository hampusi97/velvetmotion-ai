"use client";

import { useState } from "react";
import { getGallery } from "@/lib/storage";
import {
  checkVaultPin,
  getVaultIds,
  hasVaultPin,
  setVaultPin,
  toggleVaultItem,
} from "@/lib/vault";

export function VaultPanel({ onHome }: { onHome: () => void }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [setup, setSetup] = useState(!hasVaultPin());
  const [error, setError] = useState("");
  const [ids, setIds] = useState<string[]>(() => getVaultIds());

  const gallery = getGallery().filter((g) => ids.includes(g.id));

  const tryUnlock = () => {
    if (setup) {
      if (pin.length < 4) {
        setError("PIN needs at least 4 digits");
        return;
      }
      setVaultPin(pin);
      setSetup(false);
      setUnlocked(true);
      setError("");
      setPin("");
      return;
    }
    if (checkVaultPin(pin)) {
      setUnlocked(true);
      setError("");
      setPin("");
    } else setError("Wrong PIN");
  };

  return (
    <div className="mx-auto max-w-lg">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-4">
        ← Home
      </button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Private vault
      </h2>
      <p className="text-sm text-zinc-400 mt-1">Pin favorite nudes & videos behind a local PIN.</p>

      {!unlocked ? (
        <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-mist">{setup ? "Create a PIN for this device" : "Enter PIN to unlock"}</p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3 text-center tracking-[0.4em]"
            placeholder="••••"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={tryUnlock}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium"
          >
            {setup ? "Set PIN" : "Unlock"}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-xs text-zinc-500 mb-3">{gallery.length} pinned items</p>
          {gallery.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Open the Gallery, generate nudes, then pin them here from chat (coming soon: pin button on each image).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gallery.map((g) => (
                <div key={g.id} className="relative rounded-2xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setIds(toggleVaultItem(g.id))}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[10px]"
                  >
                    Unpin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
