"use client";

import { useEffect, useRef, useState } from "react";

// A Hairline page pads its content by 24px above and below.
const PAD = 48;

// What the showcase leaves out of each page: the read-out in the stage's top-right corner.
const HIDE = "#read { display: none; }";
// A figure that opens on click shows it on its plate.
const CLICKABLE = ".plate { cursor: pointer; }";

/**
 * One Hairline page in a frame sized to its content, so it never scrolls. With `onPlateClick`, a click on
 * the figure's plate calls it; the slider and theme switch below the plate keep working as they are.
 */
export function FigureFrame({ src, title, onPlateClick }: { src: string; title: string; onPlateClick?: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const onClick = useRef(onPlateClick);
  const clickable = Boolean(onPlateClick);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    onClick.current = onPlateClick;
  });

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    let heard: Document | undefined;
    // Clicks inside the frame never reach this page, so they are heard in the frame's own document.
    const click = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(".plate")) onClick.current?.();
    };
    // The page is same-origin, so its content can be measured; it is followed as it reflows.
    const fit = () => {
      const doc = frame.contentDocument, main = doc?.querySelector("main");
      if (!doc || !main) return;
      if (!doc.getElementById("showcase")) {
        const style = doc.createElement("style");
        style.id = "showcase";
        style.textContent = clickable ? HIDE + CLICKABLE : HIDE;
        doc.head.append(style);
      }
      if (clickable && heard !== doc) {
        heard?.removeEventListener("click", click);
        doc.addEventListener("click", click);
        heard = doc;
      }
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(main.offsetHeight + PAD));
      observer.observe(main);
    };
    frame.addEventListener("load", fit);
    fit();
    return () => {
      frame.removeEventListener("load", fit);
      heard?.removeEventListener("click", click);
      observer?.disconnect();
    };
  }, [clickable]);

  return (
    <iframe
      ref={ref}
      src={src}
      title={clickable ? `${title}, click to expand` : title}
      scrolling="no"
      style={height ? { height } : undefined}
      className="h-[480px] w-full overflow-hidden border-0"
    />
  );
}
