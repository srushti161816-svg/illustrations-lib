"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

/**
 * One figure on its plate. While the plate is off screen it carries no `data-active`, and line.css holds every
 * animation in it still, so a draw-in plays when it is first seen and no loop runs where nobody is looking.
 */
export function Tile({ name, index, children }: { name: string; index: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => el.toggleAttribute("data-active", entry.isIntersecting), { rootMargin: "64px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={ref} className="ln-tile" style={{ "--i": index } as CSSProperties}>
      {children}
      <figcaption>{name}</figcaption>
    </figure>
  );
}
