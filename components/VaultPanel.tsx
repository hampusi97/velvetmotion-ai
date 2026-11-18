"use client";

import { useState } from "react";
import { getGallery, type GalleryItem } from "@/lib/storage";
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
  const [tab, setTab] = useState<"vault" | "pin">("vault");

  const allGallery = getGallery();
  const vaultItems = allGallery.filter((g) => ids.includes(g.id));
  const unpinned = allGallery.filter((g) => !ids.includes(g.id)).slice(0, 40);

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

  const pinItem = (item: GalleryItem) => {
    setIds(toggleVaultItem(item.id));
  };

  return (
    <div className="mx-auto max-w-lg pb-16">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm mb-4 hover:text-pink-300">
        ← Home
      </button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Private vault
      </h2>
      <p className="text-sm text-zinc-400 mt-1">
        Pin favorite nudes & videos behind a local PIN. Free · stays on this device.
      </p>

      {!unlocked ? (
        <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-mist">
            {setup ? "Create a PIN for this device (min 4 digits)" : "Enter PIN to unlock"}
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3 text-center tracking-[0.4em] outline-none focus:border-pink-500"
            placeholder="••••"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={tryUnlock}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-medium"
          >
            {setup ? "Set PIN & open" : "Unlock"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("vault")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                tab === "vault"
                  ? "border-pink-500 bg-pink-500/15 text-pink-200"
                  : "border-white/10 text-zinc-400"
              }`}
            >
              Vault ({vaultItems.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("pin")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border ${
                tab === "pin"
                  ? "border-pink-500 bg-pink-500/15 text-pink-200"
                  : "border-white/10 text-zinc-400"
              }`}
            >
              Pin from gallery
            </button>
            <button
              type="button"
              onClick={() => setUnlocked(false)}
              className="ml-auto rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-400"
            >
              Lock
            </button>
          </div>

          {tab === "vault" && (
            <>
              {vaultItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-pink-500/30 bg-pink-500/5 p-6 text-center">
                  <p className="text-sm text-zinc-300">Vault is empty</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Generate nudes in chat, then use <strong className="text-pink-300">Pin from gallery</strong> to hide
                    them here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("pin")}
                    className="mt-4 rounded-xl bg-pink-600 px-4 py-2 text-sm font-medium"
                  >
                    Browse gallery to pin
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {vaultItems.map((g) => (
                    <div key={g.id} className="relative rounded-2xl overflow-hidden border border-white/10 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt="" className="aspect-[3/4] w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-[10px] text-pink-200 truncate">{g.characterName}</p>
                        <p className="text-[10px] text-zinc-400">{g.type}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pinItem(g)}
                        className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-zinc-200 opacity-80 group-hover:opacity-100"
                      >
                        Unpin
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "pin" && (
            <>
              <p className="text-xs text-zinc-500">
                Tap an item to pin it into the vault. Already pinned items show a check.
              </p>
              {unpinned.length === 0 && vaultItems.length === 0 ? (
                <p className="text-sm text-zinc-400 mt-4">
                  No generated media yet. Open a girl → Generate → Lingerie / Nude / Explicit / Sex video.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {allGallery.slice(0, 48).map((g) => {
                    const pinned = ids.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => pinItem(g)}
                        className={`relative rounded-2xl overflow-hidden border text-left ${
                          pinned ? "border-pink-500 ring-1 ring-pink-500/40" : "border-white/10"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt="" className="aspect-[3/4] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-[10px] text-pink-200 truncate">{g.characterName}</p>
                          <p className="text-[10px] text-zinc-400">{g.type}</p>
                        </div>
                        {pinned && (
                          <span className="absolute top-2 right-2 rounded-full bg-pink-600 px-2 py-0.5 text-[10px]">
                            Pinned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
