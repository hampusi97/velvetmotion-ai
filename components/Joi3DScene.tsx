"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      resolve(tex);
    }, undefined, reject);
  });
}

export function Joi3DScene({
  textureUrl,
  bgColor,
  fogColor,
  showGuy,
  fucking,
  speaking,
  onStatus,
}: {
  textureUrl: string;
  bgColor: number;
  fogColor: number;
  showGuy: boolean;
  fucking: boolean;
  speaking: boolean;
  onStatus: (s: string | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const girlMeshRef = useRef<THREE.Mesh | null>(null);
  const guyMeshRef = useRef<THREE.Mesh | null>(null);
  const fuckingRef = useRef(fucking);
  const speakingRef = useRef(speaking);
  const rafRef = useRef(0);

  useEffect(() => { fuckingRef.current = fucking; }, [fucking]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !textureUrl) return;
    const w = mount.clientWidth || 360;
    const h = mount.clientHeight || 480;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(fogColor, 4, 14);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    camera.position.set(0, 1.35, 3.2);
    camera.lookAt(0, 1.15, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x1a0f14, roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.AmbientLight(0xffc0e0, 0.45));
    const key = new THREE.PointLight(0xff66aa, 1.4, 12);
    key.position.set(1.5, 2.5, 2);
    scene.add(key);
    const guy = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2a2230, transparent: true, opacity: 0.55 }));
    guy.position.set(-0.55, 1.0, 0.35);
    guy.visible = showGuy;
    scene.add(guy);
    guyMeshRef.current = guy;
    let cancelled = false;
    loadTexture(textureUrl).then((tex) => {
      if (cancelled) { tex.dispose(); return; }
      const height = 2.15, width = height * 0.75;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 16, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide }));
      mesh.position.set(0.15, height / 2 + 0.05, 0);
      scene.add(mesh);
      girlMeshRef.current = mesh;
      onStatus(null);
    }).catch(() => onStatus("Couldn't load portrait — try another girl or photo."));
    const clock = new THREE.Clock();
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const m = girlMeshRef.current;
      const g = guyMeshRef.current;
      if (m) {
        const breath = 1 + Math.sin(t * 1.6) * 0.012;
        m.scale.set(breath, breath, 1);
        m.rotation.y = Math.sin(t * 0.7) * 0.06;
        m.position.y = 1.15 + Math.sin(t * 1.6) * 0.015;
        if (speakingRef.current) m.rotation.z = Math.sin(t * 18) * 0.012;
        if (fuckingRef.current) m.position.z += Math.sin(t * 9) * 0.04;
      }
      if (g) {
        g.visible = showGuy;
        if (fuckingRef.current) g.position.z = 0.35 + Math.sin(t * 9) * 0.05;
      }
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      girlMeshRef.current = null;
      guyMeshRef.current = null;
    };
  }, [textureUrl, bgColor, fogColor, showGuy, onStatus]);

  return <div ref={mountRef} className="relative w-full aspect-[3/4] max-h-[min(70vh,560px)] rounded-3xl overflow-hidden border border-pink-500/40 bg-black" />;
}
