"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 60;

interface SparkParticlesProps {
  progressRef: React.MutableRefObject<number>;
}

export function SparkParticles({ progressRef }: SparkParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null!);

  const seeds = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      orbitRadius: 0.08 + (Math.sin(i * 17.3) * 0.5 + 0.5) * 0.18,
      orbitSpeed:  0.18 + (Math.sin(i * 31.7) * 0.5 + 0.5) * 0.45,
      orbitPhase:  (i / COUNT) * Math.PI * 2 + Math.sin(i * 7.1) * 1.2,
      yOffset:     (Math.sin(i * 23.9) * 0.5) * 1.5,
      yDriftSpeed: 0.06 + (Math.sin(i * 41.3) * 0.5 + 0.5) * 0.10,
      yDriftPhase: Math.sin(i * 13.7) * Math.PI,
      zAmp:        0.08 + (Math.sin(i * 59.1) * 0.5 + 0.5) * 0.20,
      zPhase:      Math.sin(i * 29.3) * Math.PI * 2,
      size:        0.022 + (Math.sin(i * 11.1) * 0.5 + 0.5) * 0.022,
      brightness:  0.75 + (Math.sin(i * 43.7) * 0.5 + 0.5) * 0.25,
      flickerSeed: i * 3.7,
      flickerSpeed:4.5 + (Math.sin(i * 67.3) * 0.5 + 0.5) * 4.0,
    })), []);

  const { geo, posAttr, sizeAttr, colorAttr } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const colors    = new Float32Array(COUNT * 3);
    const posAttr   = new THREE.BufferAttribute(positions, 3);
    const sizeAttr  = new THREE.BufferAttribute(sizes, 1);
    const colorAttr = new THREE.BufferAttribute(colors, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", posAttr);
    geo.setAttribute("size",     sizeAttr);
    geo.setAttribute("color",    colorAttr);
    return { geo, posAttr, sizeAttr, colorAttr };
  }, []);

  // نفس أسلوب نقاط الهيرو — دائرة ناعمة مضيئة
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    // #D6C3AB هو لون نقاط الهيرو
    grad.addColorStop(0,    "rgba(255, 245, 220, 1)");
    grad.addColorStop(0.15, "rgba(214, 195, 171, 1)");
    grad.addColorStop(0.4,  "rgba(214, 195, 171, 0.75)");
    grad.addColorStop(0.7,  "rgba(180, 155, 120, 0.3)");
    grad.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = progressRef.current;

    // fade in سريع، تبقى طوال الالتفاف، تختفي عند تشكيل F
    const globalAlpha = p < 0.04
      ? p / 0.04
      : p > 0.72
        ? Math.max(0, 1 - (p - 0.72) / 0.20)
        : 1;

    const pos  = posAttr.array   as Float32Array;
    const szs  = sizeAttr.array  as Float32Array;
    const cols = colorAttr.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const angle = t * s.orbitSpeed + s.orbitPhase;

      // المدار يضيق تدريجياً مع تشكيل F
      const r = s.orbitRadius * (1 - p * 0.5);

      pos[i * 3]     = Math.cos(angle) * r;
      pos[i * 3 + 1] = s.yOffset + Math.sin(t * s.yDriftSpeed + s.yDriftPhase) * 0.15;
      pos[i * 3 + 2] = Math.sin(angle + s.zPhase) * s.zAmp;

      // وميض مثل نقاط الهيرو
      const flicker = 0.55 + 0.45 * Math.sin(t * s.flickerSpeed + s.flickerSeed);
      const alpha   = globalAlpha * flicker * s.brightness;

      szs[i] = s.size * (0.85 + 0.15 * flicker);

      // لون #D6C3AB = rgb(0.839, 0.765, 0.671) مع توهج أبيض في المركز
      cols[i * 3]     = Math.min(1, 0.98 * alpha);
      cols[i * 3 + 1] = Math.min(1, 0.88 * alpha);
      cols[i * 3 + 2] = Math.min(1, 0.72 * alpha);
    }

    posAttr.needsUpdate   = true;
    sizeAttr.needsUpdate  = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.032}
        sizeAttenuation
        vertexColors
        transparent
        opacity={1}
        map={texture}
        alphaMap={texture}
        alphaTest={0.005}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
