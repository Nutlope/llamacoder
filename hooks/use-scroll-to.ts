import { animate, ValueAnimationTransition } from "framer-motion";
import { useRef } from "react";

export function useScrollTo() {
  let ref = useRef<HTMLDivElement>(null);

  function scrollTo(options: ValueAnimationTransition = {}) {
    if (!ref.current) return;

    let defaultOptions: ValueAnimationTransition = {
      type: "spring",
      bounce: 0,
      duration: 0.6,
    };

    animate(window.scrollY, ref.current.offsetTop, {
      ...defaultOptions,
      ...options,
      onUpdate: (latest) => window.scrollTo({ top: latest }),
    });
  }

  return [ref, scrollTo] as const;
}
