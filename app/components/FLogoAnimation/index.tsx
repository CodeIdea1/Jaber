"use client";

import dynamic from "next/dynamic";
import styles from "./FLogoAnimation.module.css";

// Canvas must be client-only (no SSR)
const AnimationCanvas = dynamic(() => import("./AnimationCanvas"), { ssr: false });

export default function FLogoAnimation() {
  return (
    <div className={styles.wrapper}>
      <AnimationCanvas />
    </div>
  );
}
