"use client";

import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import styles from "./FLogoAnimation.module.css";

export default function AnimationCanvas() {
  return (
    <Canvas
      className={styles.canvas}
      camera={{ position: [0, 0, 2.8], fov: 50 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      dpr={[1, 2]}
    >
      <Scene />
    </Canvas>
  );
}
