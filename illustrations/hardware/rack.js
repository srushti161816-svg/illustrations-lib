/**
 * Rack: a server cabinet on a low base, six blades high, with a dot grille on
 * its roof. Each blade's front carries vent slats, a dot grille and a status
 * light. The pointer's height on the cabinet's front sets where it reaches in,
 * and each blade slides out by its distance from there, on its own spring, so
 * the blades near the hand come furthest. The blade nearest the pointer is
 * bright. At rest a few blades stand part way out. The slider is the reach,
 * in blades.
 *
 * The pattern: a continuous field, in one column. The pointer is read on the
 * plane of the cabinet's front, which never moves. A blade is drawn only for
 * the part of it that stands out of the cabinet, so nothing inside shows.
 */
const {
  Cam, clamp, facing, fit, flatDot, mk, place, pointer, prism, proj, put, rings, seg, solid,
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

const CW = 64, CD = 40, N = 6, BH = 9, FOOT = 4, OUT = 26;
const CH = FOOT + N * BH + 4;
const REST = [2, 9, 4, 0, 13, 3], LEAD = 4;

/** The share of the full slide at u reaches from the pointer: 1 → .31 at 42% → .09 at the edge and beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let reach = value * BH, over = null, act = -1;

  const C = Cam(45, 0.5, 2);
  fit(C, [[-8, -8, -3], [CW + 8, -8, -3], [-8, CD + OUT + 8, -3], [CW + 8, CD + OUT + 8, -3], [0, 0, CH], [CW, 0, CH]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The base and the cabinet, then the grille on its roof.
  const [br, bi] = rings(-8, -8, CW + 8, CD + OUT + 8, 2, 1.5);
  put(solid(g), prism(P, front, br, bi, -3, 0));
  const [cr, ci] = rings(0, 0, CW, CD, 1.6, 1.2);
  put(solid(g), prism(P, front, cr, ci, 0, CH));
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) place(flatDot(g, C, 0.55, "dot off"), P(14 + i * 4.4, 10 + j * 4.4, CH));

  // The blades, lowest first, since a higher blade standing out covers the one under it.
  const blades = [];
  for (let k = 0; k < N; k++) {
    const z0 = FOOT + k * BH, z1 = z0 + BH - 1.6, el = solid(g);
    const marks = mk("path", { class: "nf lo" }, el.g), grille = [];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) grille.push(mk("circle", { r: 0.55, class: "dot off" }, el.g));
    const led = mk("circle", { r: 1, class: k === LEAD ? "dot" : "dot off" }, el.g);
    el.sil.classList.toggle("hi", k === LEAD);
    blades.push({ k, z0, z1, el, marks, grille, led, sp: spring(REST[k], { ...SOFT, eps: 0.04 }), drawn: NaN });
  }

  function drawBlade(b) {
    const s = Math.max(0.8, b.sp.x);
    if (s === b.drawn) return;
    b.drawn = s;
    const yf = CD + s, [ring, inner] = rings(3, CD - 0.4, CW - 3, yf, 0.9, 0.6);
    put(b.el, prism(P, front, ring, inner, b.z0, b.z1));
    let d = "";
    for (let x = 7; x <= 23; x += 2.2) d += seg(P(x, yf, b.z0 + 1.8), P(x, yf, b.z1 - 1.8));
    b.marks.setAttribute("d", d);
    b.grille.forEach((el, n) => place(el, P(32 + (n >> 1) * 2.6, yf, b.z0 + 2.4 + (n & 1) * 2.6)));
    place(b.led, P(CW - 9, yf, (b.z0 + b.z1) / 2));
  }

  const loop = register(stage, (dt) => {
    let m = false;
    for (const b of blades) { if (stepS(b.sp, dt)) m = true; drawBlade(b); }
    return m;
  });
  bag.add(loop.unregister);

  // The pointer's height on the cabinet's front, the plane y = CD, read along the camera's own z.
  const o = P(0, CD, 0), ex = P(1, CD, 0), ez = P(0, CD, 1);
  const ax = [ex[0] - o[0], ex[1] - o[1]], az = [ez[0] - o[0], ez[1] - o[1]], det = ax[0] * az[1] - ax[1] * az[0];
  const height = (p) => (ax[0] * (p[1] - o[1]) - ax[1] * (p[0] - o[0])) / det;

  function retarget() {
    let a = -1;
    if (over === null) for (const b of blades) b.sp.t = REST[b.k];
    else {
      a = clamp(Math.floor((over - FOOT) / BH), 0, N - 1);
      // Less the falloff's floor, so blades out of reach go back flush.
      for (const b of blades) b.sp.t = (OUT * (falloff(Math.abs((b.z0 + b.z1) / 2 - over) / reach) - 0.094)) / 0.906;
    }
    if (a !== act) {
      act = a;
      for (const b of blades) {
        const on = b.k === (a < 0 ? LEAD : a);
        b.el.sil.classList.toggle("hi", on);
        tint(b.el, b.k, b.k === a, [b.marks], b.grille);
        b.led.setAttribute("class", on ? "dot" : "dot off");
      }
    }
    read.textContent = a < 0 ? "rest" : `blade ${a + 1}`;
    loop.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = height(p); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v * BH; if (over !== null) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "rack",
  means: "A server cabinet whose blades slide out near the pointer, furthest where the hand is and less with distance.",
  rules: [1, 3, 5, 6],
  range: [1, 1.6, 2.6],
  mount,
});
