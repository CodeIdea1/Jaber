"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getEntryPath, FINAL_PATHS, STRAND_SEEDS } from "./strandPaths";

interface StrandProps {
  index: number;
  progressRef: React.MutableRefObject<number>;
  scaleRef?: React.MutableRefObject<number>;
  staggerOffset: number;
}

const TUBE_SEGMENTS = 20;
const TUBE_RADIUS   = 0.022;
const RADIAL_SEGS   = 7;

// Warm yellow-tan palette — light tip to dark root
const COLOR_LIGHT = new THREE.Color("#E8C47A"); // light end
const COLOR_DARK  = new THREE.Color("#6B3D10"); // dark end
const TIP_SPHERE_R = 0.024;

// Deterministic noise for fibrous roughness variation (no shape change)
function fiberNoise(s: number, r: number, seed: number): number {
  return Math.sin(s * 31.7 + r * 17.3 + seed * 5.1) * 0.5 +
         Math.sin(s * 73.1 + r * 43.7 + seed * 11.3) * 0.3 +
         Math.sin(s * 127.9 + r * 89.1 + seed * 23.7) * 0.2;
}

function buildMorphableTube(
  curve: THREE.CatmullRomCurve3,
  seed: number
): { geo: THREE.BufferGeometry; posAttr: THREE.BufferAttribute } {
  const tubular = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, TUBE_RADIUS, RADIAL_SEGS, false);
  const srcPos = tubular.attributes.position as THREE.BufferAttribute;
  const posAttr = new THREE.BufferAttribute(srcPos.array.slice(), 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  tubular.setAttribute("position", posAttr);

  // Bake per-vertex color gradient (light tip → dark root) + fibrous brightness variation
  const vertCount = posAttr.count;
  const ringVerts = RADIAL_SEGS + 1;
  const colors = new Float32Array(vertCount * 3);
  const _c = new THREE.Color();
  for (let i = 0; i < vertCount; i++) {
    const s = Math.floor(i / ringVerts); // segment index 0..TUBE_SEGMENTS
    const r = i % ringVerts;             // ring vertex index
    const t = s / TUBE_SEGMENTS;         // 0 = top/entry, 1 = bottom/tip
    // Gradient: light at tip (t=1), dark at root (t=0)
    _c.lerpColors(COLOR_DARK, COLOR_LIGHT, t);
    // Fibrous brightness modulation — subtle, matte-looking
    const noise = fiberNoise(s, r, seed);
    const bright = 0.82 + noise * 0.18; // 0.64 – 1.0 range
    colors[i * 3]     = Math.min(1, _c.r * bright);
    colors[i * 3 + 1] = Math.min(1, _c.g * bright);
    colors[i * 3 + 2] = Math.min(1, _c.b * bright);
  }
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  tubular.setAttribute("color", colorAttr);

  return { geo: tubular, posAttr };
}

