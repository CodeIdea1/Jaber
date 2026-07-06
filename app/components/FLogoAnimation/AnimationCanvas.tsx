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
  const canvasWrapperRef     = useRef<HTMLDivElement>(null);

  const progressRef  = externalProgressRef  ?? internalProgressRef;
  const scaleRef     = externalScaleRef     ?? internalScaleRef;
  const translateRef = externalTranslateRef ?? internalTranslateRef;

  useEffect(() => {
    if (!autoPlay) return;
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 22,
      ease: "none",
      onUpdate() {
        const raw = proxy.p;
        const bp = 0.90;
        progressRef.current = raw < bp
          ? (raw / bp) * 0.62
          : 0.62 + ((raw - bp) / (1 - bp)) * 0.38;
      },
    });
    return () => { tween.kill(); };
  }, [autoPlay, progressRef]);

  return (
    <div ref={canvasWrapperRef} style={{ width: "100%", height: "100%" }}>
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
    </div>
  );
}
