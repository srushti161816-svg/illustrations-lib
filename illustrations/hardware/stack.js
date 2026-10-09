/**
 * Stack: four tiers held over a bank of server racks on a gridded floor, with
 * a tall wall standing behind them. Each tier is numbered by dots on its front
 * and split into three bays on top. The tier under the pointer slides out
 * like a drawer and its neighbours follow a little, staggered outwards from
 * it, each on a soft spring. At rest one tier is part way out and bright.
 * The slider is how far a tier slides, in world units.
 *
 * The pattern: one of many, stacked. Higher tiers are painted after lower
 * ones, since from above a higher tier covers the one under it. The hit test
 * reads each tier's resting top, the highest first.
 */
const {
  Cam, fit, facing, mk, place, pointer, prism, proj, put, rings, seg, solid, unproj,
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

const TX = 70, TY = 46, TT = 5, Z0 = 26, DZ = 14, N = 4, STEP = 45, FAR = 28, WALL = 84;
const FX0 = -14, FX1 = 86, FY0 = -26, FY1 = 66;
const REST = [3, 0, 11, 2], LEAD = 2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let slide = value, act = -1;

  // Fitted to the floor, the wall's top, and the top tier all the way out.
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[FX0, FY0, -3], [FX1, FY0, -3], [FX0, FY1, -3], [FX1, FY1, -3], [0, -20, WALL], [TX, -20, WALL], [0, TY + FAR, Z0 + 3 * DZ + TT]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The floor and its grid.
  const [fr, fi] = rings(FX0, FY0, FX1, FY1, 2, 1.5);
  put(solid(g), prism(P, front, fr, fi, -3, 0));
  let grid = "";
  for (let x = FX0 + 10; x < FX1; x += 10) grid += seg(P(x, FY0 + 3, 0), P(x, FY1 - 3, 0));
  for (let y = FY0 + 10; y < FY1; y += 10) grid += seg(P(FX0 + 3, y, 0), P(FX1 - 3, y, 0));
  mk("path", { d: grid, class: "nf lo" }, g);

  // The wall behind, then the racks, left to right, with slats on their fronts.
  const [wr, wi] = rings(0, -20, TX, -10, 1.4, 1);
  put(solid(g), prism(P, front, wr, wi, 0, WALL));
  let slats = "";
  for (let i = 0; i < 8; i++) {
    const x0 = 2 + i * 8.5, [rr, ri] = rings(x0, 8, x0 + 7, 38, 0.9, 0.6);
    put(solid(g), prism(P, front, rr, ri, 0, Z0 - 8));
    for (let z = 3; z <= Z0 - 11; z += 2.4) slats += seg(P(x0 + 1.6, 38, z), P(x0 + 5.4, 38, z));
  }
  mk("path", { d: slats, class: "nf lo" }, g);

  // The tiers, lowest first.
  const tiers = [];
  for (let k = 0; k < N; k++) {
    const el = solid(g), bays = mk("path", { class: "nf lo" }, el.g), dots = [];
    for (let i = 0; i <= k; i++) dots.push(mk("circle", { r: 0.9, class: "dot m" }, el.g));
    el.sil.classList.toggle("hi", k === LEAD);
    tiers.push({ k, el, bays, dots, z: Z0 + k * DZ, s: spring(REST[k], SOFT), drawn: NaN });
  }

  const loop = register(stage, (dt, now) => {
    let moving = false;
    for (const t of tiers) {
      if (step(t.s, dt, now)) moving = true;
      const s = t.s.x;
      if (s === t.drawn) continue;
      t.drawn = s;
      const [ring, inner] = rings(0, s, TX, s + TY, 1.4, 1);
      put(t.el, prism(P, front, ring, inner, t.z, t.z + TT));
      const top = t.z + TT;
      t.bays.setAttribute("d", [TX / 3, (2 * TX) / 3].map((x) => seg(P(x, s + 4, top), P(x, s + TY - 4, top))).join(""));
      t.dots.forEach((el, i) => place(el, P(6 + i * 3.4, s + TY, t.z + TT / 2)));
    }
    return moving;
  });
  bag.add(loop.unregister);

  /** The highest tier whose resting top, or the front just under it, holds the point; -1 off the stack. */
  function hit(p) {
    for (let k = N - 1; k >= 0; k--) {
      const [x, y] = unproj(C, p[0], p[1], Z0 + k * DZ + TT);
      if (x > 0 && x < TX && y > REST[k] && y < REST[k] + TY + 12) return k;
    }
    return -1;
  }

  /** Slides tier a out (-1 puts the stack back). The stagger spreads out from the tier chosen, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const t of tiers) {
      const d = Math.abs(t.k - from);
      aim(t.s, a < 0 ? REST[t.k] : d === 0 ? slide : d === 1 ? 0.2 * slide : 0, now, d * STEP);
      t.el.sil.classList.toggle("hi", t.k === (a < 0 ? LEAD : a));
      tint(t.el, t.k, t.k === a, [t.bays], t.dots);
    }
    read.textContent = a < 0 ? "rest" : `tier ${a + 1}`;
    loop.wake();
  }

  bag.add(pointer(stage, { move: (p) => { const a = hit(p); if (a >= 0) setActive(a); }, leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      slide = v;
      if (act >= 0) { aim(tiers[act].s, slide, performance.now(), 0); loop.wake(); }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stack",
  means: "Four tiers over a bank of racks: the tier under the pointer slides out like a drawer, its neighbours a little.",
  rules: [1, 2, 5, 6],
  range: [10, 18, 28],
  mount,
});
