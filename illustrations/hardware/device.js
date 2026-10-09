/**
 * Device: a small square box drawn exploded, in four layers: a base with
 * heatsink fins, vent slats and two ports; a board with a processor, two
 * memory sticks, a pin header and the traces between them; a cooler plate
 * with a fan; and a lid with a dot grille, a status light and a small mark.
 * Dashed drops run between the layers from four pins inside the corners. The
 * pointer's x scrubs the gap on one spring, closed to the left and wide to the
 * right, and the fan turns as the layers part; its y picks a layer, which
 * takes the bright edge and opens a little more room above and below it. The
 * slider is the widest gap, in world units.
 *
 * The pattern: scrub and pick. The pick reads the springs' targets, never the
 * pose on screen.
 */
const {
  Cam, circ, clamp, facing, fit, flatDot, mk, open, place, pointer, poly, prism, proj, put, ringAt, rings, rrect, seg, solid,
  spring, stepS, reducedMotion, register, disposer,
} = HL;

// Pastels: a chosen layer fills with its own, and its lines and dots deepen to its ink, so they keep reading
// on the colour; the parts sitting on it go a shade deeper still. All of it is given up when let go.
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
const PASTEL = tone("p"), INK = tone("i"), DEEP = tone("d");
const EASE = "cubic-bezier(.32, .72, 0, 1)";
const fade = (on) => (reducedMotion() ? "none" : `fill ${on ? 220 : 160}ms ${EASE}, stroke ${on ? 220 : 160}ms ${EASE}`);
function tint(el, k, on, lines = [], dots = [], deep = false) {
  el.sil.style.transition = fade(on);
  el.sil.style.fill = on ? (deep ? DEEP : PASTEL)[k] : "";
  for (const l of [el.cr, ...lines, ...(deep ? [el.sil] : [])]) { l.style.transition = fade(on); l.style.stroke = on ? INK[k] : ""; }
  for (const d of dots) { d.style.transition = fade(on); d.style.fill = on ? INK[k] : ""; }
}

// A soft, critically damped spring: it takes up a new target from wherever it is, and never overshoots.
const SOFT = { k: 110, c: 21, eps: 0.02 };

const W = 84, R = 2.5, WIDE = 52, CALM = 0.75, POP = 6, C0 = W / 2;
const HS = [12, 2.5, 3, 8]; // each layer's height: base, board, cooler, lid
const NAMES = ["base", "board", "cooler", "lid"], LEAD = 1;
const PINS = [[13, 13], [W - 13, 13], [13, W - 13], [W - 13, W - 13]];
// The board's parts: footprint, then height.
const CHIPS = [[14, 11, 48, 17, 4], [30, 30, 52, 52, 3.5], [58, 18, 64, 54, 2.5], [67, 18, 73, 54, 2.5], [14, 58, 27, 71, 2], [32, 61, 42, 71, 1.6]];
const TRACES = [[[52, 36], [58, 36]], [[52, 46], [58, 46]], [[30, 44], [20, 44], [20, 58]], [[41, 52], [41, 57], [37, 61]], [[38, 30], [38, 17]]];

