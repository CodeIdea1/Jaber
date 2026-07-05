"use client";
import { useRef } from "react";
import dynamic from "next/dynamic";
import HeroSection from "./sections/HeroSection";
import IntroSection from "./sections/IntroSection";
import type AnimationCanvasType from "./components/FLogoAnimation/AnimationCanvas";

type ACProps = React.ComponentProps<typeof AnimationCanvasType>;
const AnimationCanvas = dynamic<ACProps>(
  () => import("./components/FLogoAnimation/AnimationCanvas"),
  { ssr: false }
);

/*
 * حساب موضع حرف F على الشاشة من إحداثيات Three.js:
 *
 * strandPaths.ts:
 *   Y_OFFSET = 0.48
 *   TOP  =  0.60 + 0.48 =  1.08
 *   BOT  = -0.60 + 0.48 = -0.12
 *   BAR_R = 0.40  (أقصى يمين)
 *   stem left = -0.20
 *
 * Camera: z=2.2, fov=48° → half-angle=24°
 *   visibleH = 2 * tan(24°) * 2.2 = 1.956 وحدة
 *
 * F bounding box في Three.js world:
 *   x: -0.20 → 0.40   (width  = 0.60)
 *   y: -0.12 → 1.08   (height = 1.20)
 *   cx = 0.10,  cy = 0.48
 *
 * نحوّل لـ CSS % من مركز الكانفاس:
 *   scaleH = 100 / 1.956 = 51.13 % per unit
 *   (aspect ratio يُحسب في runtime)
 */

export default function Home() {
  const progressRef   = useRef<number>(0);
  const scaleRef      = useRef<number>(1);
  const translateRef  = useRef<number>(0);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const logoRef       = useRef<HTMLDivElement>(null);

  return (
    <main style={{ position: "relative", overflowX: "hidden" }}>
      {/* الكانفاس + اللوجو — fixed مستقل */}
      <div
        ref={canvasWrapRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <AnimationCanvas
          autoPlay={false}
          progressRef={progressRef}
          scaleRef={scaleRef}
          translateRef={translateRef}
        />

        {/*
         * اللوجو SVG — مضبوط بدقة فوق حرف F في الكانفاس
         *
         * Three.js F center: cx=0.10, cy=0.48
         * visibleH = 1.956 units → 100vh
         * visibleW = 1.956 * aspectRatio units → 100vw
         *
         * F height = 1.20 units → 1.20/1.956 * 100vh ≈ 61.35vh
         * F width  = 0.60 units → 0.60/1.956 * 100vh ≈ 30.67vh
         *
         * F center Y from canvas center: cy=0.48 → 0.48/1.956*100vh ≈ 24.54vh (upward)
         * F center X from canvas center: cx=0.10 → depends on aspect, use vw
         *   at 16:9: visibleW=3.476 → 0.10/3.476*100vw ≈ 2.88vw (rightward)
         *
         * نستخدم transform لتوسيط اللوجو على مركز F
         */}
        <div
          ref={logoRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(calc(-50% + 2.88vw), calc(-50% - 14vh))",
            width:  "16vh",
            height: "32vh",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox="0 0 1024 1024"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="fGradLogo" x1="0%" y1="0%" x2="60%" y2="100%">
                <stop offset="0%"   stopColor="#D6C3AB" />
                <stop offset="50%"  stopColor="#9A7B5E" />
                <stop offset="100%" stopColor="#3E3028" />
              </linearGradient>
            </defs>
            <g transform="translate(0,1024) scale(0.1,-0.1)" fill="url(#fGradLogo)">
              <path d="M5317 8980 c-82 -14 -139 -57 -354 -270 -2402 -2369 -2974 -2940
-3006 -2997 -46 -85 -48 -126 -45 -943 l3 -765 813 0 813 0 -283 -274 c-156
-151 -483 -475 -728 -720 -388 -389 -451 -456 -493 -527 -59 -100 -90 -175
-113 -274 -14 -65 -17 -144 -19 -580 -3 -642 3 -781 34 -835 62 -112 187 -134
761 -135 357 0 662 14 764 35 38 8 87 26 109 40 74 50 69 -82 67 1697 l-1
1598 2533 0 2533 0 3 860 2 860 -1484 0 c-995 0 -1510 -4 -1563 -11 -125 -17
-231 -47 -332 -95 -175 -82 -122 -35 -1031 -924 -250 -245 -501 -490 -557
-544 l-103 -100 0 1597 0 1597 2298 2 2297 3 66 26 c104 40 157 76 250 168 86
86 171 208 555 796 61 94 177 270 257 393 177 269 200 308 192 322 -8 12
-4164 12 -4238 0z"/>
            </g>
          </svg>
        </div>
      </div>

      <IntroSection
        progressRef={progressRef}
        scaleRef={scaleRef}
        translateRef={translateRef}
        canvasWrapRef={canvasWrapRef}
        logoRef={logoRef}
      />
      <HeroSection />
    </main>
  );
}
