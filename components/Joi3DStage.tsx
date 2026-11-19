"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CHARACTERS, getCharacter } from "@/lib/characters";
import type { Character } from "@/lib/characters";
import { characterMediaUrl, seedFromPhotoDataUrl } from "@/lib/media";
import { getIntimacy } from "@/lib/storage";
import { speak, stopSpeaking } from "@/lib/speech";
import { startJoiBeat, stopJoiBeat, startIntimacyAudio, stopIntimacyAudio } from "@/lib/audioEngine";
import { setCharacterFaceSeed } from "@/lib/mediaSettings";
import type { StageMode, Pose } from "@/lib/joi3dContent";
import { LOCATIONS, SCRIPTS, POSE_LABELS, SEX_POSES } from "@/lib/joi3dContent";
import { Joi3DScene } from "@/components/Joi3DScene";

export function Joi3DStage({
  onHome, onChat, initialGirlId, fromMatch,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
  initialGirlId?: string | null;
  fromMatch?: boolean;
}) {
  const [girlId, setGirlId] = useState(initialGirlId || CHARACTERS[0]?.id || "maren");
  const [mode, setMode] = useState<StageMode>(fromMatch ? "sex" : "joi");
  const [pose, setPose] = useState<Pose>(fromMatch ? "missionary" : "idle");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]["id"]>("bedroom");
  const [lineIdx, setLineIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [beatOn, setBeatOn] = useState(false);
  const [breathOn, setBreathOn] = useState(false);
  const [fucking, setFucking] = useState(!!fromMatch);
  const [showGuy, setShowGuy] = useState(!!fromMatch);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState<string | null>(fromMatch ? "You matched. You're in the room with her now." : null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState("");
  const [sourceTab, setSourceTab] = useState<"library" | "upload">("library");
  const [customRoster, setCustomRoster] = useState<Character[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("velvet-custom-girls");
      const list = raw ? (JSON.parse(raw) as Character[]) : [];
      setCustomRoster(Array.isArray(list) ? list.slice(0, 24) : []);
    } catch { setCustomRoster([]); }
  }, []);

  const girl = useMemo(() => {
    return getCharacter(girlId) || customRoster.find((c) => c.id === girlId) || CHARACTERS.find((c) => c.id === girlId) || CHARACTERS[0];
  }, [girlId, customRoster]);

  const stageRoster = useMemo(() => {
    const seen = new Set<string>();
    const out: Character[] = [];
    for (const c of [...customRoster, ...CHARACTERS]) {
      if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
    }
    return out.slice(0, 36);
  }, [customRoster]);

  const script = SCRIPTS[mode];
  const line = script[Math.min(lineIdx, script.length - 1)];
  const intimacy = girl ? getIntimacy(girl.id, girl.intimacy ?? 40) : 40;
  const locMeta = LOCATIONS.find((l) => l.id === location) || LOCATIONS[0];
  const onStatus = useCallback((s: string | null) => setStatus(s), []);

  useEffect(() => {
    if (uploadPreview) { setTextureUrl(uploadPreview); return; }
    if (!girl) return;
    const spicy = mode === "sex" || mode === "breed" || fucking || SEX_POSES.includes(pose);
    const mood = spicy || intimacy >= 55 ? "explicit" : intimacy >= 40 ? "nude" : "lingerie";
    const extra = mode === "breed" ? `${location} ${pose} breeding creampie explicit` : `${location} ${pose} intimate`;
    setTextureUrl(characterMediaUrl(girl, mood as "lingerie" | "nude" | "explicit", extra));
  }, [girl, intimacy, uploadPreview, mode, pose, fucking, location]);

  useEffect(() => () => { stopJoiBeat(); stopIntimacyAudio(); stopSpeaking(); }, []);

  const speakLine = (text?: string) => {
    const t = text || line;
    setSpeaking(true);
    speak(t, girl?.voice ? { ...girl.voice, whispery: true } : { pitch: 1.05, rate: 0.92 });
    window.setTimeout(() => setSpeaking(false), Math.min(12000, t.length * 55));
  };

  const onUpload = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setSourceTab("upload");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setUploadPreview(dataUrl);
      try { setCharacterFaceSeed(`upload-3d-${Date.now()}`, seedFromPhotoDataUrl(dataUrl)); } catch { /* */ }
      setBusy(false);
      setStatus("Photo locked on the stage — she's yours.");
    };
    reader.onerror = () => { setBusy(false); setStatus("Could not read that image."); };
    reader.readAsDataURL(file);
  };

  const startScene = (m: "sex" | "breed") => {
    setMode(m);
    setPose("missionary");
    setFucking(true);
    setShowGuy(true);
    setLineIdx(0);
    setBeatOn(true);
    startJoiBeat(m === "breed" ? 118 : 110);
    startIntimacyAudio(m === "breed" ? 90 : 80);
    setBreathOn(true);
    setTimeout(() => speakLine(SCRIPTS[m][0]), 200);
    setStatus(m === "breed" ? "Breeding — stay deep, fill her." : "Sex scene live.");
  };

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-20">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm">← Home</button>
      <h1 className="text-3xl text-cream">3D Stage</h1>
      <p className="text-sm text-mist">Upload or library → dual presence, breed/sex/cuck, poses, locations.</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setSourceTab("library")} className={`px-2.5 py-1 rounded-full text-[11px] border ${sourceTab === "library" ? "border-pink-500 bg-pink-500/20" : "border-white/10"}`}>library</button>
        <button type="button" onClick={() => setSourceTab("upload")} className={`px-2.5 py-1 rounded-full text-[11px] border ${sourceTab === "upload" ? "border-pink-500 bg-pink-500/20" : "border-white/10"}`}>upload</button>
        {girl && <button type="button" onClick={() => onChat(girl.id)} className="px-2.5 py-1 rounded-full text-[11px] border border-fuchsia-500/40 text-fuchsia-200">Sextext her</button>}
      </div>
      {sourceTab === "upload" && (
        <label className="flex justify-center rounded-2xl border border-dashed border-pink-500/40 py-6 cursor-pointer">
          <span className="text-sm text-pink-100">{busy ? "Loading…" : "Upload photo → stage"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
        </label>
      )}
      {sourceTab === "library" && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto rounded-2xl border border-white/10 p-2">
          {stageRoster.map((c) => (
            <button key={c.id} type="button" onClick={() => { setGirlId(c.id); setUploadPreview(null); setLineIdx(0); }}
              className={`aspect-[3/4] rounded-lg overflow-hidden border-2 ${c.id === girlId && !uploadPreview ? "border-pink-500" : "border-transparent opacity-80"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.avatar?.startsWith("data:") || c.avatar?.startsWith("http") ? c.avatar : characterMediaUrl(c, "beauty")} alt={c.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <Joi3DScene textureUrl={textureUrl} bgColor={locMeta.color} fogColor={locMeta.fog} showGuy={showGuy} fucking={fucking} speaking={speaking} onStatus={onStatus} />
      {status && <p className="text-xs text-amber-200/90">{status}</p>}
      <div className="flex flex-wrap gap-1.5">
        {LOCATIONS.map((l) => (
          <button key={l.id} type="button" onClick={() => setLocation(l.id)} className={`px-2.5 py-1 rounded-lg text-[11px] border ${location === l.id ? "border-pink-500 bg-pink-500/20" : "border-white/10"}`}>{l.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["sex", "breed", "joi", "cuck", "bnwo", "cheat", "sph"] as StageMode[]).map((m) => (
          <button key={m} type="button" onClick={() => {
            setMode(m); setLineIdx(0);
            if (m === "sex" || m === "cheat" || m === "breed") { setFucking(true); setShowGuy(true); }
          }} className={`px-2.5 py-1 rounded-full text-[11px] border capitalize ${mode === m ? "border-fuchsia-500 bg-fuchsia-500/20" : "border-white/10"}`}>{m}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(POSE_LABELS) as Pose[]).map((p) => (
          <button key={p} type="button" onClick={() => { setPose(p); if (SEX_POSES.includes(p)) { setFucking(true); setShowGuy(true); } }}
            className={`px-2.5 py-1 rounded-lg text-[11px] border ${pose === p ? "border-rose-400 bg-rose-500/20" : "border-white/10"}`}>{POSE_LABELS[p]}</button>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
        <p className="text-sm text-zinc-100 min-h-[2.8rem]">{line}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => startScene("sex")} className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-sm font-semibold">Fuck her</button>
          <button type="button" onClick={() => startScene("breed")} className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-sm font-semibold">Breed her</button>
          <button type="button" onClick={() => { setFucking((f) => !f); if (!fucking) { setShowGuy(true); startJoiBeat(112); setBeatOn(true); } else stopJoiBeat(); }}
            className={`px-3 py-2 rounded-xl border text-sm ${fucking ? "border-rose-400 bg-rose-500/20" : "border-white/15"}`}>{fucking ? "Thrusting ON" : "Thrust"}</button>
          <button type="button" onClick={() => speakLine()} className="px-3 py-2 rounded-xl bg-pink-600 text-sm">Speak</button>
          <button type="button" onClick={() => { const n = Math.min(script.length - 1, lineIdx + 1); setLineIdx(n); setTimeout(() => speakLine(script[n]), 40); }} className="px-3 py-2 rounded-xl border border-white/15 text-sm">Next</button>
          <button type="button" onClick={() => { if (beatOn) { stopJoiBeat(); setBeatOn(false); } else { startJoiBeat(108); setBeatOn(true); } }}
            className={`px-3 py-2 rounded-xl border text-xs ${beatOn ? "border-pink-400 bg-pink-500/20" : "border-white/15"}`}>{beatOn ? "Beat ON" : "Beat"}</button>
          <button type="button" onClick={() => { if (breathOn) { stopIntimacyAudio(); setBreathOn(false); } else { startIntimacyAudio(72); setBreathOn(true); } }}
            className={`px-3 py-2 rounded-xl border text-xs ${breathOn ? "border-fuchsia-400 bg-fuchsia-500/20" : "border-white/15"}`}>{breathOn ? "Breath ON" : "Breath"}</button>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">{girl?.name}{uploadPreview ? " · upload" : ""} · {mode} · {pose} · {location}{fucking ? " · thrusting" : ""} · {intimacy}%</p>
    </div>
  );
}
