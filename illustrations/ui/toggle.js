/**
 * Toggle: a chunky switch on a card. The pointer's place along the track sets
 * where the knob is, on one spring; the knob is bright while it is on. Let go and the knob settles on the side it was nearer, so
 * the switch keeps its state. At rest it is on. The slider is the snap: how
 * hard the knob is drawn to the nearer end while it follows the pointer.
 *
 * The pattern: a continuous position. The pointer is read on the plane of the track's top, which never moves.
 */
const {
  Cam, clamp, lerp, fit, facing, prism, proj, put, rings, rrect, solid, mk, unproj,
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

const L = 92, W = 38, H = 9, R = 15, KH = 9, PAD = 4;
const X0 = PAD + R, X1 = L - PAD - R; // the knob's centre, off and on

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  mk("style", {}, svg).textContent = THEME;
  let snap = value, over = null;

  // Fitted to the card and the knob at either end.
  const C = Cam(45, 0.5, 2.3);
  fit(C, [[-14, -14, -4], [L + 14, -14, -4], [-14, W + 14, -4], [L + 14, W + 14, -4], [X0 - R, W / 2 - R, H + KH], [X1 + R, W / 2 - R, H + KH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [cr, ci] = rings(-14, -14, L + 14, W + 14, 2.4, 2);
  put(solid(g), prism(P, front, cr, ci, -4, 0));

  const [tr, ti] = rings(0, 0, L, W, 2.4, 2);
  const track = solid(g);
  put(track, prism(P, front, tr, ti, 0, H));

  const knob = solid(g);
  const kr = rrect(-R, -R, R, R, 1.6, 4), ki = rrect(-R + 1.5, -R + 1.5, R - 1.5, R - 1.5, 0.8, 4);
  const at = (ring, cx) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + W / 2 }));

  const t = spring(1, SOFT);
  let drawn = NaN;
  function draw() {
    if (t.x === drawn) return;
    drawn = t.x;
    const cx = lerp(X0, X1, t.x);
    put(knob, prism(P, front, at(kr, cx), at(ki, cx), H, H + KH));
    knob.sil.classList.toggle("hi", t.x > 0.5);
  }

  const loop = register(stage, (dt) => { const m = stepS(t, dt); draw(); return m; });
  bag.add(loop.unregister);

  function retarget() {
    if (over) {
      const raw = clamp((over[0] - X0) / (X1 - X0), 0, 1), end = raw > 0.5 ? 1 : 0;
      t.t = lerp(raw, end, snap);
      read.textContent = end ? "on" : "off";
      tint(track, 2, end === 1);
    } else {
      t.t = t.t > 0.5 ? 1 : 0;
      read.textContent = "rest";
      tint(track, 2, false);
    }
    tint(knob, 4, over !== null);
    loop.wake();
  }

  bag.add(pointer(stage, {
    move: (s) => { over = unproj(C, s[0], s[1], H); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { snap = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "toggle",
  means: "A switch whose knob follows the pointer along its track and settles on the nearer side when let go.",
  rules: [1, 3, 5, 8],
  range: [0, 0.5, 0.9],
  mount,
});
