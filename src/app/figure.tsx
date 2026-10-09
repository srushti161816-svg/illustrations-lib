"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FigureFrame } from "./figure-frame";

// The expanded view fades and settles in on 220ms, from its @starting-style, and leaves a little faster, on 160ms.
const EXIT_MS = 160;

type Action = { label: string; href: string };

/** A figure in the grid that opens, on a click on its plate, into a full-screen view of itself. */
export function Figure({ src, title, action }: { src: string; title: string; action?: Action }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <FigureFrame src={src} title={title} onPlateClick={() => setOpen(true)} />
      {open && <Expanded src={src} title={title} action={action} onClose={close} />}
    </>
  );
}

/** The figure at full size in a modal dialog: Escape, the close button or a click beside the figure closes it. */
function Expanded({ src, title, action, onClose }: { src: string; title: string; action?: Action; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const root = document.documentElement, overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
    };
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(onClose, instant ? 0 : EXIT_MS);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="group fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-white/95 p-0 opacity-100 backdrop-blur-sm transition-opacity duration-220 ease-[cubic-bezier(.32,.72,0,1)] backdrop:bg-transparent starting:opacity-0 data-closing:opacity-0 data-closing:duration-160 motion-reduce:transition-none"
    >
      <div
        className="flex min-h-full items-center justify-center px-4 py-20"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="w-full max-w-3xl scale-100 transition-transform duration-220 ease-[cubic-bezier(.32,.72,0,1)] starting:scale-[0.97] group-data-closing:scale-[0.97] group-data-closing:duration-160 motion-reduce:transition-none">
          <FigureFrame src={src} title={title} />
        </div>
      </div>
      <Button variant="outline" size="icon" aria-label="Close" autoFocus onClick={close} className="fixed top-4 right-4 rounded-full">
        <XIcon />
      </Button>
      {action && (
        <Link href={action.href} className={buttonVariants({ size: "lg", className: "fixed right-6 bottom-6 rounded-full px-5" })}>
          {action.label}
        </Link>
      )}
    </dialog>
  );
}
