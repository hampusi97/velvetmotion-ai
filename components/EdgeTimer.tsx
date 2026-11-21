"use client";

import { useEffect, useRef, useState } from "react";
import { CHARACTERS, type Character } from "@/lib/characters";
import { characterMediaUrl } from "@/lib/media";
import { loadState, recordSession, saveState, type SessionRecord } from "@/lib/relationshipState";

const PACES = [
  { label: "Slow", seconds: 45 },
  { label: "Medium", seconds: 30 },
  { label: "Fast", seconds: 20 },
  { label: "Edge", seconds: 15 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function EdgeTimer({
  onHome,
  companionId,
  onSessionEnd,
}: {
  onHome?: () => void;
  companionId?: string;
  onSessionEnd?: (session: SessionRecord) => void;
}) {
  const [girl, setGirl] = useState<Character | null>(() =>
    companionId ? CHARACTERS.find((c) => c.id === companionId) ?? CHARACTERS[0] : null,
  );
  const [pace, setPace] = useState(PACES[0]);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [score, setScore] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = setInterval(() => {
      setLeft((s) => s - 1);
      setElapsedSec((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running, left]);

  const finishSession = (finalEdges: number) => {
    const activeGirl = girl || CHARACTERS[0];
    const rel = loadState(activeGirl.id);
    const rec: SessionRecord = {
      id: `edge-${Date.now()}`,
      startedAt: startedAtRef.current || new Date().toISOString(),
      durationSec: Math.max(1, elapsedSec),
      edges: Math.max(1, finalEdges),
      tier: rel.sphTier,
    };
    saveState(recordSession(rel, rec));
    onSessionEnd?.(rec);
  };

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      const nextScore = score + 1;
      setScore(nextScore);
      finishSession(nextScore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, running]);

  const start = () => {
    const g = companionId
      ? CHARACTERS.find((c) => c.id === companionId) ?? pick(CHARACTERS)
      : pick(CHARACTERS);
    const p = pick(PACES);
    startedAtRef.current = new Date().toISOString();
    setGirl(g);
    setPace(p);
    setLeft(p.seconds);
    setElapsedSec(0);
    setRunning(true);
    setFailed(false);
  };

  const fail = () => {
    setRunning(false);
    setFailed(true);
    finishSession(score);
    setScore(0);
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      {onHome && (
        <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
          ← Home
        </button>
      )}
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
        Edge Timer
      </h2>
      <p className="text-sm text-zinc-400">
        She sets the pace. Survive the timer or restart. Edges: {score} · {elapsedSec}s
      </p>
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
            src={characterMediaUrl(girl, running ? "nude" : "lingerie")}
            alt=""
            className="aspect-[3/4] w-full object-cover"
          />
          <div className="p-4 text-center space-y-2">
            <div className="text-lg font-bold text-cream">{girl.name}</div>
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
            {failed && <p className="text-xs text-red-300">Restarted. Session logged.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
