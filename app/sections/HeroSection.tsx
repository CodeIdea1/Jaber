// HeroSection.tsx
"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import styles from "../styles/heroSection.module.css";
import { AiOutlineInstagram } from "react-icons/ai";
import { BsBehance, BsDribbble } from "react-icons/bs";

const BRAND_WORD = "FRAMELINE";

const FLOATING_IMAGES = [
  { src: "/DaVinci Resolve2.png", id: 0 },
  { src: "/Ae2.png", id: 1 },
  { src: "/pr2.png", id: 2 },
];

const FLOAT_ITEMS = Array.from({ length: 18 }, (_, i) => {
  const goldenRatio = 0.618033988;
  const left = ((i * goldenRatio) % 1) * 86 + 2;
  const dir = i % 2 === 0 ? 1 : -1;
  return {
    ...FLOATING_IMAGES[i % 3],
    uid: i,
    left,
    delay: i * 0.7,
    dur: 8 + (i % 5) * 1.1,
    size: 52 + (i % 4) * 10,
    dir,
    driftX: dir * (28 + (i % 3) * 16),
    riseY: 280 + (i % 4) * 55,
    entrySkew: dir * 22,
  };
});

const PARTICLE_COUNT = 180;

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const t = i / (PARTICLE_COUNT - 1);
  const startX = -20, startY = -60, endX = 420, endY = 1080;
  const baseX = startX + (endX - startX) * t;
  const baseY = startY + (endY - startY) * t;
  const spread = 130 + Math.sin(i * 12.9) * 70;
  const perpAngleOffset = (Math.sin(i * 47.3) * 0.5 + Math.sin(i * 91.1) * 0.5) * spread;
  const dirX = endX - startX, dirY = endY - startY;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const perpX = -dirY / len, perpY = dirX / len;
  return {
    id: i,
    x: parseFloat((baseX + perpX * perpAngleOffset).toFixed(2)),
    y: parseFloat((baseY + perpY * perpAngleOffset).toFixed(2)),
    delay: (i * 0.13) % 6,
    dur: 3 + (i % 8) * 0.4,
    dx: (Math.sin(i * 37.3) * 0.5).toFixed(2),
    dy: (-0.15 - Math.abs(Math.sin(i * 61.7)) * 0.4).toFixed(2),
    r: (0.5 + Math.abs(Math.sin(i * 5.7)) * 0.5).toFixed(2),
  };
});