/** The bottom of each layer at gap g, with ex[i] the extra room in the gap above layer i. */
function floors(g, ex) {
  const f = [0];
  for (let k = 1; k < HS.length; k++) f.push(f[k - 1] + HS[k - 1] + g + ex[k - 1]);
  return f;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let wide = value, over = null, act = -1;

  // Fitted to the box at its widest, with one layer's room opened.
  const C = Cam(45, 0.5, 1.25), z9 = floors(WIDE, [POP, POP, 0])[3] + HS[3];
  fit(C, [[0, 0, 0], [W, 0, 0], [0, W, 0], [W, W, 0], [0, 0, z9], [W, 0, z9], [0, W, z9]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const at = (ring, cx, cy) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));
  const path = (cls) => mk("path", { class: cls }, g);

  // The base never moves: fins on its floor, slats and ports on its two near sides.
  const [br, bi] = rings(0, 0, W, W, R, 1.5);
  const base = solid(g);
  put(base, prism(P, front, br, bi, 0, HS[0]));
  let d = "";
  for (let y = 16; y <= W - 16; y += 3.6) d += seg(P(16, y, HS[0]), P(W - 16, y, HS[0]));
  for (const x0 of [14, 50]) for (let x = x0; x <= x0 + 18; x += 2.4) d += seg(P(x, W, 3), P(x, W, HS[0] - 3));
  for (let y = 50; y <= 70; y += 2.4) d += seg(P(W, y, 3), P(W, y, HS[0] - 3));
  const baseLines = [path("nf lo"), path("nf")];
  baseLines[0].setAttribute("d", d);
  baseLines[1].setAttribute("d", [[16, 27], [31, 38]].map(([y0, y1]) => poly(rrect(y0, 3.5, y1, 8.5, 1.4, 3).map((q) => P(W, q.u, q.v)))).join(""));

  // Then, up the stack: the guides below each layer before the layer, so it covers their ends.
  const guides = [path("dash nf"), null, null];
  const [pr, pi] = rings(5, 5, W - 5, W - 5, 1.6, 1);
  const board = solid(g), traces = path("nf lo"), pins = PINS.map(() => flatDot(g, C, 0.7, "dot off"));
  const chips = CHIPS.map(([x0, y0, x1, y1, h]) => {
    const [ring, inner] = rings(x0, y0, x1, y1, 0.8, 0.5);
    return { ring, inner, h, el: solid(g) };
  });
  const header = Array.from({ length: 12 }, () => flatDot(g, C, 0.45, "dot off"));
  guides[1] = path("dash nf");
  const [cr, ci] = rings(9, 9, W - 9, W - 9, 2, 1.2);
  const cooler = solid(g), shroud = path("nf"), blades = path("nf lo");
  guides[2] = path("dash nf");
  const lid = solid(g), panel = path("nf lo"), mark = path("nf lo");
  const led = flatDot(g, C, 0.9, "dot m"), grille = [];
  for (let i = 0; i < 11; i++) for (let j = 0; j < 4; j++) grille.push([20 + i * 4.4, 15 + j * 4, flatDot(g, C, 0.55, "dot off")]);

  const layers = [base, board, cooler, lid];
  const lines = [baseLines, [traces], [shroud, blades], [panel, mark]], dots = [[], [...pins, ...header], [], grille.map((q) => q[2])];
  layers.forEach((el, k) => el.sil.classList.toggle("hi", k === LEAD));

  const gap = spring(CALM * wide, SOFT), ex = [0, 0, 0].map(() => spring(0, SOFT));
  let drawn = "";
  function draw() {
    const key = [gap.x, ...ex.map((s) => s.x)].join();
    if (key === drawn) return;
    drawn = key;
    const f = floors(gap.x, ex.map((s) => s.x)), tops = f.map((z, k) => z + HS[k]);
    for (let k = 0; k < 3; k++) guides[k].setAttribute("d", PINS.map(([x, y]) => seg(P(x, y, tops[k]), P(x, y, f[k + 1]))).join(""));

    put(board, prism(P, front, pr, pi, f[1], tops[1]));
    traces.setAttribute("d", TRACES.map((pts) => open(pts.map(([x, y]) => P(x, y, tops[1])))).join(""));
    pins.forEach((el, k) => place(el, P(PINS[k][0], PINS[k][1], tops[1])));
    for (const c of chips) put(c.el, prism(P, front, c.ring, c.inner, tops[1], tops[1] + c.h));
    header.forEach((el, k) => place(el, P(16.5 + k * 2.7, 14, tops[1] + CHIPS[0][4])));

    // The fan turns with the gap: opening the box spins it forward, closing it spins it back.
    put(cooler, prism(P, front, cr, ci, f[2], tops[2]));
    const turn = gap.x * 0.09;
    shroud.setAttribute("d", [23, 5].map((r) => poly(ringAt(P, at(circ(r, 36), C0, C0), tops[2]))).join(""));
    let bd = poly(ringAt(P, at(circ(21.5, 36), C0, C0), tops[2]));
    for (let i = 0; i < 7; i++) {
      const a0 = turn + (i * 2 * Math.PI) / 7;
      bd += open([0, 1, 2, 3, 4].map((s) => {
        const r = 6 + s * 3.6, a = a0 + s * 0.16;
        return P(C0 + r * Math.cos(a), C0 + r * Math.sin(a), tops[2]);
      }));
    }
    blades.setAttribute("d", bd);

    put(lid, prism(P, front, br, bi, f[3], tops[3]));
    panel.setAttribute("d", poly(ringAt(P, rrect(8, 8, W - 8, W - 8, 1.5, 4), tops[3])));
    mark.setAttribute("d", [8, 3.5].map((r) => poly(ringAt(P, rrect(C0 - r, 58 - r, C0 + r, 58 + r, 0.8, 3), tops[3]))).join(""));
    place(led, P(W - 13, W - 20, tops[3]));
    for (const [x, y, el] of grille) place(el, P(x, y, tops[3]));
  }

  const loop = register(stage, (dt) => {
    let m = stepS(gap, dt);
    for (const s of ex) if (stepS(s, dt)) m = true;
    draw();
    return m;
  });
  bag.add(loop.unregister);

  /** The layer whose middle, in the pose the springs are heading for, is nearest the pointer's height on screen. */
  function pick(s) {
    const f = floors(gap.t, ex.map((e) => e.t));
    let best = 0, near = Infinity;
    f.forEach((z, k) => {
      const dist = Math.abs(s[1] - P(C0, C0, z + HS[k] / 2)[1]);
      if (dist < near) { near = dist; best = k; }
    });
    return best;
  }

  function retarget() {
    gap.t = over ? wide * clamp((over[0] - 90) / 220, 0, 1) : CALM * wide;
    const a = over ? pick(over) : -1;
    if (a !== act) {
      act = a;
      // Room opens in the gaps either side of the layer chosen.
      ex.forEach((s, i) => { s.t = a >= 0 && (i === a - 1 || i === a) ? POP : 0; });
      layers.forEach((el, k) => { el.sil.classList.toggle("hi", k === (a < 0 ? LEAD : a)); tint(el, k, k === a, lines[k], dots[k]); });
      for (const c of chips) tint(c.el, 1, a === 1, [], [], true);
      led.setAttribute("class", a === 3 ? "dot" : "dot m");
    }
    read.textContent = a < 0 ? "rest" : NAMES[a];
    loop.wake();
  }

  bag.add(pointer(stage, {
    move: (s) => { over = s; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { wide = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "device",
  means: "A small device drawn exploded: sweep right to open its base, board, cooler and lid apart; up and down picks a layer.",
  rules: [3, 5, 6, 9],
  range: [26, 40, 52],
  mount,
});
