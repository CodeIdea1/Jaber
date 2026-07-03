import FLogoAnimation from "@/app/components/FLogoAnimation";
import HeroSection from "./sections/HeroSection";

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <HeroSection />
      <FLogoAnimation />
    </main>
  );
}
