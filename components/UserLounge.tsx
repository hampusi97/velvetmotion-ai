"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { postLoungeMessage, subscribeLounge } from "@/lib/firebaseLounge";
import { encodeShareCode, loadCustomGirls } from "@/lib/shareGirls";

type LobbyMsg = {
  id: string;
  from: string;
  text: string;
  at: number;
  shareCode?: string;
};

const LOBBY_KEY = "vm-user-lounge";
const MATCH_KEY = "vm-lounge-match";
const ROOMS = [
  { id: "public", label: "Public" },
  { id: "nsfw", label: "NSFW" },
  { id: "share", label: "Share codes" },
] as const;

function loadLobby(room: string): LobbyMsg[] {
  try {
    const raw = localStorage.getItem(`${LOBBY_KEY}-${room}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLobby(room: string, msgs: LobbyMsg[]) {
  try {
    localStorage.setItem(`${LOBBY_KEY}-${room}`, JSON.stringify(msgs.slice(-80)));
  } catch {}
}

export function UserLounge({ onHome }: { onHome: () => void }) {
  const [room, setRoom] = useState<(typeof ROOMS)[number]["id"]>("public");
  const [msgs, setMsgs] = useState<LobbyMsg[]>([]);
  const [text, setText] = useState("");
  const [partner, setPartner] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [firebaseLive, setFirebaseLive] = useState(false);
  const me = getUser()?.username || "Anon";

  useEffect(() => {
    setMsgs(loadLobby(room));
    setFirebaseLive(false);
    let unsub = () => {};
    void subscribeLounge(room, (list) => {
      if (list.length) {
        setFirebaseLive(true);
        setMsgs(
          list.map((m) => ({
            id: m.id,
            from: m.from,
            text: m.text,
            at: m.at,
            shareCode: m.shareCode,
          })),
        );
      }
    }).then((u) => {
      unsub = u;
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${LOBBY_KEY}-${room}` && !firebaseLive) setMsgs(loadLobby(room));
      if (e.key === MATCH_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue);
          if (p.to === me) setPartner(p.from);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, [me, firebaseLive, room]);

  const post = async (body: string, shareCode?: string) => {
    const msg: LobbyMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: me,
      text: body,
      at: Date.now(),
      shareCode,
    };
    const next = [...loadLobby(room), msg];
    saveLobby(room, next);
    setMsgs(next);
    const ok = await postLoungeMessage(room, {
      from: me,
      text: body,
      at: msg.at,
      shareCode,
    });
    if (ok) setFirebaseLive(true);
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    void post(t);
  };

  const findStranger = () => {
    setSearching(true);
    setTimeout(() => {
      const name = `Stranger_${Math.floor(1000 + Math.random() * 9000)}`;
      setPartner(name);
      setSearching(false);
      try {
        localStorage.setItem(MATCH_KEY, JSON.stringify({ from: me, to: name, at: Date.now() }));
      } catch {}
      void post(`*connected with ${name}*`);
    }, 1200 + Math.random() * 1500);
  };

  const shareGirlCode = () => {
    try {
      const list = loadCustomGirls();
      if (!list.length) {
        void post("I don't have a custom girl to share yet — create one first.");
        return;
      }
      const girl = list[0];
      const code = encodeShareCode(girl);
      if (!code) {
        void post("Couldn't build a share code.");
        return;
      }
      void post(`Sharing my girl “${girl.name}” — paste code in Share & Import`, code);
    } catch {
      void post("Couldn't build a share code.");
    }
  };

  const nextStranger = () => {
    setPartner(null);
    findStranger();
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream neon-text">Lounge</h1>
      <p className="text-sm text-mist">
        Omegle-style lobby · share girl codes · multi-room.{" "}
        {firebaseLive ? (
          <span className="text-emerald-400">● Live (Firebase)</span>
        ) : (
          <span className="text-zinc-500">Local fallback — deploy firestore.rules for live rooms</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRoom(r.id)}
            className={`rounded-full px-3 py-1.5 text-xs border ${
              room === r.id
                ? "border-pink-500 bg-pink-500/20 text-pink-100"
                : "border-white/15 text-zinc-300"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {!partner ? (
          <button
            type="button"
            onClick={findStranger}
            disabled={searching}
            className="rounded-full bg-pink-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {searching ? "Finding someone…" : "Find a stranger"}
          </button>
        ) : (
          <>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
              Connected · {partner}
            </span>
            <button type="button" onClick={nextStranger} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
              Next
            </button>
          </>
        )}
        <button
          type="button"
          onClick={shareGirlCode}
          className="rounded-full border border-fuchsia-500/40 px-3 py-1.5 text-xs text-fuchsia-200"
        >
          Share my girl code
        </button>
      </div>

      <div className="h-72 overflow-y-auto rounded-2xl border border-pink-500/20 bg-zinc-950/80 p-3 space-y-2 glass-card">
        {msgs.length === 0 && (
          <p className="text-xs text-zinc-500 text-center pt-8">No messages yet. Find a stranger or say hi.</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`text-sm ${m.from === me ? "text-pink-200" : "text-zinc-200"}`}>
            <span className="text-[10px] text-zinc-500">{m.from}</span>
            <div className="leading-snug">{m.text}</div>
            {m.shareCode && (
              <div className="mt-1 text-[10px] text-fuchsia-300/80 font-mono break-all">{m.shareCode}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={partner ? `Message ${partner}…` : `Message #${room}…`}
          className="flex-1 rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-pink-500"
        />
        <button type="button" onClick={send} className="px-4 rounded-2xl bg-pink-600 text-sm font-medium">
          Send
        </button>
      </div>
    </div>
  );
}
