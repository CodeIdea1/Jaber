"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Lines } from "./Lines";
import { useFLogoStrokes } from "./useFLogoPoints";
import { useAnimation } from "./useAnimation";

export function Scene() {
  const strokes  = useFLogoStrokes(90);
  const animState = useAnimation();

  useFrame(({ camera }) => {
    const p = animState.current.progress;
    // Subtle camera pull-back as logo forms
    const targetZ = 2.6 - p * 0.15;
    camera.position.z += (targetZ - camera.position.z) * 0.015;
    camera.position.x += (0 - camera.position.x) * 0.04;
    camera.position.y += (0 - camera.position.y) * 0.04;
    (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
  });

  return <Lines strokes={strokes} animState={animState} />;
}
