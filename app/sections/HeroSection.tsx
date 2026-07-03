// HeroSection.jsx
"use client";
import { useEffect } from "react";
import Image from "next/image";
import styles from "../styles/heroSection.module.css";

const BRAND_WORD = "FRAMELINE";

export default function HeroSection() {
  useEffect(() => {
    const el = document.getElementById("brandText") as SVGTextElement | null;
    if (el) console.log("getTotalLength:", el.getComputedTextLength());
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.sunray}>
        <div className={styles.beam1} />
        <div className={styles.beam2} />
      </div>

      {/* الكلمة خلف الشخص - SVG واحد يضمن تساوي المسافات */}
      <div className={styles.brandTextWrap}>
        <svg className={styles.brandSvg} viewBox="0 0 900 200" aria-label={BRAND_WORD}>
          <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#D2C0B1" />
              <stop offset="50%"  stopColor="#C8956A" />
              <stop offset="100%" stopColor="#D2C0B1" />
            </linearGradient>
            <linearGradient id="brandGradFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#D2C0B1" stopOpacity="0.92" />
              <stop offset="55%"  stopColor="#A87850" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#665344" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <text
            x="450"
            y="160"
            textAnchor="middle"
            fontFamily="RuthClair, serif"
            fontWeight="400"
            id="brandText"
            className={styles.letterPath}
          >
            {BRAND_WORD}
          </text>
        </svg>
      </div>

      <Image
        src="/jaber.png"
        alt="Jaber"
        width={750}
        height={870}
        className={styles.heroImage}
        priority
      />
    </section>
  );
}