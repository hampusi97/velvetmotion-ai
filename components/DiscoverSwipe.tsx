'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CompanionProfile, FLAGSHIP_COMPANIONS } from "@/data/companions";

export interface DiscoverCard extends CompanionProfile {
  prompts?: { question: string; answer: string };
  hardToGet?: boolean;
  isSecretAdmirer?: boolean;
  extraPhotos?: string[];
}

interface DiscoverSwipeProps {
  profiles?: DiscoverCard[];
  fallbackPortraitUrl?: string;
  onStartChat?: (profile: CompanionProfile, openerOverride?: string, bonusAffinity?: number) => void;
}

const MATCHES_KEY = 'velvetmotion_matches';
const SUPERLIKE_DATE_KEY = 'velvetmotion_superlike_date';

function buildDefaultDeck(): DiscoverCard[] {
  const promptsByIdx = [
    { question: 'Quickest way to ruin my sleep schedule', answer: 'Sending a 1 AM voice note I actually want to replay.' },
    { question: 'My ideal first date', answer: 'Rooftop drinks, zero small talk, and a dare by the second round.' },
    { question: 'Green flag I look for', answer: 'Confidence without trying too hard—and remembering the little details.' },
    { question: 'Unpopular opinion', answer: 'Late-night drives beat loud clubs every single time.' },
  ];

  const base: DiscoverCard[] = FLAGSHIP_COMPANIONS.map((c, idx) => ({
    ...c,
    prompts: promptsByIdx[idx % promptsByIdx.length],
    hardToGet: c.category === 'Luxury' || c.category === 'Goth',
    extraPhotos: [c.portraitUrl],
  }));

  // Inject a blurred "Secret Admirer" mystery card at position 4
  if (base.length >= 4) {
    base.splice(3, 0, {
      ...base[base.length - 1],
      id: `secret-${base[base.length - 1].id}`,
      isSecretAdmirer: true,
    });
  }
  return base;
}

