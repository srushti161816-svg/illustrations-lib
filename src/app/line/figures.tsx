import type { CSSProperties, ReactNode } from "react";

// Flat figures, animated by line.css alone. Every element that loops has an inline transform for its rest pose,
// which the animation overrides while it runs, so under reduced motion the figure still composes.

const f = (n: number) => Math.round(n * 100) / 100;
const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
// Custom properties, typed for `style`.
const vars = (v: Record<string, string | number>) => v as CSSProperties;

function Art({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className="ln-art" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/** A line from (x1, y1) to (x2, y2) with an arrowhead at the end. */
function arrow(x1: number, y1: number, x2: number, y2: number, head = 5) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const wing = (d: number) => `${f(x2 - head * Math.cos(a + d))} ${f(y2 - head * Math.sin(a + d))}`;
  return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}M${wing(0.45)}L${f(x2)} ${f(y2)}L${wing(-0.45)}`;
}

/** A plus or a minus, drawn rather than typeset. */
const sign = (x: number, y: number, plus: boolean) => `M${x - 4} ${y}H${x + 4}` + (plus ? `M${x} ${y - 4}V${y + 4}` : "");

export function Venn() {
  const hatch = range(-30, 230, 6).map((x) => `M${x} 150L${x + 40} 50`).join("");
  return (
    <Art label="Two overlapping circles that drift together and apart, their overlap hatched">
      <defs>
        <clipPath id="ln-venn-a">
          <circle className="ln-drift-right" cx={80} cy={100} r={40} />
        </clipPath>
        <clipPath id="ln-venn-b">
          <circle className="ln-drift-left" cx={120} cy={100} r={40} />
        </clipPath>
      </defs>
      <circle className="ln-drift-right" cx={80} cy={100} r={40} />
      <circle className="ln-drift-left" cx={120} cy={100} r={40} />
      <g clipPath="url(#ln-venn-a)">
        <g clipPath="url(#ln-venn-b)">
          <path className="ln-hatch" d={hatch} />
        </g>
      </g>
    </Art>
  );
}

export function Nested() {
  // Four circles all touching at one point at the bottom, signs alternating in the bands between them.
  const B = 170, radii = [70, 56, 42, 28];
  return (
    <Art label="Nested circles touching at one point, rippling outward from the smallest">
      {radii.map((r, i) => {
        const next = radii[i + 1];
        const y = next ? B - r - next : B - r;
        return (
          <g key={r} className="ln-ripple" style={{ animationDelay: `${(radii.length - 1 - i) * 180}ms` }}>
            <circle cx={100} cy={B - r} r={r} />
            <path d={sign(100, y, i % 2 === 1)} />
          </g>
        );
      })}
    </Art>
  );
}

export function Cone() {
  const rays = [0, 25, -25, 180, 155, -155].map((d) => {
    const a = (d * Math.PI) / 180;
    return arrow(100, 100, 100 + 74 * Math.cos(a), 100 - 74 * Math.sin(a), 4);
  });
  const fronts = range(0, 4, 1);
  return (
    <Art label="A double cone, wavefronts widening from its apex to both rims">
      <path className="ln-dim" d={rays.join("") + arrow(100, 100, 100, 18, 4) + arrow(100, 100, 100, 182, 4)} />
      <path d="M66 44L134 156M134 44L66 156" />
      <ellipse cx={100} cy={44} rx={34} ry={8} />
      <ellipse cx={100} cy={156} rx={34} ry={8} />
      {fronts.map((k) => {
        const p = (k + 0.5) / fronts.length, delay = `${-k * 1100}ms`;
        return (
          <g key={k}>
            <ellipse
              className="ln-cone-up ln-hair"
              cx={100} cy={44} rx={34} ry={8}
              style={{ ...vars({ "--o": "100px 44px" }), animationDelay: delay, transform: `translateY(${f(56 * (1 - p))}px) scale(${f(p)})` }}
            />
            <ellipse
              className="ln-cone-up ln-cone-down ln-hair"
              cx={100} cy={156} rx={34} ry={8}
              style={{ ...vars({ "--o": "100px 156px" }), animationDelay: delay, transform: `translateY(${f(-56 * (1 - p))}px) scale(${f(p)})` }}
            />
          </g>
        );
      })}
    </Art>
  );
}

export function Spiral() {
  // A golden rectangle cut into squares, top, right, bottom, left, a quarter circle drawn through each.
  const PHI = (1 + Math.sqrt(5)) / 2;
  let x = 57, y = 30.4, w = 86, h = 86 * PHI;
  const squares: string[] = [];
  let spiral = `M${f(x)} ${f(y)}`;
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? h : w;
    let sx = x, sy = y, ex: number, ey: number;
    switch (i % 4) {
      case 0: ex = x + side; ey = y + side; y += side; h -= side; break;
      case 1: sx = x + w - side; ex = sx; ey = y + side; w -= side; break;
      case 2: sy = y + h - side; ex = x; ey = sy; h -= side; break;
      default: ex = x + side; ey = y; x += side; w -= side;
    }
    squares.push(`M${f(sx)} ${f(sy)}h${f(side)}v${f(side)}h${f(-side)}Z`);
    spiral += `A${f(side)} ${f(side)} 0 0 1 ${f(ex)} ${f(ey)}`;
  }
  return (
    <Art label="A golden rectangle cut into squares, its spiral drawing itself">
      <rect x={57} y={30.4} width={86} height={f(86 * PHI)} />
      <path className="ln-dim" d={squares.join("")} />
      <path className="ln-spiral" d={spiral} pathLength={1} />
    </Art>
  );
}

export function Wave() {
  // y = 100 - 28 sin(2π(x - 35) / 60): at the axis, x = 50, it starts at its peak, where the dot starts.
  const wave = range(-24, 176, 2).map((x, i) => `${i ? "L" : "M"}${x} ${f(100 - 28 * Math.sin((2 * Math.PI * (x - 35)) / 60))}`).join("");
  return (
    <Art label="A sine wave travelling along its axis, a dot on the vertical axis riding it">
      <defs>
        <clipPath id="ln-wave-window">
          <rect x={36} y={40} width={136} height={120} />
        </clipPath>
      </defs>
      <path className="ln-dim" d={arrow(36, 100, 182, 100) + arrow(50, 164, 50, 32)} />
      <g clipPath="url(#ln-wave-window)">
        <path className="ln-wave-scroll" d={wave} />
      </g>
      <circle className="ln-dot ln-wave-dot" cx={50} cy={100} r={3} style={{ transform: "translateY(-28px)" }} />
    </Art>
  );
}

export function Orbits() {
  const planets = [
    { r: 34, size: 3.5, dur: 9, at: -2 },
    { r: 52, size: 4, dur: 16, at: -5 },
    { r: 72, size: 4.5, dur: 28, at: -19 },
  ];
  return (
    <Art label="A star and its rings, planets orbiting at different speeds">
      <circle cx={100} cy={100} r={9} />
      <circle cx={100} cy={100} r={20} />
      {planets.map(({ r }) => (
        <circle key={r} className="ln-dim" cx={100} cy={100} r={r} />
      ))}
      {planets.map(({ r, size, dur, at }) => (
        <g key={r} className="ln-spin" style={{ ...vars({ "--dur": `${dur}s` }), animationDelay: `${at}s`, transform: `rotate(${f((-at / dur) * 360)}deg)` }}>
          <circle cx={100} cy={100 - r} r={size} fill="var(--tile)" />
        </g>
      ))}
    </Art>
  );
}

export function Triad() {
  const centres = [-90, 30, 150].map((d) => [100 + 20 * Math.cos((d * Math.PI) / 180), 100 + 20 * Math.sin((d * Math.PI) / 180)]);
  const hatch = range(40, 160, 5).map((x) => `M${x} 160L${x + 30} 40`).join("");
  return (
    <Art label="Three overlapping circles turning slowly, the region all three share hatched">
      <defs>
        {centres.map(([cx, cy], i) => (
          <clipPath key={i} id={`ln-triad-${i}`}>
            <circle cx={f(cx)} cy={f(cy)} r={36} />
          </clipPath>
        ))}
      </defs>
      <g className="ln-spin" style={vars({ "--dur": "48s" })}>
        {centres.map(([cx, cy], i) => (
          <circle key={i} cx={f(cx)} cy={f(cy)} r={36} />
        ))}
        <g clipPath="url(#ln-triad-0)">
          <g clipPath="url(#ln-triad-1)">
            <g clipPath="url(#ln-triad-2)">
              <path className="ln-dim" d={hatch} />
            </g>
          </g>
        </g>
      </g>
    </Art>
  );
}

export function Tunnel() {
  // Outer square 40..160, the far end 92..108; perspective lines join matching points on the two.
  const lines = range(0, 6, 1).flatMap((k) => {
    const u = k / 6, o = 40 + 120 * u, n = 92 + 16 * u;
    return [`M${o} 40L${n} 92`, `M${o} 160L${n} 108`, `M40 ${o}L92 ${n}`, `M160 ${o}L108 ${n}`];
  });
  const frames = range(0, 5, 1);
  return (
    <Art label="A square tunnel, frames rushing toward the viewer from its far end">
      <path className="ln-dim" d={lines.join("")} />
      <rect x={40} y={40} width={120} height={120} />
      <rect x={92} y={92} width={16} height={16} strokeWidth={1.6} />
      {frames.map((k) => {
        const p = (k + 0.5) / frames.length;
        return (
          <rect
            key={k}
            className="ln-tunnel ln-hair"
            x={40} y={40} width={120} height={120}
            style={{ animationDelay: `${-k * 1000}ms`, transform: `scale(${f(0.1333 + 0.8667 * p * p)})` }}
          />
        );
      })}
    </Art>
  );
}

export function Polar() {
  const T = 5;
  // Angles clockwise from twelve o'clock, as the sweep turns.
  const blips = [
    { a: 60, r: 40 },
    { a: 200, r: 24 },
    { a: 300, r: 56 },
  ].map(({ a, r }) => ({ a, x: f(100 + r * Math.sin((a * Math.PI) / 180)), y: f(100 - r * Math.cos((a * Math.PI) / 180)) }));
  const spokes = range(0, 330, 30).map((d) => {
    const a = (d * Math.PI) / 180;
    return `M100 100L${f(100 + 64 * Math.sin(a))} ${f(100 - 64 * Math.cos(a))}`;
  });
  return (
    <Art label="A polar grid swept by a radar line that lights points as it passes">
      <path className="ln-faint" d={spokes.join("")} />
      {[16, 32, 48, 64].map((r) => (
        <circle key={r} className="ln-dim" cx={100} cy={100} r={r} />
      ))}
      <g className="ln-spin" style={vars({ "--dur": `${T}s` })}>
        <path d="M100 100V36" />
        <circle className="ln-dot" cx={100} cy={36} r={2.2} />
      </g>
      {blips.map(({ a, x, y }) => {
        const style = { ...vars({ "--o": `${x}px ${y}px` }), animationDelay: `${f((a / 360) * T)}s` };
        return (
          <g key={a}>
            <circle className="ln-blip ln-dot" cx={x} cy={y} r={2.6} style={style} />
            <circle className="ln-blip ln-hair" cx={x} cy={y} r={3} style={{ ...style, ...vars({ "--grow": 3.4 }) }} />
          </g>
        );
      })}
    </Art>
  );
}

// ---------- Science, after the dotted-node icon style: grey strokes, white points ----------

export function Molecule() {
  const nodes: [number, number, number][] = [
    [58, 62, 11], [86, 104, 9], [124, 92, 9], [152, 128, 9], [76, 144, 9], [130, 162, 10],
    [92, 46, 4], [116, 56, 4], [146, 60, 4], [158, 96, 4], [42, 104, 4], [46, 134, 4], [104, 140, 4], [168, 156, 4],
  ];
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [1, 4], [3, 5], [4, 5], [0, 6], [6, 7], [7, 2], [7, 8], [2, 9], [9, 3], [1, 10], [10, 11], [11, 4], [4, 12], [12, 2], [5, 13]];
  // How many links each big node is from the first, so the pulse runs through the molecule from there.
  const depth = [0, 1, 2, 3, 2, 3];
  const edge = (a: number, b: number) => {
    const [x1, y1, r1] = nodes[a], [x2, y2, r2] = nodes[b];
    const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    return `M${f(x1 + ux * r1)} ${f(y1 + uy * r1)}L${f(x2 - ux * r2)} ${f(y2 - uy * r2)}`;
  };
  return (
    <Art label="A molecule of linked atoms, a pulse running through its large ones">
      <g className="ln-dim">
        {nodes.map(([x, y, r], i) => (
          <circle key={i} className="ln-draw-in" cx={x} cy={y} r={r} pathLength={1} style={vars({ "--d": `${i * 50}ms` })} />
        ))}
        {links.map(([a, b], i) => (
          <path key={i} className="ln-draw-in" d={edge(a, b)} pathLength={1} style={vars({ "--d": `${300 + i * 40}ms` })} />
        ))}
      </g>
      {depth.map((n, i) => {
        const [x, y] = nodes[i];
        return (
          <g key={i} className="ln-pop-in" style={vars({ "--o": `${x}px ${y}px`, "--d": `${900 + i * 60}ms` })}>
            <circle className="ln-dot ln-pulse" cx={x} cy={y} r={2.2} style={vars({ "--o": `${x}px ${y}px`, "--d": `${1500 + n * 260}ms` })} />
          </g>
        );
      })}
    </Art>
  );
}

export function Virus() {
  const star = range(0, 31, 1).map((i) => {
    const a = (i / 32) * Math.PI * 2, r = i % 2 ? 19 : 25;
    return `${i ? "L" : "M"}${f(100 + r * Math.cos(a))} ${f(100 + r * Math.sin(a))}`;
  }).join("") + "Z";
  const spikes = range(0, 15, 1).map((i) => {
    const a = (i / 16) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return { x: f(100 + 70 * c), y: f(100 + 70 * s), d: `M${f(100 + 34 * c)} ${f(100 + 34 * s)}L${f(100 + 62 * c)} ${f(100 + 62 * s)}` };
  });
  return (
    <Art label="A virus, its spiked shell turning one way and its core the other">
      <path className="ln-dim ln-spin ln-reverse" d={star} style={vars({ "--dur": "24s" })} />
      <g className="ln-spin" style={vars({ "--dur": "60s" })}>
        <circle className="ln-dim" cx={100} cy={100} r={34} />
        <circle className="ln-dim" cx={100} cy={100} r={44} />
        <path className="ln-dim" d={spikes.map((s) => s.d).join("")} />
        {spikes.map(({ x, y }, i) => (
          <circle key={i} className="ln-dot ln-twinkle" cx={x} cy={y} r={2} style={vars({ "--d": `${i * 150}ms` })} />
        ))}
      </g>
    </Art>
  );
}

export function Bell() {
  const curve = (mu: number, sigma: number, height: number) =>
    range(40, 164, 2).map((x, i) => `${i ? "L" : "M"}${x} ${f(160 - height * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)))}`).join("");
  return (
    <Art label="Two distributions, a narrow one flattening as a wide one rises">
      <path className="ln-dim" d="M40 160H164M40 110H164" />
      <path className="ln-dim ln-tall ln-hair" d={curve(100, 10, 110)} />
      <path className="ln-dim ln-wide ln-hair" d={curve(112, 26, 50)} />
      {[[40, 160], [164, 160], [40, 110], [164, 110]].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="ln-dot" cx={x} cy={y} r={2.2} />
      ))}
      <circle className="ln-dot ln-tall-peak" cx={100} cy={50} r={2.2} />
      <circle className="ln-dot ln-wide-peak" cx={112} cy={110} r={2.2} />
    </Art>
  );
}

export function Tubes() {
  const tubes = [
    { x: 70, level: 96, dur: 2600 },
    { x: 100, level: 80, dur: 3100 },
    { x: 130, level: 112, dur: 2200 },
  ];
  return (
    <Art label="Three test tubes in a rack, their liquid rocking and bubbles rising">
      <g className="ln-dim">
        <path className="ln-draw-in" pathLength={1} d="M52 100H62M78 100H92M108 100H122M138 100H148M52 100V164M148 100V164M46 164H154" />
        {tubes.map(({ x }, i) => (
          <g key={x}>
            <path className="ln-draw-in" pathLength={1} d={`M${x - 8} 46V142a8 8 0 0 0 16 0V46`} style={vars({ "--d": `${200 + i * 120}ms` })} />
            <rect className="ln-draw-in" pathLength={1} x={x - 10} y={40} width={20} height={6} rx={1.5} style={vars({ "--d": `${200 + i * 120}ms` })} />
          </g>
        ))}
      </g>
      {tubes.map(({ x, level, dur }) => (
        <g key={x}>
          <path className="ln-bob" d={`M${x - 8} ${level}q4 -2.5 8 0t8 0`} style={vars({ "--dur": `${dur}ms` })} />
          {[0, 1].map((b) => (
            <circle
              key={b}
              className="ln-dot ln-bubble"
              cx={x + (b ? 3 : -2.5)} cy={138} r={1.6}
              style={vars({ "--rise": 138 - level - 8, "--dur": `${dur}ms`, "--d": `${-b * (dur / 2)}ms` })}
            />
          ))}
        </g>
      ))}
    </Art>
  );
}
