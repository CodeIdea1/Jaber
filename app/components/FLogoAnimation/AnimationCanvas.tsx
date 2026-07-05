"use client";

import { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { Scene3D } from "./Scene3D";
import styles from "./FLogoAnimation.module.css";

interface AnimationCanvasProps {
  autoPlay?: boolean;
  progressRef?: React.MutableRefObject<number>;
  scaleRef?: React.MutableRefObject<number>;
  /** 0→1: drives downward travel from intro into hero section */
  translateRef?: React.MutableRefObject<number>;
}

export default function AnimationCanvas({
  autoPlay = true,
  progressRef: externalProgressRef,
  scaleRef: externalScaleRef,
  translateRef: externalTranslateRef,
}: AnimationCanvasProps) {
  const internalProgressRef  = useRef<number>(0);
  const internalScaleRef     = useRef<number>(1);
  const internalTranslateRef = useRef<number>(0);

  const progressRef  = externalProgressRef  ?? internalProgressRef;
  const scaleRef     = externalScaleRef     ?? internalScaleRef;
  const translateRef = externalTranslateRef ?? internalTranslateRef;

  useEffect(() => {
    if (!autoPlay) return;
    const proxy = { p: 0 };
    // Slow opening twist/descent, fast letter-formation snap
    // Custom ease: very slow start (cubic), then accelerates sharply into finish
    // Phase 1: slow twist/coil (0→0.55) over ~10s, Phase 2: fast F-formation (0.55→1) over ~3s
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 22,
      ease: "none",
      onUpdate() {
        const raw = proxy.p;
        // First 90% of time (~20s) → progress 0..0.62 (slow coil/twist)
        // Last 10% of time (~2s)   → progress 0.62..1  (fast F snap)
        const bp = 0.90;
        progressRef.current = raw < bp
          ? (raw / bp) * 0.62
          : 0.62 + ((raw - bp) / (1 - bp)) * 0.38;
      },
    });
    return () => { tween.kill(); };
  }, [autoPlay, progressRef]);

  return (
    <Canvas
      className={styles.canvas}
      camera={{ position: [0, 0, 2.2], fov: 48 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      dpr={[1, 1.5]}
    >
      <Scene3D progressRef={progressRef} scaleRef={scaleRef} translateRef={translateRef} />
    </Canvas>
  );
}
