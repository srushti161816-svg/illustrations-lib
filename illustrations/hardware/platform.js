/**
 * Platform: a thick 3 × 3 slotted plinth holding five modules, with two small
 * satellite boxes on the ground linked to it by dashed runs. The module under
 * the pointer lifts out of its slot on four dashed drops, and the others
 * settle back in, staggered outwards from it, each on a soft spring. Each
 * module has a panel and a status light on its lid; the chosen one's light is
 * bright. At rest one module floats over its slot. The slider is the lift, in
 * world units.
 *
 * The pattern: one of many, on a grid. Drops are appended before the module
 * they hang from, so its lid covers their tops. The hit test reads each
 * module's resting lid.
 */
const {
  Cam, fit, facing, flatDot, mk, place, pointer, poly, prism, proj, put, ringAt, rings, rrect, seg, solid, unproj,
  spring, stepS, reducedMotion, register, disposer,
} = HL;

// Pastels: the part under the pointer fills with its own, and its inner lines deepen to a shade of the
// same hue, so they keep reading on the colour; both are given up when let go.
// Each tone, light then dark: the pastel fill, the ink its lines and dots deepen to, and a deeper fill for parts
// on a chosen layer. They are theme variables, so switching the theme recolours a chosen part at once.
const TONES = {
  light: [["#FFE3EC", "#C7869C", "#FFCADB"], ["#DDF2FF", "#7FA9C4", "#BFE3FA"], ["#D9FBE8", "#74B391", "#B9F2D3"],
    ["#FFEBD6", "#C99A6C", "#FFD9B3"], ["#ECE6FF", "#9A8CC9", "#DCD2FF"], ["#FFF7C2", "#BFAE5A", "#FFEE99"]],
  dark: [["#3A2430", "#E8A5BB", "#4E2C3D"], ["#1C3040", "#8EC5E8", "#234560"], ["#1B3A2C", "#86D4AA", "#22513B"],
    ["#3D2E1F", "#E5B98A", "#553D25"], ["#2C2745", "#B5A8EC", "#3B3361"], ["#3A3520", "#DCCB7A", "#504822"]],
};
const vars = (t) => TONES[t].map(([p, i, d], k) => `--hl-p${k}:${p};--hl-i${k}:${i};--hl-d${k}:${d};`).join("");
const THEME = `:root{${vars("light")}}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${vars("dark")}}}`
  + `:root[data-theme="dark"]{${vars("dark")}}`;
const tone = (c) => [0, 1, 2, 3, 4, 5].map((k) => `var(--hl-${c}${k})`);
const PASTEL = tone("p"), INK = tone("i");
const EASE = "cubic-bezier(.32, .72, 0, 1)";
function tint(el, k, on, lines = [], dots = []) {
  const t = reducedMotion() ? "none" : `fill ${on ? 220 : 160}ms ${EASE}, stroke ${on ? 220 : 160}ms ${EASE}`;
  el.sil.style.transition = t;
  el.sil.style.fill = on ? PASTEL[k % PASTEL.length] : "";
  for (const line of [el.cr, ...lines]) {
    line.style.transition = t;
    line.style.stroke = on ? INK[k % INK.length] : "";
  }
  // Dots on the part take its ink too, or a dim dot would vanish into the pastel.
  for (const dot of dots) {
    dot.style.transition = t;
    dot.style.fill = on ? INK[k % INK.length] : "";
  }
}

// A soft, critically damped spring: it takes up a new target from wherever it is, and never overshoots.
const SOFT = { k: 110, c: 21, eps: 0.02 };

/** Sends spring sp toward `to` once `delay` ms have passed; until then it keeps its current course. */
function aim(sp, to, now, delay) {
  sp.to = to;
  sp.at = now + (reducedMotion() ? 0 : delay);
}

/** Advances spring sp by dt, taking up its pending target when its time comes; true while it is still moving. */
function step(sp, dt, now) {
  if (sp.to !== undefined && now >= sp.at) { sp.t = sp.to; sp.to = undefined; }
  return stepS(sp, dt) || sp.to !== undefined;
}