export default function DiscoverSwipe({
  profiles,
  fallbackPortraitUrl = '/portraits/chloe-parker.webp',
  onStartChat,
}: DiscoverSwipeProps) {
  const [deck] = useState<DiscoverCard[]>(() => profiles ?? buildDefaultDeck());
  const [index, setIndex] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Match, Rizz Challenge & Super-Like states
  const [matchedCard, setMatchedCard] = useState<DiscoverCard | null>(null);
  const [matchedBonus, setMatchedBonus] = useState<number>(0);
  const [rizzTarget, setRizzTarget] = useState<DiscoverCard | null>(null);
  const [rizzInput, setRizzInput] = useState('');
  const [rizzFeedback, setRizzFeedback] = useState<string | null>(null);
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [superLikeUsedToday, setSuperLikeUsedToday] = useState(false);

  const startXRef = useRef(0);
  const current = deck[index];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MATCHES_KEY);
      if (raw) setMatchIds(JSON.parse(raw));
      const today = new Date().toISOString().slice(0, 10);
      setSuperLikeUsedToday(window.localStorage.getItem(SUPERLIKE_DATE_KEY) === today);
    } catch {
      // Ignore
    }
  }, []);

  function recordMatch(card: DiscoverCard, bonus = 0) {
    const cleanId = card.id.replace(/^secret-/, '');
    setMatchIds((prev) => {
      const next = Array.from(new Set([...prev, cleanId]));
      try {
        window.localStorage.setItem(MATCHES_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
    setMatchedBonus(bonus);
    setMatchedCard(card);
  }

  function advanceDeck() {
    setDragX(0);
    setIsDragging(false);
    setPhotoIdx(0);
    setIndex((i) => i + 1);
  }

  function handleSwipe(direction: 'left' | 'right', isSuperLike = false) {
    const swiped = deck[index];
    if (!swiped) return;

    if (direction === 'left') {
      advanceDeck();
      return;
    }

    if (isSuperLike) {
      const today = new Date().toISOString().slice(0, 10);
      try {
        window.localStorage.setItem(SUPERLIKE_DATE_KEY, today);
      } catch {
        // Ignore
      }
      setSuperLikeUsedToday(true);
      recordMatch(swiped, 25);
      advanceDeck();
      return;
    }

    // High-status / hard-to-get characters trigger the One-Line Rizz Challenge
    if (swiped.hardToGet && !swiped.isSecretAdmirer) {
      setDragX(0);
      setIsDragging(false);
      setRizzTarget(swiped);
      setRizzInput('');
      setRizzFeedback(null);
      return;
    }

    // Capture `swiped` BEFORE advancing index (prevents off-by-one mismatch!)
    recordMatch(swiped, 10);
    advanceDeck();
  }

  function handleSubmitRizz(e: React.FormEvent) {
    e.preventDefault();
    if (!rizzTarget) return;
    const line = rizzInput.trim();
    if (line.length < 8) {
      setRizzFeedback(`${rizzTarget.name}: "That's it? Give me a little more effort than that..."`);
      return;
    }
    const target = rizzTarget;
    setRizzTarget(null);
    setRizzFeedback(null);
    recordMatch(target, 18);
    advanceDeck();
  }

  function playVoicePrompt(line: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.98;
    u.pitch = 1.06;
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0f] px-3 pt-16 pb-24 text-white">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {/* Top Bar */}
        <div className="mb-3 flex w-full items-center justify-between">
          <h1 className="text-base font-extrabold tracking-tight">
            <span className="text-[#f45b84]">Discover</span> Match
          </h1>
          <span className="rounded-full border border-white/10 bg-[#1c1c24] px-3 py-1 text-xs font-semibold text-pink-300">
            ♥ {matchIds.length} matches
          </span>
        </div>

        {!current ? (
          <div className="flex aspect-[3/4.6] w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#14141c] p-6 text-center">
            <p className="text-base font-bold">Deck complete!</p>
            <p className="mt-1 text-xs text-zinc-400">Reshuffle to meet everyone again.</p>
            <button
              type="button"
              onClick={() => setIndex(0)}
              className="mt-4 rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] px-5 py-2 text-xs font-bold text-white"
            >
              Shuffle Deck
            </button>
          </div>
        ) : (
          <>
            {/* Swipeable Card */}
            <div
              onPointerDown={(e) => {
                startXRef.current = e.clientX;
                setIsDragging(true);
              }}
              onPointerMove={(e) => {
                if (isDragging) setDragX(e.clientX - startXRef.current);
              }}
              onPointerUp={() => {
                if (!isDragging) return;
                if (dragX > 90) handleSwipe('right');
                else if (dragX < -90) handleSwipe('left');
                else {
                  setDragX(0);
                  setIsDragging(false);
                }
              }}
              onPointerCancel={() => {
                setDragX(0);
                setIsDragging(false);
              }}
              style={{
                transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                transition: isDragging ? 'none' : 'transform 220ms ease-out',
              }}
              className="relative aspect-[3/4.6] w-full cursor-grab touch-none select-none overflow-hidden rounded-3xl border border-white/10 bg-[#16161e] shadow-2xl active:cursor-grabbing"
            >
              <img
                src={current.extraPhotos?.[photoIdx] || current.portraitUrl}
                alt={current.isSecretAdmirer ? 'Secret Admirer' : current.name}
                draggable={false}
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPortraitUrl) {
                    e.currentTarget.src = fallbackPortraitUrl;
                  }
                }}
                className={`h-full w-full object-cover object-top transition duration-500 ${
                  current.isSecretAdmirer ? 'blur-2xl scale-110 brightness-75' : ''
                }`}
              />

              {/* Top Badges */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                {current.isSecretAdmirer ? (
                  <span className="rounded-full bg-gradient-to-r from-fuchsia-600 to-[#f45b84] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow">
                    ✦ Secret Admirer
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                      {current.category}
                    </span>
                    {current.hardToGet && (
                      <span className="rounded-full border border-[#f45b84]/60 bg-[#f45b84]/25 px-2.5 py-1 text-[10px] font-bold text-pink-200 backdrop-blur">
                        Rizz Challenge
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Voice Sample Preview Button */}
              {!current.isSecretAdmirer && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => playVoicePrompt(current.voiceSampleLine)}
                  className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur hover:border-[#f45b84]"
                >
                  ▶ Voice
                </button>
              )}

              {/* MATCH / PASS Stamp Overlays */}
              {dragX > 35 && (
                <span className="absolute left-4 top-14 -rotate-12 rounded-lg border-2 border-emerald-400 bg-emerald-500/20 px-3 py-1 text-lg font-black tracking-widest text-emerald-300">
                  MATCH
                </span>
              )}
              {dragX < -35 && (
                <span className="absolute right-4 top-14 rotate-12 rounded-lg border-2 border-rose-500 bg-rose-500/20 px-3 py-1 text-lg font-black tracking-widest text-rose-400">
                  PASS
                </span>
              )}

              {/* Bottom Scrim + Hinge Prompt */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent p-4 pt-14">
                {current.isSecretAdmirer ? (
                  <div className="text-center">
                    <h2 className="text-lg font-extrabold text-white">Someone already liked you</h2>
                    <p className="mt-1 text-xs text-pink-200">Swipe right to reveal who it is &amp; unlock a bonus opener.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-extrabold">
                      {current.name}, <span className="font-medium text-zinc-300">{current.age}</span>
                    </h2>
                    <p className="text-xs font-semibold text-[#f45b84]">{current.archetype}</p>
                    {current.prompts && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/50 p-2.5 backdrop-blur">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {current.prompts.question}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-100">{current.prompts.answer}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons: Crisp X Pass / Daily Super-Like / Pink Heart Like */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                aria-label="Pass"
                onClick={() => handleSwipe('left')}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#1c1c24] text-xl font-black text-rose-400 transition hover:scale-105 active:scale-95"
              >
                ✕
              </button>

              <button
                type="button"
                disabled={superLikeUsedToday}
                onClick={() => handleSwipe('right', true)}
                title={superLikeUsedToday ? 'Daily Super-Like used' : 'Free Daily Super-Like (+25% Affinity)'}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/15 text-lg text-cyan-300 transition hover:scale-105 disabled:opacity-35"
              >
                ★
              </button>

              <button
                type="button"
                aria-label="Like"
                onClick={() => handleSwipe('right')}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] text-2xl font-bold text-white shadow-lg shadow-[#f45b84]/40 transition hover:scale-105 active:scale-95"
              >
                ♥
              </button>
            </div>
          </>
        )}
      </div>

      {/* One-Line Rizz Challenge Modal */}
      {rizzTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form
            onSubmit={handleSubmitRizz}
            className="w-full max-w-xs rounded-3xl border border-[#f45b84]/50 bg-[#14141c] p-5 text-center shadow-2xl"
          >
            <img
              src={rizzTarget.portraitUrl}
              alt={rizzTarget.name}
              className="mx-auto h-20 w-20 rounded-full object-cover object-top ring-2 ring-[#f45b84]"
            />
            <h3 className="mt-3 text-base font-extrabold">{rizzTarget.name} wants your best opener</h3>
            <p className="mt-1 text-xs text-zinc-400">Win her over in one line to unlock an instant match (+18% affinity).</p>
            <input
              type="text"
              value={rizzInput}
              onChange={(e) => setRizzInput(e.target.value)}
              placeholder="Write your opening line..."
              className="mt-3 w-full rounded-xl border border-white/15 bg-[#0b0b0f] px-3 py-2 text-xs text-white focus:border-[#f45b84] focus:outline-none"
            />
            {rizzFeedback && <p className="mt-2 text-[11px] text-pink-300">{rizzFeedback}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRizzTarget(null)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] py-2 text-xs font-bold text-white"
              >
                Send Line
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exact-Name "IT'S A MATCH" Modal */}
      {matchedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-3xl border border-[#f45b84]/60 bg-[#14141c] p-5 text-center shadow-2xl">
            <p className="text-xs font-black uppercase tracking-widest text-[#f45b84]">
              It&apos;s a Match!
            </p>
            <img
              src={matchedCard.portraitUrl}
              alt={matchedCard.name}
              onError={(e) => {
                if (e.currentTarget.src !== fallbackPortraitUrl) {
                  e.currentTarget.src = fallbackPortraitUrl;
                }
              }}
              className="mx-auto mt-3 h-28 w-28 rounded-full object-cover object-top ring-4 ring-[#f45b84]/60"
            />
            <h3 className="mt-3 text-lg font-extrabold">{matchedCard.name} liked you back</h3>
            <p className="mt-1 text-xs text-pink-200">
              Starting affinity boosted +{matchedBonus}%
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const chosen = matchedCard;
                  const bonus = matchedBonus;
                  setMatchedCard(null);
                  onStartChat?.(chosen, chosen.greeting, bonus);
                }}
                className="w-full rounded-full bg-gradient-to-r from-[#f45b84] to-[#ff4d8d] py-2.5 text-xs font-bold text-white shadow-md"
              >
                Open Chat with {matchedCard.name}
              </button>
              <button
                type="button"
                onClick={() => setMatchedCard(null)}
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}