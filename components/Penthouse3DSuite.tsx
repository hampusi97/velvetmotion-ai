"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CHARACTERS, type Character } from "@/lib/characters";
import { computeMoodState } from "@/lib/moodEngine";
import { bumpIntimacy, getIntimacy } from "@/lib/storage";
import { speak } from "@/lib/speech";
import {
  SUITE_HOTSPOTS,
  LIGHTING_PRESETS,
  createInitialSuiteState,
  startSuiteSession,
  togglePauseSuite,
  resetSuiteSession,
  cycleLightingPreset,
  triggerHotspotInteraction,
  stepPlayerMovement,
  type HotspotId,
  type LightingPresetId,
  type SuiteState,
} from "@/lib/penthouseSuiteLogic";

interface Penthouse3DSuiteProps {
  onHome: () => void;
  onOpenChat: (characterId: string) => void;
}

function createHerringboneFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#160b1c";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 64) {
        ctx.fillStyle = (x + y) % 64 === 0 ? "#22102b" : "#1a0c22";
        ctx.fillRect(x + 2, y + 2, 60, 28);
        ctx.strokeStyle = "rgba(244, 114, 182, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, 60, 28);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTuftedVelvetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#4a0e2e";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#831843";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(128, 128 - i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128 - i, 128);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

export function Penthouse3DSuite({ onHome, onOpenChat }: Penthouse3DSuiteProps) {
  const [companionId, setCompanionId] = useState<string>(CHARACTERS[0].id);
  const companion: Character = useMemo(
    () => CHARACTERS.find((c) => c.id === companionId) || CHARACTERS[0],
    [companionId],
  );

  const [suiteState, setSuiteState] = useState<SuiteState>(() =>
    createInitialSuiteState(CHARACTERS[0].id, getIntimacy(CHARACTERS[0].id, CHARACTERS[0].intimacy)),
  );
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SuiteState>(suiteState);
  stateRef.current = suiteState;
  const keysRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const moodState = useMemo(
    () =>
      computeMoodState({
        character: companion,
        messages: [{ role: "assistant", content: suiteState.lastNarrative }],
        durationSeconds: suiteState.interactionsCount * 45 + 30,
        intimacy: suiteState.intimacy,
        romanceMode: suiteState.lighting === "candlelight",
        giftCount: suiteState.visitedHotspots.length,
      }),
    [companion, suiteState.lastNarrative, suiteState.interactionsCount, suiteState.intimacy, suiteState.lighting, suiteState.visitedHotspots.length],
  );

  // Mirror state to document.body.dataset.state for automated verification
  useEffect(() => {
    document.body.dataset.state = suiteState.phase;
    return () => {
      delete document.body.dataset.state;
    };
  }, [suiteState.phase]);

  // Check ?autostart=1 query parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autostart") === "1") {
        setSuiteState((prev) => startSuiteSession(prev));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSelectCompanion = (nextId: string) => {
    setCompanionId(nextId);
    const char = CHARACTERS.find((c) => c.id === nextId) || CHARACTERS[0];
    const savedInt = getIntimacy(char.id, char.intimacy);
    setSuiteState((prev) => ({
      ...createInitialSuiteState(char.id, savedInt),
      phase: prev.phase,
      lighting: prev.lighting,
    }));
  };

  const handleStartSuite = useCallback(() => {
    setSuiteState((prev) => startSuiteSession(prev));
  }, []);

  const handleHotspotTrigger = useCallback(
    (hotspotId: HotspotId) => {
      setSuiteState((prev) => {
        const next = triggerHotspotInteraction(prev, hotspotId);
        if (next.intimacy > prev.intimacy) {
          bumpIntimacy(companion.id, next.intimacy - prev.intimacy);
        }
        const spot = SUITE_HOTSPOTS.find((h) => h.id === hotspotId);
        if (spot) {
          speak(spot.dialogue, companion.voice);
        }
        return next;
      });
    },
    [companion],
  );

  const handleGenerateSoundtrack = useCallback(async () => {
    if (musicLoading) return;
    setMusicLoading(true);
    setMusicTitle(null);
    const url = (process.env.NEXT_PUBLIC_MUSIC_WORKER_URL || "").trim();
    if (!url) {
      setMusicTitle("Music generation is not connected. Configure an approved audio service.");
      setMusicLoading(false);
      return;
    }
    try {
      const preset = LIGHTING_PRESETS[stateRef.current.lighting];
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "lyria-3-clip-preview",
          prompt: `Original instrumental ${preset.name} penthouse lounge soundtrack with warm synth pads and cinematic atmosphere for fictional character ${companion.name}`,
        }),
      });
      if (!res.ok) throw new Error(`Music service returned HTTP ${res.status}`);
      const data = (await res.json()) as { audioUrl?: string; title?: string };
      if (!data.audioUrl || !data.audioUrl.startsWith("https://")) throw new Error("Music service returned no valid HTTPS audio URL");
      setMusicUrl(data.audioUrl);
      setMusicTitle(data.title || `${preset.name} Lounge Track`);
    } catch (error) {
      setMusicTitle(error instanceof Error ? error.message : "Music provider unavailable.");
    } finally {
      setMusicLoading(false);
    }
  }, [companion.name, musicLoading]);

  // Keyboard listeners for Title start, Pause, WASD, Lighting, Controls dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }

      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (stateRef.current.phase === "title" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setSuiteState((prev) => startSuiteSession(prev));
        return;
      }

      if (stateRef.current.phase === "victory" && (key === "r" || e.key === "Enter")) {
        e.preventDefault();
        setSuiteState((prev) => resetSuiteSession(prev, 45));
        return;
      }

      if (key === "p" || e.key === "Escape") {
        e.preventDefault();
        setSuiteState((prev) => togglePauseSuite(prev));
        return;
      }

      if (key === "h") {
        e.preventDefault();
        setControlsExpanded((c) => !c);
        return;
      }

      if (key === "1") setSuiteState((prev) => cycleLightingPreset(prev, "boudoir"));
      if (key === "2") setSuiteState((prev) => cycleLightingPreset(prev, "candlelight"));
      if (key === "3") setSuiteState((prev) => cycleLightingPreset(prev, "cyber-neon"));
      if (key === "4") setSuiteState((prev) => cycleLightingPreset(prev, "afterglow"));
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const initialPreset = LIGHTING_PRESETS[stateRef.current.lighting];
    scene.background = new THREE.Color(initialPreset.fogHex);
    scene.fog = new THREE.FogExp2(initialPreset.fogHex, 0.032);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 120);
    camera.position.set(0, 2.2, 5.2);
    camera.lookAt(0, 1.3, -1.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    // Detect Software WebGL (SwiftShader / llvmpipe) per games_3d.md
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererStr =
      (dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "") +
      " " +
      String(gl.getParameter(gl.RENDERER));
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic Render/i.test(
      rendererStr,
    );

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = initialPreset.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Environment Map for Realistic PBR Metallic & Glass Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Lighting Setup: Warm Directional Key + Cool Hemisphere Fill + Boudoir Point Lights
    const hemiLight = new THREE.HemisphereLight(
      initialPreset.fillHex,
      initialPreset.groundHex,
      0.9,
    );
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialPreset.keyHex, 2.5);
    keyLight.position.set(5, 8, 4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const bedLight = new THREE.PointLight(0xff5c8a, 3.2, 9);
    bedLight.position.set(-3.2, 2.8, -2.2);
    scene.add(bedLight);

    const tableLight = new THREE.PointLight(0xffb74d, 2.8, 7);
    tableLight.position.set(2.8, 1.8, -1.5);
    scene.add(tableLight);

    // Procedural Textures
    const floorTex = createHerringboneFloorTexture();
    const velvetTex = createTuftedVelvetTexture();

    // Penthouse Floor & Rug
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.15,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x3b0a26,
      bumpMap: velvetTex,
      bumpScale: 0.03,
      roughness: 0.82,
    });
    const rugMesh = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), rugMat);
    rugMesh.rotation.x = -Math.PI / 2;
    rugMesh.position.set(0, 0.01, -0.8);
    scene.add(rugMesh);

    const interactiveHitMeshes: THREE.Object3D[] = [];

    // =========================================================================
    // 1. COMPOSITE GROUP: Luxury Four-Poster Velvet Canopy Bed (10 parts)
    // =========================================================================
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-3.2, 0, -2.2);
    bedGroup.rotation.y = 0.28;
    bedGroup.userData = { hotspotId: "bed" as HotspotId };

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1c0d18,
      roughness: 0.4,
      metalness: 0.2,
    });
    const brassGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.88,
    });
    const silkSheetMat = new THREE.MeshStandardMaterial({
      color: 0x9d174d,
      bumpMap: velvetTex,
      bumpScale: 0.02,
      roughness: 0.45,
      metalness: 0.12,
    });
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.55,
    });

    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 3.0), darkWoodMat);
    bedBase.position.y = 0.18;
    bedGroup.add(bedBase);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.36, 2.8), silkSheetMat);
    mattress.position.y = 0.52;
    bedGroup.add(mattress);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.45, 0.22), silkSheetMat);
    headboard.position.set(0, 1.2, -1.38);
    bedGroup.add(headboard);

    const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.52), pillowMat);
    pillowL.position.set(-0.55, 0.8, -1.0);
    pillowL.rotation.x = 0.25;
    bedGroup.add(pillowL);

    const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.52), pillowMat);
    pillowR.position.set(0.55, 0.8, -1.0);
    pillowR.rotation.x = 0.25;
    bedGroup.add(pillowR);

    const postOffsets: [number, number][] = [
      [-1.22, -1.42],
      [1.22, -1.42],
      [-1.22, 1.42],
      [1.22, 1.42],
    ];
    for (const [px, pz] of postOffsets) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 16), brassGoldMat);
      post.position.set(px, 1.4, pz);
      bedGroup.add(post);
    }

    const canopyFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.08, 2.95), brassGoldMat);
    canopyFrame.position.y = 2.8;
    bedGroup.add(canopyFrame);

    bedGroup.traverse((c) => {
      c.userData = { hotspotId: "bed" as HotspotId };
      if ((c as THREE.Mesh).isMesh) interactiveHitMeshes.push(c);
    });
    scene.add(bedGroup);

    // =========================================================================
    // 2. COMPOSITE GROUP: Champagne & Candlelight Lounge Table (8 parts)
    // =========================================================================
    const tableGroup = new THREE.Group();
    tableGroup.position.set(2.8, 0, -1.5);
    tableGroup.userData = { hotspotId: "champagne" as HotspotId };

    const smokedGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2e1035,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.85,
    });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 32), smokedGlassMat);
    tableTop.position.y = 0.82;
    tableGroup.add(tableTop);

    const tablePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 20), brassGoldMat);
    tablePedestal.position.y = 0.4;
    tableGroup.add(tablePedestal);

    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.06, 28), brassGoldMat);
    tableBase.position.y = 0.03;
    tableGroup.add(tableBase);

    const iceBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 20), brassGoldMat);
    iceBucket.position.set(-0.22, 1.01, -0.1);
    tableGroup.add(iceBucket);

    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.18,
      metalness: 0.35,
    });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.48, 16), bottleMat);
    bottle.position.set(-0.22, 1.18, -0.1);
    bottle.rotation.z = -0.18;
    tableGroup.add(bottle);

    const flute1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.28, 14), smokedGlassMat);
    flute1.position.set(0.24, 0.99, 0.15);
    tableGroup.add(flute1);

    const flute2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.28, 14), smokedGlassMat);
    flute2.position.set(0.42, 0.99, -0.08);
    tableGroup.add(flute2);

    const candleFlameMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf97316,
      emissiveIntensity: 2.4,
    });
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 14), candleFlameMat);
    candle.position.set(0.05, 0.95, 0.28);
    tableGroup.add(candle);

    tableGroup.traverse((c) => {
      c.userData = { hotspotId: "champagne" as HotspotId };
      if ((c as THREE.Mesh).isMesh) interactiveHitMeshes.push(c);
    });
    scene.add(tableGroup);

    // =========================================================================
    // 3. COMPOSITE GROUP: Kinetic Companion Silhouette Stage (9 parts)
    // =========================================================================
    const companionGroup = new THREE.Group();
    companionGroup.position.set(0, 0, -0.4);
    companionGroup.userData = { hotspotId: "companion" as HotspotId };

    const stagePlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.28, 0.18, 36),
      darkWoodMat,
    );
    stagePlinth.position.y = 0.09;
    companionGroup.add(stagePlinth);

    const stageRimMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xec4899,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const stageRim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.035, 16, 48), stageRimMat);
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.18;
    companionGroup.add(stageRim);

    const figurePivot = new THREE.Group();
    figurePivot.position.y = 0.18;

    const skinSculptMat = new THREE.MeshStandardMaterial({
      color: 0xf5c6b8,
      emissive: 0x9d174d,
      emissiveIntensity: 0.28,
      roughness: 0.28,
      metalness: 0.22,
    });
    const gownMat = new THREE.MeshStandardMaterial({
      color: 0xbe185d,
      emissive: 0x831843,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.4,
    });

    const hipsMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.85, 24), gownMat);
    hipsMesh.position.y = 0.45;
    figurePivot.add(hipsMesh);

    const waistMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.52, 24), skinSculptMat);
    waistMesh.position.y = 1.05;
    figurePivot.add(waistMesh);

    const bustMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), gownMat);
    bustMesh.scale.set(1.15, 0.85, 0.95);
    bustMesh.position.set(0, 1.24, 0.06);
    figurePivot.add(bustMesh);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 24), skinSculptMat);
    headMesh.position.set(0, 1.66, 0);
    figurePivot.add(headMesh);

    const hairCascade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.26, 0.65, 20),
      new THREE.MeshStandardMaterial({ color: 0x1e1024, roughness: 0.5 }),
    );
    hairCascade.position.set(0, 1.5, -0.08);
    figurePivot.add(hairCascade);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.02, 16, 48), stageRimMat);
    haloRing.position.set(0, 1.35, -0.25);
    figurePivot.add(haloRing);

    companionGroup.add(figurePivot);

    companionGroup.traverse((c) => {
      c.userData = { hotspotId: "companion" as HotspotId };
      if ((c as THREE.Mesh).isMesh) interactiveHitMeshes.push(c);
    });
    scene.add(companionGroup);

    // =========================================================================
    // 4. COMPOSITE GROUP: Skyline Panorama Window & Neon Archway (7 parts)
    // =========================================================================
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(0, 0, -5.2);
    skylineGroup.userData = { hotspotId: "balcony" as HotspotId };

    const neonArchMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xd946ef,
      emissiveIntensity: 1.8,
    });
    const neonArch = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.06, 16, 48, Math.PI),
      neonArchMat,
    );
    neonArch.position.set(0, 0.2, 0);
    skylineGroup.add(neonArch);

    const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.08, 0.08), brassGoldMat);
    balconyRail.position.set(0, 1.1, 0.3);
    skylineGroup.add(balconyRail);

    for (let i = -2; i <= 2; i++) {
      const towerHeight = 1.6 + Math.abs((i * 7) % 3) * 0.85;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, towerHeight, 0.45),
        new THREE.MeshStandardMaterial({
          color: 0x140921,
          emissive: i % 2 === 0 ? 0xf43f5e : 0xa855f7,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        }),
      );
      tower.position.set(i * 1.45, towerHeight / 2, -1.2);
      skylineGroup.add(tower);
    }

    skylineGroup.traverse((c) => {
      c.userData = { hotspotId: "balcony" as HotspotId };
      if ((c as THREE.Mesh).isMesh) interactiveHitMeshes.push(c);
    });
    scene.add(skylineGroup);

    // =========================================================================
    // 5. INSTANCED MESH: 36 Floating Candlelight Embers & Rose Petals
    // =========================================================================
    const emberCount = 36;
    const emberGeo = new THREE.OctahedronGeometry(0.045, 0);
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xfb7185,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const emberInstances = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
    const dummy = new THREE.Object3D();
    const emberSeeds = Array.from({ length: emberCount }, (_, i) => ({
      x: ((i * 73) % 100) / 10 - 5.0,
      y: ((i * 31) % 35) / 10 + 0.3,
      z: ((i * 53) % 90) / 10 - 4.8,
      speed: 0.25 + (i % 5) * 0.08,
      phase: i * 0.6,
    }));
    scene.add(emberInstances);

    // Raycaster for clicking 3D hotspots
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      if (stateRef.current.phase !== "playing") return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveHitMeshes, false);
      if (hits.length > 0) {
        const hitHotspot = hits[0].object.userData?.hotspotId as HotspotId | undefined;
        if (hitHotspot) {
          handleHotspotTrigger(hitHotspot);
        }
      }
    };
    renderer.domElement.addEventListener("mousedown", onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation & Pacing Loop (using performance.now() to avoid THREE.Clock deprecation & GPU stalls)
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let timerId = 0;
    let rafId = 0;
    let disposed = false;

    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3(0, 1.3, -1.2);

    const syncPixel = new Uint8Array(4);
    const scheduleNextFrame = () => {
      if (disposed) return;
      if (isSoftwareGl) {
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
        timerId = window.setTimeout(tick, 50);
      } else {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDelta = (nowMs - lastTimeMs) / 1000;
      lastTimeMs = nowMs;
      const dt = Math.min(rawDelta, 0.1);
      const elapsed = (nowMs - startTimeMs) / 1000;
      const current = stateRef.current;

      // Apply active lighting preset smoothly
      const preset = LIGHTING_PRESETS[current.lighting];
      (scene.background as THREE.Color).lerp(new THREE.Color(preset.fogHex), 0.08);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(preset.fogHex), 0.08);
      }
      keyLight.color.lerp(new THREE.Color(preset.keyHex), 0.08);
      hemiLight.color.lerp(new THREE.Color(preset.fillHex), 0.08);
      renderer.toneMappingExposure = preset.exposure;

      if (current.phase !== "paused") {
        // Animate companion breathing, sway, and pose rotation
        const targetPoseRot = current.poseIndex * (Math.PI * 0.35);
        figurePivot.rotation.y = THREE.MathUtils.lerp(
          figurePivot.rotation.y,
          Math.sin(elapsed * 1.1) * 0.22 + targetPoseRot,
          0.06,
        );
        figurePivot.position.y = 0.18 + Math.sin(elapsed * 2.2) * 0.03;
        haloRing.rotation.z = elapsed * 0.6;

        // Animate floating instanced candlelight embers
        for (let i = 0; i < emberCount; i++) {
          const s = emberSeeds[i];
          const y = ((s.y + elapsed * s.speed) % 3.6) + 0.25;
          const x = s.x + Math.sin(elapsed * 0.9 + s.phase) * 0.28;
          const z = s.z + Math.cos(elapsed * 0.8 + s.phase) * 0.28;
          dummy.position.set(x, y, z);
          dummy.rotation.set(elapsed + i, elapsed * 0.7, 0);
          dummy.updateMatrix();
          emberInstances.setMatrixAt(i, dummy.matrix);
        }
        emberInstances.instanceMatrix.needsUpdate = true;
      }

      if (current.phase === "title") {
        // Slow cinematic orbit around the Penthouse on the Title screen
        const orbitAngle = elapsed * 0.24;
        camera.position.set(
          Math.sin(orbitAngle) * 5.2,
          2.35 + Math.sin(elapsed * 0.5) * 0.18,
          Math.cos(orbitAngle) * 5.2,
        );
        camera.lookAt(0, 1.25, -1.2);
      } else if (current.phase === "playing") {
        const keys = keysRef.current;
        const forward =
          (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
        const strafe =
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
        const turn = (keys.has("q") ? 1 : 0) - (keys.has("e") ? 1 : 0);

        if (forward !== 0 || strafe !== 0 || turn !== 0) {
          const moved = stepPlayerMovement(current, { forward, strafe, turn }, dt);
          stateRef.current = moved;
        }

        const pos = stateRef.current.playerPos;
        targetCamPos.set(pos.x, 1.85, pos.z);
        camera.position.lerp(targetCamPos, 1 - Math.exp(-7 * dt));
        camera.lookAt(targetLookAt);
      }

      renderer.render(scene, camera);
      scheduleNextFrame();
    }

    scheduleNextFrame();

    return () => {
      disposed = true;
      window.clearTimeout(timerId);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onPointerDown);
      floorTex.dispose();
      velvetTex.dispose();
      envTarget?.dispose();
      renderer.dispose();
    };
  }, [handleHotspotTrigger]);

  const activeLighting = LIGHTING_PRESETS[suiteState.lighting];

  return (
    <div className="relative w-full h-[86vh] min-h-[580px] rounded-3xl overflow-hidden border border-pink-500/30 bg-[#08040c] select-none">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* TITLE SCREEN OVERLAY */}
      {suiteState.phase === "title" && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(16, 6, 24, 0.45) 0%, rgba(8, 3, 12, 0.84) 100%)",
          }}
        >
          <div className="max-w-lg w-full rounded-3xl border border-pink-500/35 bg-[#0e0616]/90 p-7 shadow-2xl space-y-5">
            {/* Custom Bespoke Inline SVG Emblem */}
            <div className="mx-auto w-20 h-20">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <defs>
                  <linearGradient id="penthouseCrest" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="50%" stopColor="#e879f9" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <polygon
                  points="60,8 108,36 108,84 60,112 12,84 12,36"
                  fill="rgba(236,72,153,0.14)"
                  stroke="url(#penthouseCrest)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="30"
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <path
                  d="M60 32 C74 46 78 64 60 88 C42 64 46 46 60 32 Z"
                  fill="url(#penthouseCrest)"
                  opacity="0.88"
                />
                <circle cx="60" cy="56" r="6" fill="#0e0616" />
              </svg>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-pink-300 font-semibold">
                Interactive 3D Intimacy Experience
              </p>
              <h1
                className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ textShadow: "0 4px 24px rgba(236,72,153,0.55)" }}
              >
                THE VELVET PENTHOUSE
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                Explore the candlelit 3D suite with {companion.name}. Trigger private boudoir hotspots, shift lighting moods, and build closeness to 100%.
              </p>
            </div>

            {/* Companion Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-zinc-400 block">
                Select Penthouse Companion
              </label>
              <div className="flex flex-wrap justify-center gap-1.5">
                {CHARACTERS.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCompanion(c.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                      c.id === companion.id
                        ? "border-pink-400 bg-pink-600/30 text-white"
                        : "border-white/15 bg-black/50 text-zinc-300 hover:border-pink-400/50"
                    }`}
                  >
                    {c.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={handleStartSuite}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white font-semibold text-sm shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-fuchsia-500 transition"
              >
                Enter Penthouse Suite (Enter / Space)
              </button>
              <button
                type="button"
                onClick={onHome}
                className="py-3.5 px-4 rounded-2xl border border-white/15 bg-black/50 text-xs text-zinc-300 hover:text-white"
              >
                ← Back Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING HUD: Translucent Top Status Bar (Zero backdrop-filter) */}
      {suiteState.phase !== "title" && (
        <header className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#0b0512]/85 px-4 py-2 text-xs pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              type="button"
              onClick={onHome}
              className="text-pink-400 hover:text-pink-300 font-medium"
            >
              ← Exit Suite
            </button>
            <span className="font-semibold text-white">{companion.name}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${moodState.badgeClass}`}>
              {moodState.statusText}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Closeness</span>
              <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-400 transition-all duration-300"
                  style={{ width: `${suiteState.intimacy}%` }}
                />
              </div>
              <span className="font-mono font-semibold text-pink-300">{suiteState.intimacy}%</span>
            </div>
            <span className="text-zinc-300 hidden sm:inline">
              Hotspots:{" "}
              <strong className="text-amber-300">
                {suiteState.visitedHotspots.length}/{SUITE_HOTSPOTS.length}
              </strong>
            </span>
            <span className="text-fuchsia-300 hidden md:inline">{activeLighting.name}</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => void handleGenerateSoundtrack()}
              disabled={musicLoading}
              className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/20 px-2.5 py-1 text-[11px] text-fuchsia-200 hover:bg-fuchsia-500/30 disabled:opacity-50"
            >
              {musicLoading ? "Composing…" : "♪ Connected music service"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChat(companion.id)}
              className="rounded-xl border border-pink-500/40 bg-pink-500/20 px-2.5 py-1 text-[11px] text-pink-200 hover:bg-pink-500/30"
            >
              Chat Live
            </button>
            <button
              type="button"
              onClick={() => setSuiteState((prev) => togglePauseSuite(prev))}
              className="rounded-xl border border-white/15 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-200"
            >
              {suiteState.phase === "paused" ? "Resume [P]" : "Pause [P]"}
            </button>
          </div>
        </header>
      )}

      {/* Active Narrative & Quick Hotspot Strip */}
      {suiteState.phase === "playing" && (
        <div className="absolute bottom-14 left-3 right-3 z-10 flex flex-col items-center gap-2 pointer-events-none">
          {musicTitle && !musicUrl && (
            <p role="status" className="pointer-events-auto rounded-xl border border-fuchsia-300/20 bg-[#0d0616]/90 px-3 py-2 text-xs text-fuchsia-200">{musicTitle}</p>
          )}
          {musicUrl && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-fuchsia-500/30 bg-[#0d0616]/90 px-3.5 py-1.5 text-xs text-fuchsia-200">
              <span className="truncate max-w-xs">{musicTitle}</span>
              <audio ref={audioRef} src={musicUrl} controls autoPlay loop className="h-7 w-44" />
            </div>
          )}

          <div className="max-w-xl w-full rounded-2xl border border-pink-500/30 bg-[#0c0514]/90 px-4 py-2.5 text-center shadow-lg">
            <p className="text-xs sm:text-sm text-pink-100 leading-snug">{suiteState.lastNarrative}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 pointer-events-auto">
            {SUITE_HOTSPOTS.map((spot) => {
              const visited = suiteState.visitedHotspots.includes(spot.id);
              const active = suiteState.activeHotspot === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleHotspotTrigger(spot.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-pink-400 bg-pink-600 text-white shadow-md shadow-pink-600/30"
                      : visited
                        ? "border-emerald-500/40 bg-[#101f1a]/90 text-emerald-200"
                        : "border-white/15 bg-[#12091c]/90 text-zinc-200 hover:border-pink-400/50"
                  }`}
                >
                  {spot.label} {visited ? "✓" : `+${spot.intimacyBoost}%`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK (Zero backdrop-filter) */}
      {suiteState.phase !== "title" && (
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setControlsExpanded((v) => !v)}
              className="rounded-xl border border-white/15 bg-[#0c0514]/90 px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-pink-500/40"
            >
              {controlsExpanded ? "Hide Controls [H]" : "Controls & Lighting [H]"}
            </button>
            {controlsExpanded && (
              <div className="rounded-xl border border-white/15 bg-[#0c0514]/95 px-3 py-1.5 text-[11px] text-zinc-300 flex flex-wrap items-center gap-3">
                <span>
                  <strong className="text-pink-300">WASD / Arrows</strong> Walk
                </span>
                <span>
                  <strong className="text-pink-300">Click 3D Objects</strong> Interact
                </span>
                <span>
                  <strong className="text-pink-300">1–4</strong> Lighting
                </span>
                <span>
                  <strong className="text-pink-300">P / Esc</strong> Pause
                </span>
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((presetKey, idx) => (
              <button
                key={presetKey}
                type="button"
                onClick={() => setSuiteState((prev) => cycleLightingPreset(prev, presetKey))}
                className={`rounded-xl border px-2.5 py-1 text-[11px] transition ${
                  suiteState.lighting === presetKey
                    ? "border-pink-400 bg-pink-600/30 text-pink-100"
                    : "border-white/10 bg-[#0c0514]/90 text-zinc-400 hover:text-white"
                }`}
              >
                {idx + 1}. {LIGHTING_PRESETS[presetKey].name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {suiteState.phase === "paused" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-6">
          <div className="max-w-sm w-full rounded-3xl border border-pink-500/30 bg-[#0e0616] p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Penthouse Paused</h2>
            <p className="text-xs text-zinc-400">
              Closeness with {companion.name}: {suiteState.intimacy}% · {suiteState.visitedHotspots.length}/4 hotspots explored.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSuiteState((prev) => togglePauseSuite(prev))}
                className="w-full py-3 rounded-2xl bg-pink-600 font-semibold text-sm text-white"
              >
                Resume Suite (P / Esc)
              </button>
              <button
                type="button"
                onClick={() => setSuiteState((prev) => resetSuiteSession(prev, 40))}
                className="w-full py-2.5 rounded-2xl border border-white/15 text-xs text-zinc-300"
              >
                Restart Session
              </button>
              <button
                type="button"
                onClick={onHome}
                className="w-full py-2.5 rounded-2xl border border-white/10 text-xs text-zinc-400"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / SUITE CLIMAX MODAL */}
      {suiteState.phase === "victory" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-6">
          <div className="max-w-md w-full rounded-3xl border border-pink-500/40 bg-[#11061a] p-7 text-center space-y-4 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.25em] text-pink-400 font-semibold">
              100% Closeness Reached
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              Penthouse Afterglow with {companion.name}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Every corner of the Velvet Suite has been unlocked. {companion.name} is now at 100% intimacy ({moodState.label} mood) — all portrait, lingerie, nude, explicit, and motion video tiers are unlocked in private chat.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onOpenChat(companion.id)}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white font-semibold text-sm"
              >
                Open Private Chat (100% Unlocked)
              </button>
              <button
                type="button"
                onClick={() => setSuiteState((prev) => resetSuiteSession(prev, 50))}
                className="py-3.5 px-4 rounded-2xl border border-white/15 text-xs text-zinc-200"
              >
                Replay Suite [R]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
