/**
 * Apps: a 3 × 3 grid of app tiles on a plinth, each a square block with a
 * small glyph on its face. The tile under the pointer pops up; the others
 * ripple, the nearest a little, staggered outwards from it, each on a soft
 * spring. At rest the tiles stand at uneven heights, one already up and
 * bright. The chosen tile takes the bright edge. The slider is how high it
 * pops, in world units.
 *
 * The pattern: one of many, on a grid. The hit test reads each tile's resting top, so a tile popping up cannot
 * flip the choice.
 */
const {
  Cam, fit, facing, poly, prism, proj, put, ringAt, rings, rrect, solid, mk, unproj,
  spring, stepS, reducedMotion, register, pointer, disposer,
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

const N = 3, CELL = 26, FOOT = 21, BASE = 5, STEP = 40, HIGH = 28, E = N * CELL;
// Each tile's height at rest, by column then row: a gentle swell, one tile up.
const REST = [8, 6, 5, 6, 5, 7, 5, 15, 6], LEAD = 7;

/** Tile k's glyph, a ring about its centre: a square, a bar or a small square, by turns. */
function glyph(k, cx, cy) {
  const shape = [rrect(-4.2, -4.2, 4.2, 4.2, 0.6, 4), rrect(-6.5, -2.2, 6.5, 2.2, 0.6, 4), rrect(-2.6, -2.6, 2.6, 2.6, 0.5, 4)][k % 3];
  return shape.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let lift = value, act = -1;

  // Fitted to the plinth and the far tiles at their highest.
  const C = Cam(45, 0.5, 2.1);
  fit(C, [[-5, -5, -4], [E + 5, -5, -4], [-5, E + 5, -4], [E + 5, E + 5, -4], [0, 0, HIGH], [E, 0, HIGH], [0, E, HIGH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-5, -5, E + 5, E + 5, 2.4, 2);
  put(solid(g), prism(P, front, pr, pi, -4, 0));

  const tiles = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = i * N + j, x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 1.8, 1.4);
    tiles.push({ k, i, j, ring, inner, mark: glyph(k, x0 + FOOT / 2, y0 + FOOT / 2), h: spring(REST[k], SOFT), drawn: NaN });
  }
  // Diagonal by diagonal from the far corner, so appending is painting back to front.
  for (const t of tiles.slice().sort((a, b) => a.i + a.j - (b.i + b.j))) {
    t.el = solid(g);
    t.el.sil.classList.toggle("hi", t.k === LEAD);
    t.glyph = mk("path", { class: "nf" }, t.el.g);
  }

  const loop = register(stage, (dt, now) => {
    let moving = false;
    for (const t of tiles) {
      if (step(t.h, dt, now)) moving = true;
      const h = t.h.x;
      if (h === t.drawn) continue;
      t.drawn = h;
      put(t.el, prism(P, front, t.ring, t.inner, 0, h));
      t.glyph.setAttribute("d", poly(ringAt(P, t.mark, h)));
    }
    return moving;
  });
  bag.add(loop.unregister);

  /** The tile whose resting top holds the point, the nearest if two do; -1 off the grid. */
  function hit(s) {
    let best = -1;
    for (const t of tiles) {
      const [x, y] = unproj(C, s[0], s[1], REST[t.k]);
      const inside = x > t.i * CELL && x < (t.i + 1) * CELL && y > t.j * CELL && y < (t.j + 1) * CELL;
      if (inside && (best < 0 || t.i + t.j > tiles[best].i + tiles[best].j)) best = t.k;
    }
    return best;
  }

  /** Pops tile a (-1 puts the grid back). The ripple spreads out from the tile chosen, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), f = tiles[a >= 0 ? a : act];
    act = a;
    for (const t of tiles) {
      const d = Math.hypot(t.i - f.i, t.j - f.j);
      const to = a < 0 ? REST[t.k] : t.k === a ? lift : BASE + 4 * Math.max(0, 1.5 - d) / 1.5;
      aim(t.h, to, now, d * STEP);
      t.el.sil.classList.toggle("hi", t.k === (a < 0 ? LEAD : a));
      tint(t.el, t.k, t.k === a, [t.glyph]);
    }
    read.textContent = a < 0 ? "rest" : `app ${f.i + 1}·${f.j + 1}`;
    loop.wake();
  }

  bag.add(pointer(stage, { move: (s) => { const a = hit(s); if (a >= 0) setActive(a); }, leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      lift = v;
      if (act >= 0) { aim(tiles[act].h, lift, performance.now(), 0); loop.wake(); }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "apps",
  means: "A grid of app tiles: the one under the pointer pops up and the rest ripple outwards from it.",
  rules: [1, 2, 5, 8],
  range: [10, 18, 28],
  mount,
});
