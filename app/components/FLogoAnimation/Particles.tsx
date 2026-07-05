"use client";

/**
 * Particles.tsx
 * Instanced glowing gold spark particles drifting around the F letter.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 120;

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  phase: number;
}

export function Particles({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy   = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo<ParticleData[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 0.3
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.004,
        0.003 + Math.random() * 0.006,   // mostly upward drift
        (Math.random() - 0.5) * 0.002
      ),
      life:    Math.random() * 4,
      maxLife: 3 + Math.random() * 3,
      size:    0.004 + Math.random() * 0.010,
      phase:   Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    // Particles become more visible as animation progresses
    const visibility = Math.min(1, p * 2);

    for (let i = 0; i < COUNT; i++) {
      const pt = particles[i];

      // Advance life
      pt.life += delta;
      if (pt.life > pt.maxLife) {
        // Respawn near the letter
        pt.life = 0;
        pt.position.set(
          (Math.random() - 0.5) * 0.7,
          BOT_SPAWN + Math.random() * 1.3,
          (Math.random() - 0.5) * 0.25
        );
      }

      // Move
      pt.position.addScaledVector(pt.velocity, 1);
      // Slight horizontal sway
      pt.position.x += Math.sin(t * 0.8 + pt.phase) * 0.0008;

      const lifeRatio = pt.life / pt.maxLife;
      // Fade in/out over lifetime
      const alpha = visibility * Math.sin(lifeRatio * Math.PI) * 0.9;
      // Twinkle
      const twinkle = 0.6 + 0.4 * Math.sin(t * 4 + pt.phase * 3);

      dummy.position.copy(pt.position);
      const s = pt.size * twinkle * (0.5 + lifeRatio * 0.5);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Set per-instance color alpha via color (r=alpha trick with additive blending)
      const brightness = alpha * twinkle;
      meshRef.current.setColorAt(i, new THREE.Color(brightness * 2.0, brightness * 1.2, brightness * 0.3));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color="#FFD778"
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </instancedMesh>
  );
}

const BOT_SPAWN = -0.65;
