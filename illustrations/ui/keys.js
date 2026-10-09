/**
 * Keys: a row of five keycaps on a low case, of different widths, each a
 * tapered cap with a dished top. The key under the pointer presses down and
 * its neighbours dip a little, staggered outwards from it, each on a soft
 * spring. At rest the first key is half pressed and bright; the key pressed
 * takes the bright edge. The slider is the travel of a full press, in world
 * units.
 *
 * The pattern: one of many, in a row. The hit test reads the plane of the keys' resting tops, so a key going down
 * cannot flip the choice.
 */
const {
  Cam, facing, fit, hull, open, poly, prism, proj, put, ringAt, rings, rrect, run, solid, mk, unproj,
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

const U = 20, GAP = 2.5, D = 20, KEY = 11, BED = 4, R = 1.2, TAPER = 2.6, CR = 1.2, DISH = 3, STEP = 40;
const WIDTHS = [1, 1, 1, 1.5, 2];
const LEAD = 0;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let travel = value, act = -1;

  // The keys, left to right: where each starts and ends along the row.
  let x = 0;
  const keys = WIDTHS.map((w, k) => { const x0 = x; x += w * U + GAP; return { k, x0, x1: x0 + w * U }; });
  const LEN = x - GAP;

  // Fitted to the case and the keys at full height.
  const C = Cam(45, 0.5, 2.2);
  fit(C, [[-6, -6, 0], [LEN + 6, -6, 0], [-6, D + 6, 0], [LEN + 6, D + 6, 0], [0, 0, BED + KEY], [LEN, 0, BED + KEY]], 200, 166);
  const P = proj(C), front = facing(C);

  // The case: a low rounded slab the keys sit in.
  const g = mk("g", {}, svg), [cs, ci] = rings(-6, -6, LEN + 6, D + 6, 2, 1.5);
  put(solid(g), prism(P, front, cs, ci, 0, BED));

  // Left to right is back to front along the row, so appending is painting back to front.
  const rest = (k) => (k === LEAD ? 0.6 * travel : 0);
  for (const key of keys) {
    // A tapered cap: its foot, its smaller top, the crease inside the top, and the dish in it.
    const t = (b) => rrect(key.x0 + TAPER + b, TAPER + b, key.x1 - TAPER - b, D - TAPER - b, Math.max(0.5, R - b * 0.3), 4);
    key.foot = rrect(key.x0, 0, key.x1, D, R, 4);
    [key.top, key.inner, key.dish] = [t(0), t(CR), t(DISH)];
    key.el = solid(g);
    key.el.sil.classList.toggle("hi", key.k === LEAD);
    key.dishEl = mk("path", { class: "nf lo" }, key.el.g);
    key.press = spring(rest(key.k), SOFT);
    key.drawn = NaN;
  }

  const loop = register(stage, (dt, now) => {
    let moving = false;
    for (const key of keys) {
      if (step(key.press, dt, now)) moving = true;
      const p = key.press.x;
      if (p === key.drawn) continue;
      key.drawn = p;
      const z1 = BED + KEY - p;
      put(key.el, {
        sil: poly(hull(ringAt(P, key.foot, BED).concat(ringAt(P, key.top, z1)))),
        crease: open(ringAt(P, run(key.inner, front), z1)),
      });
      key.dishEl.setAttribute("d", poly(ringAt(P, key.dish, z1)));
    }
    return moving;
  });
  bag.add(loop.unregister);

  /** The key whose span along the row holds the point, read on the plane of the resting tops; -1 off the row. */
  function hit(s) {
    const [px, py] = unproj(C, s[0], s[1], BED + KEY);
    if (py < -4 || py > D + 4) return -1;
    const key = keys.find((q) => px > q.x0 - GAP / 2 && px < q.x1 + GAP / 2);
    return key ? key.k : -1;
  }

  /** Presses key a (-1 lets the row back up). The dip spreads out from the key pressed, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const key of keys) {
      const d = Math.abs(key.k - from);
      const to = a < 0 ? rest(key.k) : d === 0 ? travel : d === 1 ? 0.25 * travel : 0;
      aim(key.press, to, now, d * STEP);
      key.el.sil.classList.toggle("hi", key.k === (a < 0 ? LEAD : a));
      tint(key.el, key.k, key.k === a, [key.dishEl]);
    }
    read.textContent = a < 0 ? "rest" : `key ${a + 1}`;
    loop.wake();
  }

  bag.add(pointer(stage, { move: (s) => { const a = hit(s); if (a >= 0) setActive(a); }, leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      travel = v;
      const now = performance.now();
      for (const key of keys) {
        const d = act < 0 ? -1 : Math.abs(key.k - act);
        aim(key.press, act < 0 ? rest(key.k) : d === 0 ? travel : d === 1 ? 0.25 * travel : 0, now, 0);
      }
      loop.wake();
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "keys",
  means: "A row of keycaps: the one under the pointer presses down and its neighbours dip a little.",
  rules: [1, 2, 5, 8],
  range: [3, 5, 7],
  mount,
});
