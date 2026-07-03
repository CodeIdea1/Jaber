"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AnimState } from "./useAnimation";
import type { Stroke } from "./useFLogoPoints";

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// Morphs each point from tight vertical bundle → logo scanline position
// with a gentle arc during transit.
// ─────────────────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */`
  precision highp float;

  attribute vec2  aStart;
  attribute vec2  aEnd;
  attribute float aStrokeIdx;
  attribute float aVertexT;

  uniform float uProgress;
  uniform float uTime;

  varying float vAlpha;
  varying float vVertexT;
  varying float vStrokeIdx;

  float easeInOut3(float t) {
    return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t+2.0,3.0)/2.0;
  }
  float remap(float v, float lo, float hi) {
    return clamp((v-lo)/(hi-lo), 0.0, 1.0);
  }

  void main() {
    float staggerStart = aStrokeIdx * 0.20;
    float staggerEnd   = 0.50 + aStrokeIdx * 0.45;
    float t = easeInOut3(remap(uProgress, staggerStart, staggerEnd));

    vec2 pos = mix(aStart, aEnd, t);

    // Tiny living sway while in flight
    float sway = (1.0 - t) * 0.004;
    pos.x += sin(uTime * 1.6 + aStrokeIdx * 14.3) * sway;

    // Fade in quickly per stroke
    float fadeIn = easeInOut3(remap(uProgress, aStrokeIdx*0.04, aStrokeIdx*0.04+0.10));
    vAlpha = clamp(fadeIn, 0.0, 1.0);

    vVertexT   = aVertexT;
    vStrokeIdx = aStrokeIdx;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uProgress;
  uniform float uTime;
  uniform float uLayerAlpha;

  varying float vAlpha;
  varying float vVertexT;
  varying float vStrokeIdx;

  float smooth01(float t) { return t * t * (3.0 - 2.0 * t); }
  float remap(float v, float lo, float hi) { return clamp((v-lo)/(hi-lo),0.0,1.0); }

  void main() {
    // Phase 1 [0.00→0.72]: orange-red lines
    // Phase 2 [0.72→0.88]: lines turn white
    // Phase 3 [0.88→0.92]: lines stay white, mesh not yet visible (pause)
    // Phase 4 [0.92→1.00]: mesh fades in, lines fade out

    // Colour: orange-red → #D2C0B1 warm light  (0.72 → 0.88)
    float toFinal = smooth01(remap(uProgress, 0.72, 0.88));
    vec3 drawColA = vec3(0.90, 0.15, 0.02);
    vec3 drawColB = vec3(1.00, 0.45, 0.03);
    vec3 orangeCol = mix(drawColA, drawColB, vVertexT);
    vec3 finalCol  = vec3(0.824, 0.753, 0.694); // #D2C0B1
    vec3 col = mix(orangeCol, finalCol, toFinal);

    // Alpha: lines fade out after p=0.92 as gradient mesh fades in
    float fadeOut = smooth01(remap(uProgress, 0.92, 1.00));
    float lineAlpha = vAlpha * uLayerAlpha * (1.0 - fadeOut);

    col = min(col, vec3(2.5));
    gl_FragColor = vec4(col, lineAlpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Build a single BufferGeometry containing all strokes concatenated.
// Between strokes we insert 2 degenerate (duplicate) vertices so the
// line renderer skips the gap — standard "line strip with breaks" trick.
// ─────────────────────────────────────────────────────────────────────────────

function buildGeometry(strokes: Stroke[]): THREE.BufferGeometry {
  // Count total vertices: each stroke gets +2 degenerate verts for the break
  const totalVerts = strokes.reduce((s, st) => s + st.length + 2, 0);

  const positions  = new Float32Array(totalVerts * 3);
  const aStart     = new Float32Array(totalVerts * 2);
  const aEnd       = new Float32Array(totalVerts * 2);
  const aStrokeIdx = new Float32Array(totalVerts);
  const aVertexT   = new Float32Array(totalVerts);

  // ── Start state ────────────────────────────────────────────────────────
  // Every line starts as a vertical stroke OUTSIDE the screen from the LEFT.
  // aStart for ALL vertices of a stroke = same X (off-screen left) so the
  // line appears as a tight vertical bundle entering from the left side.
  // The bundle is also above the screen (y > 1.35) so it enters from
  // top-left corner, completely outside the viewport.
  //
  // X: off-screen left  →  logo X  (left-to-right travel)
  // Y: above screen     →  logo Y  (top-to-bottom travel)
  //
  // Each stroke's start X is spread slightly so they enter as a tight
  // left-to-right ordered bundle (first stroke enters leftmost).

  const START_X_BASE   = -2.20;  // off-screen left (all lines start here)
  const START_X_SPREAD =  0.10;  // tiny spread so order is preserved
  const START_Y_TOP    =  2.50;  // above screen top
  const LINE_LEN       =  5.00;  // long enough to span full screen

  let vi = 0;

  const write = (ex:number,ey:number,sx:number,sy:number,si:number,vt:number) => {
    positions[vi*3]=ex; positions[vi*3+1]=ey; positions[vi*3+2]=0;
    aEnd[vi*2]=ex;      aEnd[vi*2+1]=ey;
    aStart[vi*2]=sx;    aStart[vi*2+1]=sy;
    aStrokeIdx[vi]=si;
    aVertexT[vi]=vt;
    vi++;
  };

  for (let s=0; s<strokes.length; s++) {
    const stroke = strokes[s];
    const norm   = s / (strokes.length - 1);

    // Start X: all lines off-screen left, tiny spread preserves L→R order
    const startX = START_X_BASE + norm * START_X_SPREAD;
    const L = stroke.length;

    // Degenerate break
    write(stroke[0][0], stroke[0][1], startX, START_Y_TOP, norm, 0);
    write(stroke[0][0], stroke[0][1], startX, START_Y_TOP, norm, 0);

    for (let v=0; v<L; v++) {
      const vt = v / (L - 1);
      // Vertices spread vertically downward from START_Y_TOP
      const sy = START_Y_TOP - vt * LINE_LEN;
      write(stroke[v][0], stroke[v][1], startX, sy, norm, vt);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position",   new THREE.BufferAttribute(positions,  3));
  geo.setAttribute("aEnd",       new THREE.BufferAttribute(aEnd,       2));
  geo.setAttribute("aStart",     new THREE.BufferAttribute(aStart,     2));
  geo.setAttribute("aStrokeIdx", new THREE.BufferAttribute(aStrokeIdx, 1));
  geo.setAttribute("aVertexT",   new THREE.BufferAttribute(aVertexT,   1));
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILLED LOGO — gradient mesh (top: #665344, bottom: #D2C0B1)
// ─────────────────────────────────────────────────────────────────────────────

const fillVertShader = /* glsl */`
  precision highp float;
  uniform float uMinY;
  uniform float uMaxY;
  varying float vGradT;
  void main() {
    vGradT = clamp((position.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fillFragShader = /* glsl */`
  precision highp float;
  uniform float uOpacity;
  varying float vGradT;
  void main() {
    // top = #D2C0B1 (light warm), bottom = #665344 (dark brown)
    vec3 colTop    = vec3(0.824, 0.753, 0.694); // #D2C0B1
    vec3 colBottom = vec3(0.400, 0.325, 0.267); // #665344
    vec3 col = mix(colBottom, colTop, vGradT);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

function FilledLogo({
  strokes,
  animState,
}: {
  strokes: Stroke[];
  animState: React.MutableRefObject<AnimState>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const { geometry, minY, maxY } = useMemo(() => {
    if (strokes.length === 0)
      return { geometry: new THREE.BufferGeometry(), minY: 0, maxY: 1 };

    // Gap between scanlines → overlap quads to close seams
    const ys = strokes.map(s => s[0][1]);
    let minGap = Infinity;
    for (let i = 1; i < ys.length; i++) {
      const gap = Math.abs(ys[i] - ys[i - 1]);
      if (gap > 0.0001 && gap < minGap) minGap = gap;
    }
    const h = (minGap / 2) * 1.2;

    const verts: number[] = [];
    const indices: number[] = [];
    let vi = 0;
    let minY = Infinity, maxY = -Infinity;

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      const x0 = stroke[0][0];
      const x1 = stroke[stroke.length - 1][0];
      const y  = stroke[0][1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      verts.push(x0, y - h, 0,  x1, y - h, 0,  x1, y + h, 0,  x0, y + h, 0);
      indices.push(vi, vi+1, vi+2,  vi, vi+2, vi+3);
      vi += 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.setIndex(indices);
    return { geometry: geo, minY, maxY };
  }, [strokes]);

  const uniforms = useMemo(() => ({
    uOpacity: { value: 0 },
    uMinY:    { value: minY },
    uMaxY:    { value: maxY },
  }), [minY, maxY]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  useFrame(() => {
    if (!matRef.current) return;
    const p = animState.current.progress;
    // Delayed slow fill: starts at p=0.94, completes at p=1.0
    // Window = 0.06 but with cubic ease feels very gradual
    const t = Math.max(0, Math.min(1, (p - 0.94) / 0.06));
    // Extra-smooth: apply smoothstep twice for an even softer curve
    const s = t * t * (3 - 2 * t);
    matRef.current.uniforms.uOpacity.value = s * s * (3 - 2 * s);
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={fillVertShader}
        fragmentShader={fillFragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LINES COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface LinesProps {
  strokes: Stroke[];
  animState: React.MutableRefObject<AnimState>;
}

export function Lines({ strokes, animState }: LinesProps) {
  const { scene } = useThree();
  const linesRef  = useRef<THREE.Line[]>([]);

  const geo = useMemo(() => buildGeometry(strokes), [strokes]);

  // Three layers: core (1.0), mid-glow (0.30), outer-glow (0.12)
  const layers = useMemo(() => [1.0, 0.30, 0.12], []);

  const materials = useMemo(() =>
    layers.map(alpha =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uProgress:   { value: 0 },
          uTime:       { value: 0 },
          uLayerAlpha: { value: alpha },
        },
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      })
    ),
  [layers]);

  // Mount THREE.Line objects directly into the scene
  useEffect(() => {
    const lines = materials.map(mat => {
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      scene.add(line);
      return line;
    });
    linesRef.current = lines;
    return () => {
      lines.forEach(l => scene.remove(l));
      materials.forEach(m => m.dispose());
      geo.dispose();
    };
  }, [geo, materials, scene]);

  useFrame(({ clock }) => {
    const p = animState.current.progress;
    const t = clock.getElapsedTime();
    for (const mat of materials) {
      mat.uniforms.uProgress.value = p;
      mat.uniforms.uTime.value     = t;
    }
  });

  return <FilledLogo strokes={strokes} animState={animState} />;
}
