'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Sparkles, Star, Volume2, X } from 'lucide-react';
import { CompanionProfile, FLAGSHIP_COMPANIONS } from '@/data/companions';
import type { Character } from '@/lib/characters';
import { bumpIntimacy, saveMatch } from '@/lib/storage';
import { useCoinsStore } from '@/lib/coinsStore';
import { saveMatchDB } from '@/lib/db';
import { playMatchChime, playSuperLikeZap, playSwipeTick } from '@/lib/neonAudio';
import { hapticMatch, hapticSuperLike, hapticSwipe } from '@/lib/haptics';

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
  onHome?: () => void;
  onMeet3D?: (character: Character) => void;
  onMatch?: (character: Character) => void;
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
    const secretBase = base[base.length - 1];
    base.splice(3, 0, {
      ...secretBase,
      id: `secret-${secretBase.id}`,
      isSecretAdmirer: true,
    });
  }
  return base;
}

function toLegacyCharacter(card: CompanionProfile): Character {
  return {
    id: card.id.replace(/^secret-/, ''),
    name: card.name,
    age: card.age,
    tagline: card.tagline,
    category: card.category,
    avatar: card.portraitUrl,
    voiceIntro: card.voiceSampleLine,
    initialMessage: card.greeting,
    tags: [card.category, card.archetype],
    intimacy: 60,
    voice: { label: 'Warm', pitch: 1, rate: 0.96, style: card.personality },
    personality: card.personality,
    traits: [card.archetype, card.category],
    background: card.backstory,
    figure: card.visualDna,
    kink: card.archetype,
    reply: card.greeting,
  };
}