export default function HeroSection() {
  const lightRef = useRef<HTMLImageElement>(null);
  const jaberRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const floatRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (jaberRef.current) {
      gsap.fromTo(
        jaberRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 2.9, ease: "power2.out", delay: 4.5 }
      );
    }

    floatRefs.current.forEach((el, i) => {
      if (!el) return;
      const item = FLOAT_ITEMS[i];
      const tl = gsap.timeline({ repeat: -1, delay: item.delay });
      tl.set(el, { y: 20, x: item.driftX * -0.15, opacity: 0, skewX: item.entrySkew, scale: 0.82 })
        .to(el, {
          y: -item.riseY * 0.18,
          x: item.driftX * 0.08,
          opacity: 0.42,
          skewX: 0,
          scale: 1,
          duration: 1.6,
          ease: "power2.out",
        })
        .to(el, {
          y: -item.riseY * 0.78,
          x: item.driftX * 0.6,
          skewX: 0,
          opacity: 0.38,
          scale: 0.96,
          duration: item.dur * 0.52,
          ease: "sine.inOut",
        })
        .to(el, {
          y: -item.riseY,
          x: item.driftX,
          skewX: item.entrySkew * 0.6,
          opacity: 0,
          scale: 0.78,
          duration: item.dur * 0.48,
          ease: "power1.in",
        });
    });

    const onMove = (e: MouseEvent) => {
      if (!lightRef.current || !sectionRef.current) return;
      const sr = sectionRef.current.getBoundingClientRect();
      if (e.clientX < sr.left || e.clientX > sr.right || e.clientY < sr.top || e.clientY > sr.bottom) return;
      const lr = lightRef.current.getBoundingClientRect();
      const x = e.clientX - lr.left;
      const y = e.clientY - lr.top;
      lightRef.current.style.webkitMaskImage = `radial-gradient(circle 180px at ${x}px ${y}px, black 40%, transparent 100%)`;
      lightRef.current.style.maskImage = `radial-gradient(circle 180px at ${x}px ${y}px, black 40%, transparent 100%)`;
      gsap.to(lightRef.current, { opacity: 1, duration: 0.4, ease: "power2.out", overwrite: true });
    };

    const onLeave = (e: MouseEvent) => {
      if (!lightRef.current || !sectionRef.current) return;
      const sr = sectionRef.current.getBoundingClientRect();
      if (e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom) return;
      gsap.to(lightRef.current, {
        opacity: 0, duration: 0.5, ease: "power2.in", overwrite: true,
        onComplete: () => {
          if (!lightRef.current) return;
          lightRef.current.style.webkitMaskImage = "none";
          lightRef.current.style.maskImage = "none";
        },
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousemove", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousemove", onLeave);
    };
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.hero} bg-transition`}>
      {/* صور طائرة */}
      <div className={styles.floatingZone}>
        {FLOAT_ITEMS.map((item, i) => (
          <img
            key={item.uid}
            ref={el => { floatRefs.current[i] = el; }}
            src={item.src}
            alt=""
            className={styles.floatImg}
            style={{ left: `${item.left}%`, width: item.size, height: item.size }}
          />
        ))}
      </div>

      {/* حزمة الضوء */}
      <div className={styles.sunray}>
        <div className={styles.beam1} />
        <div className={styles.beam2} />
      </div>

      {/* توهج خلفي */}
      <div className={styles.backGlow} />

      {/* جسيمات */}
      <svg className={styles.particles} viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {PARTICLES.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={p.r} fill="#D6C3AB">
            <animate attributeName="opacity" values="0;1;0" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <animateTransform attributeName="transform" type="translate" values={`0,0; ${p.dx},${p.dy}; 0,0`} dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* الكلمة خلف الشخص */}
      <div className={styles.brandTextWrap}>
        <svg className={styles.brandSvg} viewBox="0 0 900 200" aria-label={BRAND_WORD}>
          <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#ECDBB8" />
              <stop offset="25%"  stopColor="#C89B6E" />
              <stop offset="55%"  stopColor="#7A5F45" />
              <stop offset="80%"  stopColor="#584A3B" />
              <stop offset="100%" stopColor="#2C2622" />
            </linearGradient>
            <linearGradient id="brandGradFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#F3E4CE" stopOpacity="0.9" />
              <stop offset="30%"  stopColor="#C89B6E" stopOpacity="0.85" />
              <stop offset="65%"  stopColor="#6E5640" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#2C2622" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          <text x="450" y="160" textAnchor="middle" fontFamily="RuthClair, serif" fontWeight="400" id="brandText" className={styles.letterPath}>
            {BRAND_WORD}
          </text>
        </svg>
      </div>

      {/* التاجلاين */}
      <p className={styles.tagline}>VISION. DESIGN. IMPACT.</p>

      {/* فوتر بار */}
      <div className={styles.footerBar}>
        <div className={styles.footerIcons}>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><AiOutlineInstagram size={22} /></a>
          <a href="https://behance.net" target="_blank" rel="noopener noreferrer" aria-label="Behance"><BsBehance size={20} /></a>
          <a href="https://dribbble.com" target="_blank" rel="noopener noreferrer" aria-label="Dribbble"><BsDribbble size={20} /></a>
        </div>
        <p className={styles.footerText}>BASED IN PALESTINE &nbsp;·&nbsp; AVAILABLE WORLDWIDE</p>
      </div>

      {/* صورة الأساس */}
      <img src="/jaber-without-light2.png" alt="Jaber base" className={styles.heroImage} fetchPriority="high" />

      {/* jaber.png */}
      <div ref={jaberRef} className={styles.heroImageAnimWrap}>
        <img src="/jaber.png" alt="Jaber" className={styles.heroImageAnim} fetchPriority="high" />
      </div>

      {/* light4 */}
      <Image src="/light4.png" alt="light4" width={420} height={420} className={styles.light4} priority />

      {/* jaber-with-light.png */}
      <img ref={lightRef} src="/jaber-with-light.png" alt="" className={styles.heroImageLight} fetchPriority="low" />

      {/* إحصائيات يمين */}
      <div className={styles.statsPanel}>
        <div className={styles.statsLine}>
          <span className={`${styles.lineDot} ${styles.lineDotTop}`} />
          <span className={styles.lineDotMidTop} />
          <span className={styles.lineDotMidBot} />
          <span className={`${styles.lineDot} ${styles.lineDotBottom}`} />
        </div>
        <div className={styles.statsItems}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>50+</span>
            <span className={styles.statLabel}>PROJECTS<br />COMPLETED</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>30+</span>
            <span className={styles.statLabel}>HAPPY<br />CLIENTS</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>5+</span>
            <span className={styles.statLabel}>YEARS OF<br />EXPERIENCE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
