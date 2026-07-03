import { useEffect, useRef } from "react";
import gsap from "gsap";

export interface AnimState {
  progress: number;
}

export function useAnimation(): React.MutableRefObject<AnimState> {
  const state = useRef<AnimState>({ progress: 0 });

  useEffect(() => {
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 7.5,
      ease: "power1.inOut",
      onUpdate() { state.current.progress = proxy.p; },
    });
    return () => { tween.kill(); };
  }, []);

  return state;
}