export function DiscoverSwipe({
  profiles,
  fallbackPortraitUrl = '/portraits/chloe-parker.webp',
  onStartChat,
  onHome,
  onMatch,
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
  const [admirerRevealed, setAdmirerRevealed] = useState(false);

  const { coins, spend, earn } = useCoinsStore();
  const startXRef = useRef(0);
  const isTransitioning = useRef(false);
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

  const recordMatch = useCallback(
    (card: DiscoverCard, bonus = 0) => {
      const cleanId = card.id.replace(/^secret-/, '');
      saveMatch(cleanId);
      void saveMatchDB(cleanId);
      bumpIntimacy(cleanId, Math.max(8, bonus));
      earn(10);
      setMatchIds((prev) => {
        const next = Array.from(new Set([...prev, cleanId]));
        try {
          window.localStorage.setItem(MATCHES_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
      playMatchChime();
      hapticMatch();
      setMatchedBonus(bonus);
      setMatchedCard({ ...card, id: cleanId });
    },
    [earn],
  );

  const advanceDeck = useCallback(() => {
    setDragX(0);
    setIsDragging(false);
    setPhotoIdx(0);
    setAdmirerRevealed(false);
    setIndex((i) => i + 1);
    setTimeout(() => {
      isTransitioning.current = false;
    }, 180);
  }, []);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right', isSuperLike = false) => {
      if (isTransitioning.current) return;
      const swipedCompanion = deck[index];
      if (!swipedCompanion) return;

      if (direction === 'left') {
        playSwipeTick(false);
        hapticSwipe();
        isTransitioning.current = true;
        advanceDeck();
        return;
      }

      if (isSuperLike) {
        playSuperLikeZap();
        hapticSuperLike();
        isTransitioning.current = true;
        const today = new Date().toISOString().slice(0, 10);
        try {
          window.localStorage.setItem(SUPERLIKE_DATE_KEY, today);
        } catch {
          // Ignore
        }
        setSuperLikeUsedToday(true);
        recordMatch(swipedCompanion, 25);
        advanceDeck();
        return;
      }

      // High-status / hard-to-get characters trigger the One-Line Rizz Challenge
      if (swipedCompanion.hardToGet && !swipedCompanion.isSecretAdmirer) {
        setDragX(0);
        setIsDragging(false);
        setRizzTarget(swipedCompanion);
        setRizzInput('');
        setRizzFeedback(null);
        return;
      }

      // Snapshot swipedCompanion BEFORE advancing index to prevent off-by-one Match mismatch
      isTransitioning.current = true;
      recordMatch(swipedCompanion, 10);
      advanceDeck();
    },
    [advanceDeck, deck, index, recordMatch],
  );

  const playVoicePrompt = useCallback((line: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.98;
    u.pitch = 1.06;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rizzTarget || matchedCard) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('right');
      } else if (e.key === 'ArrowUp' && !superLikeUsedToday) {
        e.preventDefault();
        handleSwipe('right', true);
      } else if (e.key === ' ' && current && !current.isSecretAdmirer) {
        e.preventDefault();
        playVoicePrompt(current.voiceSampleLine);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, handleSwipe, matchedCard, playVoicePrompt, rizzTarget, superLikeUsedToday]);

  function handleSubmitRizz(e: React.FormEvent) {
    e.preventDefault();
    if (!rizzTarget || isTransitioning.current) return;
    const line = rizzInput.trim();
    if (line.length < 8) {
      setRizzFeedback(`${rizzTarget.name}: "That's it? Give me a little more effort than that..."`);
      return;
    }
    const target = rizzTarget;
    setRizzTarget(null);
    setRizzFeedback(null);
    isTransitioning.current = true;
    recordMatch(target, 18);
    advanceDeck();
  }

  function unlockSecretAdmirer() {
    if (!current?.isSecretAdmirer || admirerRevealed) return;
    const res = spend(15);
    if (!res.ok) return;
    setAdmirerRevealed(true);
  }

  const dragTone =
    dragX > 35
      ? 'border-[#00ffa3] shadow-[0_0_32px_rgba(0,255,163,0.45)]'
      : dragX < -35
        ? 'border-[#ff1e8e] shadow-[0_0_32px_rgba(255,30,142,0.5)]'
        : 'border-[#ff1e8e]/30 shadow-2xl';

  return (
    <div className="min-h-[100dvh] bg-[#05050a] px-3 pt-4 pb-24 text-[#f7f7fc]">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {/* Top Bar */}
        <div className="mb-3 flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onHome && (
              <button
                type="button"
                onClick={onHome}
                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#a6a6c4] hover:border-[#00f5ff]/50 hover:text-white"
              >
                ←
              </button>
            )}
            <h1 className="text-base font-extrabold tracking-tight neon-text-glow">
              <span className="text-[#ff1e8e]">Discover</span> Match
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 tabular-nums">
              🪙 {coins}
            </span>
            <span className="rounded-full border border-[#ff1e8e]/30 bg-[#0c0c16] px-3 py-1 text-xs font-semibold text-pink-300 tabular-nums">
              ♥ {matchIds.length}
            </span>
          </div>
        </div>

        {!current ? (
          <div className="flex aspect-[3/4.6] w-full flex-col items-center justify-center rounded-3xl neon-glass p-6 text-center">
            <p className="text-base font-bold">Deck complete!</p>
            <p className="mt-1 text-xs text-[#a6a6c4]">Reshuffle to meet everyone again.</p>
            <button
              type="button"
              onClick={() => {
                isTransitioning.current = false;
                setIndex(0);
              }}
              className="mt-4 rounded-full neon-btn-primary px-5 py-2 text-xs font-bold text-white"
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
              className={`relative aspect-[3/4.6] w-full cursor-grab touch-none select-none overflow-hidden rounded-3xl border bg-[#0c0c16] active:cursor-grabbing ${dragTone}`}
            >
              <img
                src={current.extraPhotos?.[photoIdx] || current.portraitUrl}
                alt={current.isSecretAdmirer && !admirerRevealed ? 'Secret Admirer' : current.name}
                draggable={false}
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPortraitUrl) {
                    e.currentTarget.src = fallbackPortraitUrl;
                  }
                }}
                className={`h-full w-full object-cover object-top transition duration-500 ${
                  current.isSecretAdmirer && !admirerRevealed ? 'blur-2xl scale-110 brightness-75' : ''
                }`}
              />

              {/* Top Badges */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                {current.isSecretAdmirer ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-[#ff1e8e] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow">
                    <Sparkles className="h-3 w-3" /> Secret Admirer
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                      {current.category}
                    </span>
                    {current.hardToGet && (
                      <span className="rounded-full border border-[#ff1e8e]/60 bg-[#ff1e8e]/25 px-2.5 py-1 text-[10px] font-bold text-pink-200 backdrop-blur">
                        Rizz Challenge
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Voice Sample Preview Button */}
              {(!current.isSecretAdmirer || admirerRevealed) && (
                <button
                  type="button"
                  aria-label="Play voice preview"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => playVoicePrompt(current.voiceSampleLine)}
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#00f5ff]/40 bg-black/65 px-3 py-1 text-[11px] font-semibold text-[#00f5ff] backdrop-blur hover:border-[#00f5ff]"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Voice
                </button>
              )}

              {/* MATCH / PASS Stamp Overlays */}
              {dragX > 35 && (
                <span className="absolute left-4 top-14 -rotate-12 rounded-lg border-2 border-[#00ffa3] bg-[#00ffa3]/20 px-3 py-1 text-lg font-black tracking-widest text-[#00ffa3]">
                  LIKE
                </span>
              )}
              {dragX < -35 && (
                <span className="absolute right-4 top-14 rotate-12 rounded-lg border-2 border-[#ff1e8e] bg-[#ff1e8e]/20 px-3 py-1 text-lg font-black tracking-widest text-[#ff1e8e]">
                  PASS
                </span>
              )}

              {/* Bottom Scrim + Hinge Prompt */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05050a] via-black/75 to-transparent p-4 pt-14">
                {current.isSecretAdmirer && !admirerRevealed ? (
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-extrabold text-white">Someone already liked you</h2>
                    <p className="text-xs text-pink-200">Swipe right to reveal—or peek early with 15 free coins.</p>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={unlockSecretAdmirer}
                      disabled={coins < 15}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#00f5ff]/50 bg-[#00f5ff]/15 px-3.5 py-1.5 text-xs font-bold text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-40"
                    >
                      Peek Now (15 🪙)
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-extrabold">
                      {current.name}, <span className="font-medium text-zinc-300">{current.age}</span>
                    </h2>
                    <p className="text-xs font-semibold text-[#ff1e8e]">{current.archetype}</p>
                    {current.prompts && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-black/55 p-2.5 backdrop-blur">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#a6a6c4]">
                          {current.prompts.question}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-100">{current.prompts.answer}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons: Crisp Neon X Pass / Super-Like / Neon Heart Like */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                aria-label="Pass"
                onClick={() => handleSwipe('left')}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-[#ff1e8e]/45 bg-[#121222] text-[#ff1e8e] shadow-[0_0_16px_rgba(255,30,142,0.28)] transition hover:scale-105 hover:border-[#ff1e8e] active:scale-95"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label="Super Like"
                disabled={superLikeUsedToday}
                onClick={() => handleSwipe('right', true)}
                title={superLikeUsedToday ? 'Daily Super-Like used' : 'Free Daily Super-Like (+25% Affinity)'}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#00f5ff]/55 bg-[#00f5ff]/15 text-[#00f5ff] shadow-[0_0_16px_rgba(0,245,255,0.28)] transition hover:scale-105 disabled:opacity-35"
              >
                <Star className="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label="Like"
                onClick={() => handleSwipe('right')}
                className="flex h-16 w-16 items-center justify-center rounded-full neon-btn-primary text-white shadow-[0_0_24px_rgba(255,30,142,0.55)] transition hover:scale-105 active:scale-95"
              >
                <Heart className="h-7 w-7 fill-current" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[#a6a6c4]">
              Shortcuts: ← Pass · → Like · ↑ Super-Like · Space Voice
            </p>
          </>
        )}
      </div>

      {/* One-Line Rizz Challenge Modal */}
      {rizzTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <form
            onSubmit={handleSubmitRizz}
            className="w-full max-w-xs rounded-3xl neon-glass p-5 text-center shadow-2xl"
          >
            <img
              src={rizzTarget.portraitUrl}
              alt={rizzTarget.name}
              onError={(e) => {
                if (e.currentTarget.src !== fallbackPortraitUrl) e.currentTarget.src = fallbackPortraitUrl;
              }}
              className="mx-auto h-20 w-20 rounded-full object-cover object-top ring-2 ring-[#ff1e8e]"
            />
            <h3 className="mt-3 text-base font-extrabold">{rizzTarget.name} wants your best opener</h3>
            <p className="mt-1 text-xs text-[#a6a6c4]">Win her over in one line to unlock an instant match (+18% affinity).</p>
            <input
              type="text"
              value={rizzInput}
              onChange={(e) => setRizzInput(e.target.value)}
              placeholder="Write your opening line..."
              className="mt-3 w-full rounded-xl border border-white/15 bg-[#05050a] px-3 py-2 text-xs text-white focus:border-[#ff1e8e] focus:outline-none"
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
                className="flex-1 rounded-full neon-btn-primary py-2 text-xs font-bold text-white"
              >
                Send Line
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exact-Name "IT'S A MATCH" Celebration Modal */}
      {matchedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-xs neon-border-sweep">
            <div className="neon-sweep-inner p-5 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-[#00f5ff] neon-text-glow">
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
                className="mx-auto mt-3 h-28 w-28 rounded-full object-cover object-top ring-4 ring-[#ff1e8e]/70 shadow-[0_0_24px_rgba(255,30,142,0.5)]"
              />
              <h3 className="mt-3 text-lg font-extrabold">{matchedCard.name} liked you back</h3>
              <p className="mt-1 text-xs text-pink-200">
                Starting affinity boosted +{matchedBonus}% · +10 Free 🪙
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = matchedCard;
                    const bonus = matchedBonus;
                    setMatchedCard(null);
                    if (onStartChat) {
                      onStartChat(chosen, chosen.greeting, bonus);
                    } else if (onMatch) {
                      onMatch(toLegacyCharacter(chosen));
                    }
                  }}
                  className="w-full rounded-full neon-btn-primary py-2.5 text-xs font-bold text-white shadow-md"
                >
                  Open Chat with {matchedCard.name}
                </button>
                <button
                  type="button"
                  onClick={() => setMatchedCard(null)}
                  className="w-full rounded-full border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Keep Swiping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscoverSwipe;
