"use client";

import { useEffect, useRef, useState } from "react";
import type { Object3D, WebGLRenderer } from "three";
import { loadVrmAvatar } from "@/lib/vrmAvatarStore";

/**
 * Experimental, self-hosted VRM 0.x/1.0 GLB preview using the installed Three.js loader.
 * This renders geometry/materials and available morph targets, not the full VRM
 * humanoid / spring-bone / MToon runtime. It never loads remote avatar assets.
 */
export function VrmAvatarViewer({
  characterId, revision = 0, speaking = false, listening = false,
}: {
  characterId: string; revision?: number; speaking?: boolean; listening?: boolean;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const speakingRef = useRef(speaking);
  const listeningRef = useRef(listening);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { speakingRef.current = speaking; listeningRef.current = listening; }, [speaking, listening]);

  useEffect(() => {
    let cancelled = false;
    setBuffer(null);
    setError(null);
    void loadVrmAvatar(characterId).then(data => {
      if (!cancelled) {
        if (data) setBuffer(data);
        else setError("No VRM model saved for this companion. Choose a local .vrm file.");
      }
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load VRM model."); });
    return () => { cancelled = true; };
  }, [characterId, revision]);

  useEffect(() => {
    const target = container.current;
    if (!buffer || !target) return;
    let dead = false;
    let frame = 0;
    let renderer: WebGLRenderer | null = null;
    let root: Object3D | null = null;
    let observer: ResizeObserver | null = null;
    let resize: (() => void) | null = null;
    const load = async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (dead) return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 250);
        scene.add(new THREE.HemisphereLight(0xe1d8ff, 0x39314e, 2.1));
        const key = new THREE.DirectionalLight(0xffd7e6, 2.1);
        key.position.set(2, 4, 6);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x90a9ff, 1.25);
        fill.position.set(-4, 2, -2);
        scene.add(fill);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.setAttribute("aria-label", "Animated 3D VRM companion preview");
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        target.appendChild(renderer.domElement);

        const loader = new GLTFLoader();
        const gltf = await new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((resolve, reject) => {
          loader.parse(buffer, "", resolve, reject);
        });
        if (dead) {
          gltf.scene.traverse(child => {
            const m = child as THREE.Mesh;
            if (m.isMesh) m.geometry?.dispose();
          });
          return;
        }
        root = gltf.scene;
        scene.add(root);
        const bbox = new THREE.Box3().setFromObject(root);
        if (bbox.isEmpty()) throw new Error("VRM contains no renderable model.");
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        root.position.sub(center);
        const distance = Math.max(2, Math.max(size.y * 1.9, size.x * 2.25, size.z * 2.25));
        camera.position.set(0, Math.min(size.y * .05, .3), distance);
        camera.lookAt(0, 0, 0);
        resize = () => {
          if (!target || !renderer) return;
          const w = Math.max(1, target.clientWidth);
          const h = Math.max(1, target.clientHeight);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };
        resize();
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(resize);
          observer.observe(target);
        }
        const morphs: Array<{ influences: number[]; mouth: number[]; blink: number[] }> = [];
        root.traverse(child => {
          const mesh = child as THREE.Mesh & {
            morphTargetDictionary?: Record<string, number>;
            morphTargetInfluences?: number[];
          };
          if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
          const dictionary = mesh.morphTargetDictionary;
          const mouth: number[] = [];
          const blink: number[] = [];
          for (const [name, index] of Object.entries(dictionary)) {
            if (/^(aa|a|fcl_mth_a|mouthopen|mouth_open|viseme_aa)$/i.test(name)) mouth.push(index);
            if (/^(blink|fcl_eye_close|blinkleft|blinkright)$/i.test(name)) blink.push(index);
          }
          if (mouth.length || blink.length) morphs.push({ influences: mesh.morphTargetInfluences, mouth, blink });
        });
        const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const tick = (now: number) => {
          if (dead || !renderer || !root) return;
          const t = now / 1000;
          if (!prefersReduced) {
            root.rotation.y = Math.sin(t * .55) * (listeningRef.current ? .07 : .045);
            root.rotation.z = Math.sin(t * .65) * .008;
          }
          const mouthValue = speakingRef.current && !prefersReduced
            ? Math.max(.03, .22 + .48 * Math.abs(Math.sin(t * 11.7))) : 0;
          const blinkValue = prefersReduced ? 0 : Math.pow(Math.max(0, Math.sin(t * 1.37)), 55);
          for (const { influences, mouth, blink } of morphs) {
            mouth.forEach(index => { influences[index] = mouthValue; });
            blink.forEach(index => { influences[index] = blinkValue; });
          }
          renderer.render(scene, camera);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : "Unable to render VRM avatar.");
      }
    };
    void load();
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (root) root.traverse(child => {
        const mesh = child as import("three").Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          material?.dispose();
        }
      });
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [buffer]);

  return (
    <div className="relative h-full min-h-56 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#2d1c35] to-[#100a18]">
      <div ref={container} className="absolute inset-0" role="img" aria-label="3D avatar canvas" />
      {error && (
        <div role="status" className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-amber-200">
          {error}
        </div>
      )}
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[10px] text-zinc-200">
        Experimental VRM preview · locally stored
      </span>
    </div>
  );
}
