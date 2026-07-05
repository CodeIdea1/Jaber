"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import styles from "./IntroSection.module.css";

gsap.registerPlugin(ScrollToPlugin);

interface IntroSectionProps {
  onLanded?: () => void;
  progressRef:   React.MutableRefObject<number>;
  scaleRef:      React.MutableRefObject<number>;
  translateRef:  React.MutableRefObject<number>;
  canvasWrapRef: React.RefObject<HTMLDivElement | null>;
  logoRef:       React.RefObject<HTMLDivElement | null>;
}

export default function IntroSection({
  onLanded,
  progressRef,
  scaleRef,
  translateRef,
  canvasWrapRef,
  logoRef,
}: IntroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const proxy = { p: 0, s: 1, tr: 0 };
    const vh    = window.innerHeight;

    const applyBg = (t: number) => {
      const r   = Math.round(155 + (13  - 155) * t);
      const g   = Math.round(155 + (12  - 155) * t);
      const b   = Math.round(155 + (11  - 155) * t);
      const col = `rgb(${r},${g},${b})`;
      if (sectionRef.current) sectionRef.current.style.background = col;
      const hero = document.querySelector<HTMLElement>(".bg-transition");
      if (hero) hero.style.background = col;
      document.body.style.background = col;
    };

    gsap.to(proxy, {
      p: 1, s: 0.18, tr: 1,
      duration: 6,
      ease: "power2.inOut",
      onUpdate() {
        progressRef.current  = proxy.p;
        scaleRef.current     = proxy.s;
        translateRef.current = proxy.tr;

        if (canvasWrapRef.current) {
          canvasWrapRef.current.style.transform = `translateY(${proxy.tr * vh * 0.35}px)`;
        }

        // crossfade ناعم: canvas يخفت، logo يظهر (tr: 0.80 → 1.0)
        if (proxy.tr > 0.80) {
          const crossT = (proxy.tr - 0.80) / 0.20; // 0→1
          const eased  = crossT < 0.5
            ? 2 * crossT * crossT
            : 1 - Math.pow(-2 * crossT + 2, 2) / 2; // easeInOutQuad
          const canvas = canvasWrapRef.current?.querySelector("canvas");
          if (canvas) (canvas as HTMLElement).style.opacity = String(1 - eased * 0.9);
          if (logoRef.current) {
            // نطبق نفس الـ scale الحالي للكانفاس على اللوجو
            const sc = scaleRef.current;
            logoRef.current.style.opacity   = String(eased);
            logoRef.current.style.transform =
              `translate(calc(-50% + 2.88vw), calc(-50% - 24.54vh)) scale(${sc})`;
          }
        }

        const t = Math.max(0, Math.min(1, (proxy.tr - 0.2) / 0.8));
        applyBg(t);
      },
      onComplete() {
        // الكانفاس يبقى fixed في مكانه — لا نقل DOM — لا وميض
        if (sectionRef.current) sectionRef.current.style.display = "none";
        window.scrollTo(0, 0);
        onLanded?.();
      },
    });

    gsap.to(window, {
      scrollTo: { y: vh, autoKill: false },
      duration: 3.5,
      delay: 1,
      ease: "power2.inOut",
    });
  }, [onLanded, progressRef, scaleRef, translateRef, canvasWrapRef, logoRef]);

  return <section ref={sectionRef} className={styles.intro} />;
}
