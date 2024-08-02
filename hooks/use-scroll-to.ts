import { animate, ValueAnimationTransition } from "framer-motion";
import { useRef } from "react";

export function useScrollTo(
  options: ValueAnimationTransition = {
    type: "spring",
    bounce: 0,
    duration: 0.6,
  },
) {
  let ref = useRef<HTMLDivElement>(null);

  function scrollTo() {
    if (!ref.current) return;

    animate(window.scrollY, ref.current.offsetTop, {
      ...options,
      onUpdate: (latest) => {
        // console.log(latest);
        window.scrollTo({ top: latest });
      },
    });
  }

  return [ref, scrollTo] as const;
}