export function Strand({ index, progressRef, scaleRef, staggerOffset }: StrandProps) {
  const meshRef   = useRef<THREE.Mesh>(null!);
  const tipRef    = useRef<THREE.Mesh>(null!);
  const matRef    = useRef<THREE.MeshStandardMaterial>(null!);
  const tipMatRef = useRef<THREE.MeshBasicMaterial>(null!);

  const seed = STRAND_SEEDS[index];

  // 5 control points for entry and final paths
  const entryPts = useMemo(() => {
    const ep = getEntryPath(index);
    const c  = new THREE.CatmullRomCurve3(ep, false, "catmullrom", 0.5);
    return c.getPoints(TUBE_SEGMENTS);
  }, [index]);

  const finalPts = useMemo(() => {
    const fp = FINAL_PATHS[index];
    const c  = new THREE.CatmullRomCurve3(fp, false, "catmullrom", 0.5);
    return c.getPoints(TUBE_SEGMENTS);
  }, [index]);

  // Build the tube once using entry curve
  const { geo, posAttr, curve, tubeFrames } = useMemo(() => {
    const ctrlPts = getEntryPath(index);
    const curve   = new THREE.CatmullRomCurve3(ctrlPts, false, "catmullrom", 0.5);
    const { geo, posAttr } = buildMorphableTube(curve, seed.curveSeed);

    const tubeFrames = curve.computeFrenetFrames(TUBE_SEGMENTS, false);
    return { geo, posAttr, curve, tubeFrames };
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipGeo = useMemo(() => new THREE.SphereGeometry(TIP_SPHERE_R, 6, 6), []);

  // Reusable vectors to avoid per-frame allocation
  const _pos    = useMemo(() => new THREE.Vector3(), []);
  const _normal = useMemo(() => new THREE.Vector3(), []);
  const _binorm = useMemo(() => new THREE.Vector3(), []);
  const _pt     = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const rawP = progressRef.current;
    const t    = clock.getElapsedTime();

    // Per-strand stagger window
    const windowSize = 0.38 * seed.fallBias;
    const lo = staggerOffset * (1 - windowSize);
    const hi = lo + windowSize;
    const p  = Math.max(0, Math.min(1, (rawP - lo) / Math.max(hi - lo, 0.001)));

    const eased      = easeOutBack(p);
    const twistAngle = (1 - Math.pow(p, 0.6)) * Math.PI * seed.twistSpeed * seed.twistDir;
    const bowAmp     = Math.sin(p * Math.PI) * 0.08;
    const bowPhase   = seed.curveSeed;

    // ── Compute morphed spine points (TUBE_SEGMENTS+1 points) ─────────────
    const spine: THREE.Vector3[] = [];
    for (let s = 0; s <= TUBE_SEGMENTS; s++) {
      const vt = s / TUBE_SEGMENTS;
      _pt.lerpVectors(entryPts[s], finalPts[s], eased);

      // Organic bow
      _pt.x += Math.sin(bowPhase + vt * Math.PI) * bowAmp * (1 - eased);
      _pt.z += Math.cos(bowPhase * 1.3 + vt * Math.PI * 0.7) * bowAmp * 0.5 * (1 - eased);

      // Twist
      if (p < 0.92) {
        const angle = twistAngle * vt * 0.6;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const ox = _pt.x, oz = _pt.z;
        _pt.x = ox * cos - oz * sin;
        _pt.z = ox * sin + oz * cos;
      }

      // Idle jitter
      if (p > 0.96) {
        const jAmp = 0.0012;
        _pt.x += Math.sin(t * 2.2 + index * 5.3 + s * 1.7) * jAmp;
        _pt.y += Math.cos(t * 1.8 + index * 4.1 + s * 2.1) * jAmp * 0.3;
      }

      // Apply scale from centre
      // (scale is applied at group level in Scene3D; no per-strand multiply needed)

      spine.push(_pt.clone());
    }

    // ── Recompute Frenet frames for morphed spine ──────────────────────────
    // Lightweight manual tangent/normal computation
    const tangents: THREE.Vector3[] = [];
    for (let s = 0; s <= TUBE_SEGMENTS; s++) {
      const prev = spine[Math.max(0, s - 1)];
      const next = spine[Math.min(TUBE_SEGMENTS, s + 1)];
      tangents.push(next.clone().sub(prev).normalize());
    }

    // ── Write ring vertices directly into posAttr ──────────────────────────
    const arr = posAttr.array as Float32Array;
    const ringVerts = RADIAL_SEGS + 1;

    // Use original Frenet normals as base, then align to new tangent
    for (let s = 0; s <= TUBE_SEGMENTS; s++) {
      const center  = spine[s];
      const tangent = tangents[s];

      // Build a stable normal perpendicular to tangent
      _normal.copy(tubeFrames.normals[Math.min(s, tubeFrames.normals.length - 1)]);
      _binorm.copy(tubeFrames.binormals[Math.min(s, tubeFrames.binormals.length - 1)]);

      // Re-orthogonalise normal against new tangent
      _normal.sub(tangent.clone().multiplyScalar(_normal.dot(tangent))).normalize();
      _binorm.crossVectors(tangent, _normal).normalize();

      for (let r = 0; r < ringVerts; r++) {
        const angle = (r / RADIAL_SEGS) * Math.PI * 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const vi  = (s * ringVerts + r) * 3;
        arr[vi]     = center.x + (cos * _normal.x + sin * _binorm.x) * TUBE_RADIUS;
        arr[vi + 1] = center.y + (cos * _normal.y + sin * _binorm.y) * TUBE_RADIUS;
        arr[vi + 2] = center.z + (cos * _normal.z + sin * _binorm.z) * TUBE_RADIUS;
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Opacity
    if (matRef.current) matRef.current.opacity = Math.min(1, p * 4);

    // Tip position
    const tipPos = spine[TUBE_SEGMENTS];
    if (tipRef.current) tipRef.current.position.copy(tipPos);
    if (tipMatRef.current) {
      const breathe = p > 0.95 ? 0.7 + 0.3 * Math.sin(t * 2.2 + index * 0.9) : 1.0;
      tipMatRef.current.opacity = Math.min(1, p * 5) * breathe;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geo} frustumCulled={false}>
        <meshStandardMaterial
          ref={matRef}
          vertexColors
          metalness={0.0}
          roughness={0.92}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Plain tip dot — no bloom, no halo, just additive blending */}
      <mesh ref={tipRef} geometry={tipGeo} frustumCulled={false}>
        <meshBasicMaterial
          ref={tipMatRef}
          color="#FFD060"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
