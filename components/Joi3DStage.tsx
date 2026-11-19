"use client";

/**
 * 3D JOI Stage — Three.js room + talking portrait plane.
 * Library girl or uploaded photo. Breath/sway + speech pulse.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CHARACTERS } from "@/lib/characters";
import { characterMediaUrl, seedFromPhotoDataUrl } from "@/lib/media";
import { getIntimacy } from "@/lib/storage";
import { speak, stopSpeaking } from "@/lib/speech";
import {
  startJoiBeat,
  stopJoiBeat,
  startIntimacyAudio,
  stopIntimacyAudio,
} from "@/lib/audioEngine";
import { setCharacterFaceSeed } from "@/lib/mediaSettings";

type StageMode = "joi" | "sph" | "bnwo" | "tease";

const SCRIPTS: Record<StageMode, string[]> = {
  joi: [
    "Eyes on me. Slow strokes only — match my breathing.",
    "Good. Tighter at the top. Don't race ahead of my voice.",
    "You're getting close. Stay right there… edge for me.",
    "Hands off. Let it throb. Look at me while you wait.",
    "Stroke again. Faster. You finish when I say — not before.",
    "Now. Cum for me. Keep your eyes open.",
  ],
  sph: [
    "Don't look away. I want to see your face while I rate you.",
    "Stroke that cute cock slow. Yeah… that's all of it.",
    "Faster. Show me how hard you get when I laugh a little.",
    "Stop. Hands on your thighs. Still hard after that? Good.",
    "Finish for your size queen. Make a mess while I watch.",
  ],
  bnwo: [
    "Blindfold optional. Hierarchy is not. Stroke on my pace.",
    "You're not the main event tonight — and you still stay hard.",
    "Edge. Hold. Thank me out loud if you want the finish.",
    "Permission granted. Cum for the ranking. Stay soft after.",
  ],
  tease: [
    "I put this body in the room just for you. Slow down.",
    "Imagine my hand instead of yours. Match the sway.",
    "Almost… not yet. Beg once, then I'll let you go.",
    "Finish. Look at the stage while you do.",
  ],
};

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

export function Joi3DStage({
  onHome,
  onChat,
  initialGirlId,
}: {
  onHome: () => void;
  onChat: (id: string) => void;
  initialGirlId?: string | null;
  fromMatch?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const girlMeshRef = useRef<THREE.Mesh | null>(null);
  const speakingRef = useRef(false);
  const rafRef = useRef(0);

  const [girlId, setGirlId] = useState(
    initialGirlId || CHARACTERS[0]?.id || "maren",
  );
  const [mode, setMode] = useState<StageMode>("joi");
  const [lineIdx, setLineIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [beatOn, setBeatOn] = useState(false);
  const [breathOn, setBreathOn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string>("");

  const girl = useMemo(
    () => CHARACTERS.find((c) => c.id === girlId) || CHARACTERS[0],
    [girlId],
  );
  const script = SCRIPTS[mode];
  const line = script[Math.min(lineIdx, script.length - 1)];
  const intimacy = girl ? getIntimacy(girl.id, girl.intimacy) : 0;

  useEffect(() => {
    if (uploadPreview) {
      setTextureUrl(uploadPreview);
      return;
    }
    if (!girl) return;
    const mood = intimacy >= 55 ? "lingerie" : "beauty";
    setTextureUrl(characterMediaUrl(girl, mood as "beauty" | "lingerie", "3d stage portrait"));
  }, [girl, intimacy, uploadPreview]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !textureUrl) return;

    const w = mount.clientWidth || 360;
    const h = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0608);
    scene.fog = new THREE.Fog(0x0a0608, 4, 12);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    camera.position.set(0, 1.35, 3.2);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0f14, roughness: 0.85, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5),
      new THREE.MeshStandardMaterial({ color: 0x12080e, roughness: 0.9 }),
    );
    back.position.set(0, 2.5, -2);
    scene.add(back);

    const neonMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3, 0.03, 0.03), neonMat);
    strip.position.set(0, 0.02, 1.2);
    scene.add(strip);
    const strip2 = strip.clone();
    strip2.position.set(0, 2.8, -1.5);
    scene.add(strip2);

    scene.add(new THREE.AmbientLight(0xffc0e0, 0.45));
    const key = new THREE.PointLight(0xff66aa, 1.4, 12);
    key.position.set(1.5, 2.5, 2);
    scene.add(key);
    const fill = new THREE.PointLight(0x8866ff, 0.6, 10);
    fill.position.set(-2, 1.5, 1);
    scene.add(fill);

    let cancelled = false;

    loadTexture(textureUrl)
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        const height = 2.2;
        const width = height * (3 / 4);
        const geo = new THREE.PlaneGeometry(width, height, 16, 16);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.setZ(i, Math.sin(pos.getY(i) * 2.2) * 0.02);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.55,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, height / 2 + 0.05, 0);
        scene.add(mesh);
        girlMeshRef.current = mesh;
        setStatus(null);
      })
      .catch(() => setStatus("Couldn't load portrait — try another girl or photo."));

    const clock = new THREE.Clock();
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const m = girlMeshRef.current;
      if (m) {
        const breath = 1 + Math.sin(t * 1.6) * 0.012;
        m.scale.set(breath, breath, 1);
        m.rotation.y = Math.sin(t * 0.7) * 0.06;
        m.position.y = 1.15 + Math.sin(t * 1.6) * 0.015;
        if (speakingRef.current) {
          m.rotation.z = Math.sin(t * 18) * 0.012;
          m.position.z = Math.sin(t * 22) * 0.02;
        } else {
          m.rotation.z *= 0.9;
          m.position.z *= 0.9;
        }
      }
      key.intensity = 1.2 + Math.sin(t * 2) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      stopSpeaking();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) {
            (mat as THREE.MeshStandardMaterial).map?.dispose();
            mat.dispose();
          }
        }
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      girlMeshRef.current = null;
    };
  }, [textureUrl]);

  useEffect(() => () => {
    stopJoiBeat();
    stopIntimacyAudio();
    stopSpeaking();
  }, []);

  const speakLine = () => {
    speakingRef.current = true;
    speak(line, girl?.voice ? { ...girl.voice, whispery: true } : { pitch: 1.05, rate: 0.92 });
    window.setTimeout(() => {
      speakingRef.current = false;
    }, Math.min(12000, line.length * 55));
  };

  const nextLine = () => {
    const n = Math.min(script.length - 1, lineIdx + 1);
    setLineIdx(n);
    setTimeout(() => {
      speakingRef.current = true;
      speak(script[n], girl?.voice ? { ...girl.voice, whispery: true } : undefined);
      window.setTimeout(() => {
        speakingRef.current = false;
      }, Math.min(12000, script[n].length * 55));
    }, 60);
  };

  const onUpload = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setUploadPreview(dataUrl);
      try {
        setCharacterFaceSeed(`upload-3d-${Date.now()}`, seedFromPhotoDataUrl(dataUrl));
      } catch {
        /* */
      }
      setBusy(false);
      setStatus("Photo locked on the stage.");
    };
    reader.onerror = () => {
      setBusy(false);
      setStatus("Could not read that image.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-16">
      <button type="button" onClick={onHome} className="text-pink-400 text-sm hover:text-pink-300">
        ← Home
      </button>
      <h1 className="font-display text-3xl text-cream">3D JOI Stage</h1>
      <p className="text-sm text-mist">
        Library girl or upload → talking stage with breath, sway, and JOI scripts. Full volumetric body mesh from a selfie needs paid AI; this ships free and feels present.
      </p>

      <div className="flex flex-wrap gap-2">
        <label className="px-3 py-2 rounded-xl border border-pink-500/40 text-xs text-pink-100 cursor-pointer hover:bg-pink-500/10">
          {busy ? "Loading…" : "Upload photo → stage"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
        </label>
        {uploadPreview && (
          <button type="button" onClick={() => setUploadPreview(null)} className="px-3 py-2 rounded-xl border border-white/15 text-xs text-zinc-300">
            Use library girl
          </button>
        )}
        {girl && (
          <button type="button" onClick={() => onChat(girl.id)} className="px-3 py-2 rounded-xl border border-fuchsia-500/40 text-xs text-fuchsia-200">
            Open chat · nudes
          </button>
        )}
      </div>

      {!uploadPreview && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto rounded-2xl border border-white/10 p-2 bg-zinc-950/50">
          {CHARACTERS.slice(0, 30).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setGirlId(c.id);
                setUploadPreview(null);
                setLineIdx(0);
              }}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 ${
                c.id === girlId && !uploadPreview ? "border-pink-500" : "border-transparent opacity-80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterMediaUrl(c, "beauty")} alt={c.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div
        ref={mountRef}
        className="relative w-full aspect-[3/4] max-h-[min(70vh,560px)] rounded-3xl overflow-hidden border border-pink-500/40 bg-black shadow-[0_0_60px_rgba(236,72,153,0.25)]"
      />
      {status && <p className="text-xs text-amber-200/90">{status}</p>}

      <div className="flex flex-wrap gap-1.5">
        {(["joi", "sph", "bnwo", "tease"] as StageMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setLineIdx(0);
            }}
            className={`px-3 py-1.5 rounded-full text-xs border capitalize ${
              mode === m ? "border-pink-500 bg-pink-500/20 text-pink-100" : "border-white/10 text-zinc-400"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
        <p className="text-sm text-zinc-100 leading-relaxed">{line}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={speakLine} className="px-3 py-2 rounded-xl bg-pink-600 text-sm font-medium">
            Speak
          </button>
          <button type="button" onClick={nextLine} className="px-3 py-2 rounded-xl border border-white/15 text-sm">
            Next line
          </button>
          <button
            type="button"
            onClick={() => {
              if (beatOn) {
                stopJoiBeat();
                setBeatOn(false);
              } else {
                startJoiBeat(108);
                setBeatOn(true);
              }
            }}
            className={`px-3 py-2 rounded-xl border text-xs ${
              beatOn ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-white/15 text-zinc-300"
            }`}
          >
            {beatOn ? "Beat ON" : "Stroke beat"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (breathOn) {
                stopIntimacyAudio();
                setBreathOn(false);
              } else {
                startIntimacyAudio(72);
                setBreathOn(true);
              }
            }}
            className={`px-3 py-2 rounded-xl border text-xs ${
              breathOn ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200" : "border-white/15 text-zinc-300"
            }`}
          >
            {breathOn ? "Breath ON" : "Breath"}
          </button>
        </div>
      </div>
    </div>
  );
}
