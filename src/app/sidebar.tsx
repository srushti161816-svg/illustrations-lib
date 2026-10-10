"use client";

import { Box, Orbit } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The two libraries. The videos page belongs to Hairline, since it records one of its figures.
const SECTIONS = [
  { href: "/", label: "Hairline", hint: "Isometric, answers the pointer", icon: Box, match: (p: string) => p === "/" || p.startsWith("/output") },
  { href: "/line", label: "Line", hint: "Geometric, always in motion", icon: Orbit, match: (p: string) => p.startsWith("/line") },
];

/** The rail on the left, on wide screens, or the bar on top, on narrow ones, that switches between the libraries. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-10 flex shrink-0 items-center gap-4 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur-sm md:h-dvh md:w-60 md:flex-col md:items-stretch md:gap-6 md:border-r md:border-b-0 md:px-3 md:py-6">
      <p className="px-2 text-sm font-medium tracking-tight text-neutral-900">Illustrations</p>
      <nav aria-label="Libraries" className="flex gap-1 md:flex-col">
        {SECTIONS.map(({ href, label, hint, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition-colors duration-150 ease-[ease] focus-visible:outline-2 focus-visible:outline-neutral-900 md:py-2",
                "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-neutral-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-neutral-900",
                active && "bg-neutral-100 text-neutral-900",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="flex flex-col">
                <span>{label}</span>
                <span className="hidden text-xs text-neutral-400 md:block">{hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
