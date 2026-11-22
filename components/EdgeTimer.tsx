"use client";

import { useEffect, useRef, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { KEYS } from "@/lib/storageKeys";

const PACES = [
  { label: "Slow", seconds: 45 },
  { label: "Medium", seconds: 30 },
  { label: "Fast", seconds: 20 },
  { label: "Edge", seconds: 15 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tierFromPace(label: string): 1 | 2 | 3 {
  if (label === "Slow") return 1;
  if (label === "Medium") return 2;
  return 3;
}

export function EdgeTimer({
  onHome,
  companion,
  onSessionEnd,
}: {
  onHome: () => void;
  companion?: { id: string; name: string; avatar: string };
  onSessionEnd?: (s: { durationSec: number; edges: number; tier: 1 | 2 | 3 }) => void;
}) {
  const [girl, setGirl] = useState<Character | null>(() =>
    companion ? CHARACTERS.find((c) => c.id === companion.id) ?? CHARACTERS[0] : null,
  );
  const [pace, setPace] = useState(PACES[0]);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [score, setScore] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const edgesRef = useRef(0);
  const paceLabelRef = useRef(PACES[0].label);
  const reportedRef = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const emitSessionEndOnce = () => {
    if (reportedRef.current || startedAtRef.current === null) return;
    reportedRef.current = true;
    const durationSec = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    onSessionEndRef.current?.({
      durationSec,
      edges: edgesRef.current,
      tier: tierFromPace(paceLabelRef.current),
    });
  };

  useEffect(() => {
    return () => {
      emitSessionEndOnce();
    };
  }, []);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, left]);

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      setScore((s) => s + 1);
    }
  }, [left, running]);

  const start = () => {
    const g = companion
      ? CHARACTERS.find((c) => c.id === companion.id) ?? pick(CHARACTERS)
      : pick(CHARACTERS);
    const p = pick(PACES);
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
      reportedRef.current = false;
    }
    paceLabelRef.current = p.label;
    setGirl(g);
    setPace(p);
    setLeft(p.seconds);
    setRunning(true);
    setFailed(false);
  };

  const fail = () => {
    edgesRef.current += 1;
    setRunning(false);
    setFailed(true);
    setScore(0);
    try {
      localStorage.setItem(KEYS.edgeLock, String(Date.now() + 60000));
    } catch {}
  };

  const handleHome = () => {
    emitSessionEndOnce();
    onHome();
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <button type="button" onClick={handleHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Edge Timer
      </h2>
      <p className="text-sm text-zinc-400">She sets the pace. Survive the timer or restart. Score: {score}</p>
      <button
        type="button"
        onClick={start}
        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-600 py-3 font-semibold text-white"
      >
        {running ? "Restart" : "Start challenge"}
      </button>
      {girl && (
        <div className="rounded-3xl border border-fuchsia-500/30 bg-zinc-900/60 overflow-hidden">
          <img
            src={companion?.avatar || characterMediaUrl(girl, running ? "nude" : "lingerie")}
            alt=""
            className="aspect-[3/4] w-full object-cover"
          />
          <div className="p-4 text-center space-y-2">
            <div className="text-lg font-bold text-cream">{companion?.name || girl.name}</div>
            <div className="text-3xl font-black text-pink-300">{left}s</div>
            <div className="text-sm text-fuchsia-300">{pace.label} pace</div>
            {running && (
              <button
                type="button"
                onClick={fail}
                className="mt-2 w-full rounded-xl border border-red-500/50 py-2 text-sm text-red-300"
              >
                I failed — restart
              </button>
            )}
            {failed && <p className="text-xs text-red-300">Restarted. Score reset.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
