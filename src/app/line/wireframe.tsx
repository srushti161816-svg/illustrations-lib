"use client";

import { useEffect, useRef } from "react";

/** A point in the figure's space: x right, y up, z toward the viewer, on a board 200 units wide centred on 0. */
export type V = readonly [number, number, number];
/** Open polylines; a closed one repeats its first point at its end. */
export type Lines = V[][];
/** A figure at time `t`, in seconds since it started moving. */
export type Draw = (t: number) => Lines;

// ---------- Geometry ----------

const TAU = Math.PI * 2;

export const rotX = (a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return ([x, y, z]: V): V => [x, y * c - z * s, y * s + z * c];
};
export const rotY = (a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return ([x, y, z]: V): V => [x * c + z * s, y, -x * s + z * c];
};
export const rotZ = (a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return ([x, y, z]: V): V => [x * c - y * s, x * s + y * c, z];
};

/** The transforms applied in order, the first one first. */
export const chain = (...fs: ((p: V) => V)[]) => (p: V) => fs.reduce((q, f) => f(q), p);

/** A closed loop of `n` segments through `f(angle)`, angle going once around. */
export const loop = (n: number, f: (a: number) => V): V[] => Array.from({ length: n + 1 }, (_, i) => f((i / n) * TAU));

/** An open run of `n` segments through `f(u)`, u going from 0 to 1. */
export const run = (n: number, f: (u: number) => V): V[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

export const each = (lines: Lines, f: (p: V) => V): Lines => lines.map((line) => line.map(f));

/** A flat circle on screen, for dots and outlines, which no view turns. */
export const ring = (x: number, y: number, r: number, n = 12): V[] => loop(n, (a) => [x + r * Math.cos(a), y + r * Math.sin(a), 0]);

/** A shaft from `a` to `b` with a head at `b`. `side` is a direction across the shaft that the head opens along. */
export function arrow(a: V, b: V, side: V, head = 6): Lines {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const back = (k: number): V => [
    b[0] - (d[0] / len) * head + side[0] * k,
    b[1] - (d[1] / len) * head + side[1] * k,
    b[2] - (d[2] / len) * head + side[2] * k,
  ];
  return [[a, b], [back(head * 0.5), b, back(-head * 0.5)]];
}

// Orthographic, as the figures are drawn: a point's screen position is its x and y, so depth never distorts a line.
const sx = (p: V) => Math.round((100 + p[0]) * 10) / 10;
const sy = (p: V) => Math.round((100 - p[1]) * 10) / 10;

export function toPath(lines: Lines): string {
  let d = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) d += `${i ? "L" : "M"}${sx(line[i])} ${sy(line[i])}`;
  }
  return d;
}

// ---------- Clock ----------

// One frame loop for every figure on the page, running only while one of them is on screen.
const listeners = new Set<(dt: number) => void>();
let frame = 0;
let last = 0;

function tick(now: number) {
  // A long gap (a background tab, a dropped frame) moves a figure on by at most a tenth of a second.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  for (const listener of listeners) listener(dt);
  frame = listeners.size ? requestAnimationFrame(tick) : 0;
}

function listen(listener: (dt: number) => void) {
  listeners.add(listener);
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(listener);
  };
}

// ---------- Figure ----------

/**
 * A figure drawn as one stroke, redrawn each frame while it is on screen. It renders, on the server too, at its
 * rest pose, `draw(rest)`, and stays there when reduced motion is asked for; when it moves, it moves on from there.
 */
export function Wireframe({ draw, rest = 0, label, dim }: { draw: Draw; rest?: number; label: string; dim?: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  const line = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = svg.current, path = line.current;
    if (!el || !path) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let t = rest, visible = false, stop: (() => void) | undefined;
    const step = (dt: number) => {
      t += dt;
      path.setAttribute("d", toPath(draw(t)));
    };
    const sync = () => {
      const moving = visible && !reduce.matches;
      if (moving && !stop) stop = listen(step);
      if (!moving && stop) {
        stop();
        stop = undefined;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    reduce.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      reduce.removeEventListener("change", sync);
      stop?.();
    };
  }, [draw, rest]);

  return (
    <svg ref={svg} viewBox="0 0 200 200" role="img" aria-label={label} className="ln-art" fill="none" stroke="currentColor">
      <path ref={line} d={toPath(draw(rest))} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={dim ? 0.6 : 1} />
    </svg>
  );
}
