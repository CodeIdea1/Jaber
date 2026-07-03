/**
 * useFLogoPoints
 *
 * Returns an array of "strokes" — each stroke is an array of 2D points
 * representing one long continuous line that, together, fill the F logo shape.
 *
 * Strategy: rasterise the F outline into horizontal scanlines so every
 * line is long and unbroken (no short fragments).
 */

import { useMemo } from "react";

type Pt = [number, number];
export type Stroke = Pt[];

// ── Raw SVG path (logo_F.svg, single path) ────────────────────────────────
const RAW_D = `M5317 8980 c-82 -14 -139 -57 -354 -270 -2402 -2369 -2974 -2940
-3006 -2997 -46 -85 -48 -126 -45 -943 l3 -765 813 0 813 0 -283 -274 c-156
-151 -483 -475 -728 -720 -388 -389 -451 -456 -493 -527 -59 -100 -90 -175
-113 -274 -14 -65 -17 -144 -19 -580 -3 -642 3 -781 34 -835 62 -112 187 -134
761 -135 357 0 662 14 764 35 38 8 87 26 109 40 74 50 69 -82 67 1697 l-1
1598 2533 0 2533 0 3 860 2 860 -1484 0 c-995 0 -1510 -4 -1563 -11 -125 -17
-231 -47 -332 -95 -175 -82 -122 -35 -1031 -924 -250 -245 -501 -490 -557
-544 l-103 -100 0 1597 0 1597 2298 2 2297 3 66 26 c104 40 157 76 250 168 86
86 171 208 555 796 61 94 177 270 257 393 177 269 200 308 192 322 -8 12
-4164 12 -4238 0z`;

// ── Path parser ───────────────────────────────────────────────────────────

function parsePath(d: string): Pt[] {
  const tokens = d.match(/[MmLlCcZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) ?? [];
  const points: Pt[] = [];
  let cx = 0, cy = 0;
  let i = 0;
  let cmd = "";
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MmLlCcZz]/.test(t)) { cmd = t; i++; }
    if (cmd === "M") { cx = num(); cy = num(); points.push([cx, cy]); }
    else if (cmd === "m") { cx += num(); cy += num(); points.push([cx, cy]); }
    else if (cmd === "L") { cx = num(); cy = num(); points.push([cx, cy]); }
    else if (cmd === "l") { cx += num(); cy += num(); points.push([cx, cy]); }
    else if (cmd === "C") {
      const x1=num(),y1=num(),x2=num(),y2=num(),ex=num(),ey=num();
      sampleCubic(cx,cy,x1,y1,x2,y2,ex,ey,points); cx=ex; cy=ey;
    }
    else if (cmd === "c") {
      const x1=cx+num(),y1=cy+num(),x2=cx+num(),y2=cy+num(),ex=cx+num(),ey=cy+num();
      sampleCubic(cx,cy,x1,y1,x2,y2,ex,ey,points); cx=ex; cy=ey;
    }
    else if (cmd === "Z" || cmd === "z") { i++; }
    else { i++; }
  }
  return points;
}

function sampleCubic(
  x0:number,y0:number,x1:number,y1:number,
  x2:number,y2:number,x3:number,y3:number,
  out:Pt[], steps=16
) {
  for (let s=1; s<=steps; s++) {
    const t=s/steps, mt=1-t;
    out.push([
      mt**3*x0+3*mt**2*t*x1+3*mt*t**2*x2+t**3*x3,
      mt**3*y0+3*mt**2*t*y1+3*mt*t**2*y2+t**3*y3,
    ]);
  }
}

// ── Transform + normalise ─────────────────────────────────────────────────

function transformAndNormalise(pts: Pt[]): Pt[] {
  // SVG has transform="translate(0,1024) scale(0.1,-0.1)"
  // Apply: x' = x*0.1,  y' = y*(-0.1) + 1024
  // This already flips Y correctly for screen space.
  // Three.js Y axis points UP, SVG Y points DOWN — after the SVG transform
  // the coordinates are already in a right-handed system, so we use them as-is.
  const tx = pts.map(([x,y]): Pt => [x * 0.1, y * (-0.1) + 1024]);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for (const [x,y] of tx) {
    if(x<minX)minX=x; if(x>maxX)maxX=x;
    if(y<minY)minY=y; if(y>maxY)maxY=y;
  }
  const rangeX=maxX-minX, rangeY=maxY-minY;
  const range=Math.max(rangeX,rangeY);
  // Scale: logo final size 0.30 × 0.38.
  // Negate Y so the logo is right-side-up in Three.js world space.
  // Offset Y downward so the logo sits near the bottom-centre of the screen.
  const LOGO_Y_OFFSET = -0.75;
  return tx.map(([x,y]): Pt => [
     ((x-minX)/range*2 - rangeX/range) * 0.18,
    -((y-minY)/range*2 - rangeY/range) * 0.23 + LOGO_Y_OFFSET,
  ]);
}

// ── Point-in-polygon (ray casting) ───────────────────────────────────────

function pointInPolygon(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi,yi]=poly[i], [xj,yj]=poly[j];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi))
      inside = !inside;
  }
  return inside;
}

// ── Build horizontal scanline strokes ────────────────────────────────────

function buildScanlines(poly: Pt[], count: number): Stroke[] {
  let minY=Infinity, maxY=-Infinity;
  for (const [,y] of poly) { if(y<minY)minY=y; if(y>maxY)maxY=y; }

  let minX=Infinity, maxX=-Infinity;
  for (const [x] of poly) { if(x<minX)minX=x; if(x>maxX)maxX=x; }

  const strokes: Stroke[] = [];
  const SAMPLES = 80; // points per scanline for smooth curve

  for (let i=0; i<count; i++) {
    const y = minY + (i/(count-1))*(maxY-minY);
    // Find x-intersections at this y
    const xs: number[] = [];
    for (let j=0, k=poly.length-1; j<poly.length; k=j++) {
      const [xj,yj]=poly[j], [xk,yk]=poly[k];
      if ((yj<=y && yk>y) || (yk<=y && yj>y)) {
        xs.push(xj + (y-yj)/(yk-yj)*(xk-xj));
      }
    }
    xs.sort((a,b)=>a-b);
    // Pair intersections → filled segments
    for (let p=0; p+1<xs.length; p+=2) {
      const x0=xs[p], x1=xs[p+1];
      if (x1-x0 < 0.005) continue;
      const stroke: Stroke = [];
      for (let s=0; s<SAMPLES; s++) {
        stroke.push([x0+(s/(SAMPLES-1))*(x1-x0), y]);
      }
      strokes.push(stroke);
    }
  }
  return strokes;
}

// ── Public hook ───────────────────────────────────────────────────────────

export function useFLogoStrokes(count = 80): Stroke[] {
  return useMemo(() => {
    const raw = parsePath(RAW_D);
    const poly = transformAndNormalise(raw);
    return buildScanlines(poly, count);
  }, [count]);
}

// Keep old export for compatibility
export function useFLogoPoints(count = 120): Pt[] {
  return useMemo(() => {
    const raw = parsePath(RAW_D);
    return transformAndNormalise(raw).slice(0, count) as Pt[];
  }, [count]);
}