const CELL = 30, E = 3 * CELL, MH = 9, PH = 8, STEP = 45, HIGH = 28;
// The modules' slots, and how high each floats at rest.
const MODS = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2]];
const REST = [0, 3, 0, 15, 0], LEAD = 3;
// The satellites on the ground, and where each one's run meets the plinth.
const SATS = [[[24, 120, 44, 134], [34, 120], [34, E + 6]], [[120, 24, 134, 44], [120, 34], [E + 6, 34]]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let lift = value, act = -1;

  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-6, -6, -PH], [134, 24, -PH], [24, 134, -PH], [E + 6, E + 6, -PH], [0, 0, HIGH + MH], [CELL, 0, HIGH + MH], [0, CELL, HIGH + MH]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The plinth, its empty slot outlines, and the satellites with their runs.
  const [pr, pi] = rings(-6, -6, E + 6, E + 6, 2.4, 2);
  put(solid(g), prism(P, front, pr, pi, -PH, 0));
  mk("path", {
    d: [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => poly(ringAt(P, rrect(i * CELL + 3, j * CELL + 3, (i + 1) * CELL - 3, (j + 1) * CELL - 3, 1, 4), 0)))).join(""),
    class: "nf lo",
  }, g);
  for (const [[x0, y0, x1, y1], a, b] of SATS) {
    mk("path", { d: seg(P(a[0], a[1], -PH), P(b[0], b[1], -PH)), class: "dash nf" }, g);
    const [sr, si] = rings(x0, y0, x1, y1, 1.2, 0.9);
    put(solid(g), prism(P, front, sr, si, -PH, -PH + 7));
    place(flatDot(g, C, 0.7, "dot off"), P(x1 - 4, y0 + 4, -PH + 7));
  }

  // The modules, far corner first, so appending is painting back to front.
  const mods = MODS.map(([i, j], k) => ({ k, i, j })).sort((a, b) => a.i + a.j - (b.i + b.j));
  for (const m of mods) {
    const x0 = m.i * CELL + 4, y0 = m.j * CELL + 4, x1 = x0 + CELL - 8, y1 = y0 + CELL - 8;
    [m.ring, m.inner] = rings(x0, y0, x1, y1, 1.4, 1);
    m.feet = [[x0 + 4, y0 + 4], [x1 - 4, y0 + 4], [x0 + 4, y1 - 4], [x1 - 4, y1 - 4]];
    m.panelRing = rrect(x0 + 5, y0 + 5, x1 - 9, y1 - 5, 0.8, 4);
    m.ledAt = [x1 - 4.5, y0 + 4.5];
    m.drops = mk("path", { class: "dash nf" }, g);
    m.el = solid(g);
    m.panel = mk("path", { class: "nf lo" }, m.el.g);
    m.led = flatDot(m.el.g, C, 0.8, m.k === LEAD ? "dot" : "dot off");
    m.el.sil.classList.toggle("hi", m.k === LEAD);
    m.z = spring(REST[m.k], SOFT);
    m.drawn = NaN;
  }

  const loop = register(stage, (dt, now) => {
    let moving = false;
    for (const m of mods) {
      if (step(m.z, dt, now)) moving = true;
      const z = m.z.x;
      if (z === m.drawn) continue;
      m.drawn = z;
      put(m.el, prism(P, front, m.ring, m.inner, z, z + MH));
      m.panel.setAttribute("d", poly(ringAt(P, m.panelRing, z + MH)));
      place(m.led, P(m.ledAt[0], m.ledAt[1], z + MH));
      m.drops.setAttribute("d", z > 0.5 ? m.feet.map(([x, y]) => seg(P(x, y, 0), P(x, y, z))).join("") : "");
    }
    return moving;
  });
  bag.add(loop.unregister);

  /** The module whose resting lid holds the point, the nearest if two do; -1 off the modules. */
  function hit(p) {
    let best = null;
    for (const m of mods) {
      const [x, y] = unproj(C, p[0], p[1], REST[m.k] + MH);
      const inside = x > m.i * CELL && x < (m.i + 1) * CELL && y > m.j * CELL && y < (m.j + 1) * CELL;
      if (inside && (!best || m.i + m.j > best.i + best.j)) best = m;
    }
    return best ? best.k : -1;
  }

  /** Lifts module a (-1 settles them back). The stagger spreads out from the module chosen, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), f = mods.find((m) => m.k === (a >= 0 ? a : act));
    act = a;
    for (const m of mods) {
      const on = m.k === (a < 0 ? LEAD : a);
      aim(m.z, a < 0 ? REST[m.k] : m.k === a ? lift : 0, now, Math.hypot(m.i - f.i, m.j - f.j) * STEP);
      m.el.sil.classList.toggle("hi", on);
      tint(m.el, m.k, m.k === a, [m.panel]);
      m.led.setAttribute("class", on ? "dot" : "dot off");
    }
    read.textContent = a < 0 ? "rest" : `slot ${f.i + 1}·${f.j + 1}`;
    loop.wake();
  }

  bag.add(pointer(stage, { move: (p) => { const a = hit(p); if (a >= 0) setActive(a); }, leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      lift = v;
      if (act >= 0) { aim(mods.find((m) => m.k === act).z, lift, performance.now(), 0); loop.wake(); }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "platform",
  means: "A slotted platform of modules: the one under the pointer lifts out of its slot, and the rest settle back in.",
  rules: [1, 2, 4, 6],
  range: [10, 18, 28],
  mount,
});
