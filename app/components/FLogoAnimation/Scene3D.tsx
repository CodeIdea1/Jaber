"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Strand } from "./Strand";
import { SparkParticles } from "./SparkParticles";
import { STRAND_COUNT } from "./strandPaths";

interface Scene3DProps {
  progressRef: React.MutableRefObject<number>;
  scaleRef?: React.MutableRefObject<number>;
  translateRef?: React.MutableRefObject<number>;
}

export function Scene3D({ progressRef, scaleRef, translateRef }: Scene3DProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ camera }) => {
    const p  = progressRef.current;
    const sc = scaleRef?.current ?? 1;

    // Camera pull-back during formation
    const targetZ = 2.4 - p * 0.25;
    camera.position.z += (targetZ - camera.position.z) * 0.018;

    // في بداية الأنيميشن الكاميرا تنظر للأعلى حيث تبدأ الخيوط
    // ثم تنزل تدريجياً لتركز على حرف F
    const targetY = (1 - p) * 1.2; // يبدأ من 1.2 وينتهي عند 0
    camera.position.y += (targetY - camera.position.y) * 0.04;
    (camera as THREE.PerspectiveCamera).lookAt(0, camera.position.y * 0.3, 0);

    if (groupRef.current) {
      groupRef.current.scale.setScalar(sc);
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.18} color="#3D2208" />
      {/* Main warm key light from upper-left */}
      <directionalLight position={[-1.2, 3.0, 2.5]} intensity={2.2} color="#FFD98A" />
      {/* Secondary fill from right, slightly cooler */}
      <directionalLight position={[2.0, 0.5, 1.0]} intensity={0.9} color="#FFBE60" />
      {/* Rim/back light for depth */}
      <directionalLight position={[0.0, -2.0, -2.5]} intensity={0.25} color="#7A5C30" />

      {Array.from({ length: STRAND_COUNT }, (_, i) => (
        <Strand
          key={i}
          index={i}
          progressRef={progressRef}
          scaleRef={scaleRef}
          staggerOffset={i / (STRAND_COUNT - 1)}
        />
      ))}

      <SparkParticles progressRef={progressRef} />
    </group>
  );
}
