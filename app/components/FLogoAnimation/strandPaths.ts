/**
 * strandPaths.ts
 * 36 dense strands forming the letter "F":
 *   - 12 stem strands
 *   -  8 top-bar strands
 *   -  6 mid-bar strands
 *   - 10 extra fill strands (stem + bars overlap fill)
 */

import * as THREE from "three";

export const STRAND_COUNT = 36;

// Raise everything by Y_OFFSET (Fix 3)
const Y_OFFSET = 0.48;
const TOP   =  0.42 + Y_OFFSET;
const BOT   = -0.42 + Y_OFFSET;
const BAR_R =  0.40;
const MID_R =  0.28;
const MID_Y =  0.08 + Y_OFFSET;

function v(x: number, y: number, z: number) { return new THREE.Vector3(x, y, z); }
function pts(...coords: [number, number, number][]): THREE.Vector3[] {
  return coords.map(([x, y, z]) => v(x, y, z));
}

// ── Stem: 12 strands, tightly packed across x = -0.20 → +0.04 ─────────────
const STEM_XS = [-0.20, -0.17, -0.14, -0.11, -0.08, -0.05, -0.02, 0.01, 0.04,
                 -0.18, -0.09, 0.02];
const STEM_ZS = [0.00, 0.01, -0.01, 0.01, 0.00, -0.01, 0.01, 0.00, -0.01,
                 -0.01, 0.01, 0.00];

// ── Top bar: 8 strands, y = TOP → TOP-0.14 ────────────────────────────────
const TOP_YS = [TOP, TOP-0.02, TOP-0.04, TOP-0.06, TOP-0.08, TOP-0.10, TOP-0.12, TOP-0.14];
const TOP_ZS = [0.00, 0.01, -0.01, 0.01, 0.00, -0.01, 0.01, -0.01];

// ── Mid bar: 6 strands, y = MID_Y+0.06 → MID_Y-0.08 ──────────────────────
const MID_YS = [MID_Y+0.06, MID_Y+0.03, MID_Y, MID_Y-0.03, MID_Y-0.06, MID_Y-0.08];
const MID_ZS = [0.00, 0.01, -0.01, 0.01, 0.00, -0.01];

// ── Extra fill: 10 strands bridging stem/bar junctions ────────────────────
const FILL: THREE.Vector3[][] = [
  // stem-top junction fillers
  pts([-0.16, TOP, 0.00], [-0.16, MID_Y, 0.00], [-0.16, BOT, 0.00]),
  pts([-0.03, TOP, 0.01], [-0.03, MID_Y, 0.01], [-0.03, BOT, 0.01]),
  // top-bar inner fill
  pts([-0.20, TOP-0.03, 0.00], [0.10, TOP-0.03, 0.01], [BAR_R, TOP-0.03, 0.00]),
  pts([-0.20, TOP-0.07, 0.01], [0.10, TOP-0.07, 0.00], [BAR_R, TOP-0.07, 0.01]),
  pts([-0.20, TOP-0.11,-0.01], [0.10, TOP-0.11,-0.01], [BAR_R, TOP-0.11,-0.01]),
  // mid-bar inner fill
  pts([-0.20, MID_Y+0.02, 0.00], [0.05, MID_Y+0.02, 0.01], [MID_R, MID_Y+0.02, 0.00]),
  pts([-0.20, MID_Y-0.02, 0.01], [0.05, MID_Y-0.02, 0.00], [MID_R, MID_Y-0.02, 0.01]),
  // stem bottom fill
  pts([-0.12, TOP, 0.00], [-0.12, 0.00, 0.00], [-0.12, BOT, 0.00]),
  pts([-0.06, TOP,-0.01], [-0.06, 0.00,-0.01], [-0.06, BOT,-0.01]),
  pts([ 0.00, TOP, 0.01], [ 0.00, 0.00, 0.01], [ 0.00, BOT, 0.01]),
];

// ── Assemble FINAL_PATHS ───────────────────────────────────────────────────
export const FINAL_PATHS: THREE.Vector3[][] = [
  // 12 stem
  ...STEM_XS.map((x, i) =>
    pts([x, TOP, STEM_ZS[i]], [x, MID_Y, STEM_ZS[i]], [x, BOT, STEM_ZS[i]])
  ),
  // 8 top bar
  ...TOP_YS.map((y, i) =>
    pts([-0.20, y, TOP_ZS[i]], [0.10, y, TOP_ZS[i]], [BAR_R, y, TOP_ZS[i]])
  ),
  // 6 mid bar
  ...MID_YS.map((y, i) =>
    pts([-0.20, y, MID_ZS[i]], [0.04, y, MID_ZS[i]], [MID_R, y, MID_ZS[i]])
  ),
  // 10 fill
  ...FILL,
];

// ── Per-strand random seeds (fixed, deterministic) ─────────────────────────
// Each seed drives: twist speed, fall speed variance, path curvature noise
export const STRAND_SEEDS: { twistDir: number; twistSpeed: number; fallBias: number; curveSeed: number }[] =
  Array.from({ length: STRAND_COUNT }, (_, i) => {
    // Deterministic pseudo-random from index
    const h = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    const r1 = h - Math.floor(h);
    const h2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
    const r2 = h2 - Math.floor(h2);
    const h3 = Math.sin(i * 419.2 + 74.1) * 43758.5453;
    const r3 = h3 - Math.floor(h3);
    const h4 = Math.sin(i * 631.8 + 521.4) * 43758.5453;
    const r4 = h4 - Math.floor(h4);
    return {
      twistDir:   r1 > 0.5 ? 1 : -1,
      twistSpeed: 1.4 + r2 * 2.8,          // 1.4 – 4.2 full rotations
      fallBias:   0.75 + r3 * 0.50,         // stagger window scale
      curveSeed:  r4 * Math.PI * 2,         // phase for mid-flight curve
    };
  });

// ── Entry bundle: tight vertical rope above screen ─────────────────────────
export function getEntryPath(idx: number): THREE.Vector3[] {
  const seed = STRAND_SEEDS[idx];
  const ox = (idx - STRAND_COUNT / 2) * 0.009;
  const oz = Math.sin(idx * 2.3 + seed.curveSeed) * 0.007;
  return pts(
    [ox, 2.1, oz],
    [ox, 1.5, oz],
    [ox, 0.9, oz],
    [ox, 0.3, oz],
    [ox,-0.3, oz],
  );
}

export function sampleCurve(controlPts: THREE.Vector3[], n = 5): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(controlPts, false, "catmullrom", 0.5);
  return curve.getPoints(n - 1);
}
