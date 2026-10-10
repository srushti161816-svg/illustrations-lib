"use client";

import { arrow, chain, each, loop, ring, rotX, rotY, rotZ, run, type Lines, type V, Wireframe } from "./wireframe";

// Figures CSS cannot animate: solids turning in 3D, and plane curves whose shape changes. Each `draw` is a pure
// function of time, so the server renders the same rest pose the client starts from.

const DEG = Math.PI / 180;

/** A latitude and longitude sphere, turning on a tilted axis. */
function sphere(t: number): Lines {
  const R = 64, lines: Lines = [];
  for (let i = 0; i < 8; i++) lines.push(loop(72, (a) => rotY((i * Math.PI) / 8)([R * Math.sin(a), R * Math.cos(a), 0])));
  for (let lat = -60; lat <= 60; lat += 20) {
    const y = R * Math.sin(lat * DEG), r = R * Math.cos(lat * DEG);
    lines.push(loop(72, (a) => [r * Math.cos(a), y, r * Math.sin(a)]));
  }
  return [...each(lines, chain(rotY(t * 0.35), rotX(0.42), rotZ(-0.22))), ring(0, 0, R, 72)];
}

/** Great circles through one pole, the pole leaning off to the left, turning about it. */
function globe(t: number): Lines {
  const R = 66, lines: Lines = [];
  for (let i = 0; i < 6; i++) lines.push(loop(72, (a) => rotY((i * Math.PI) / 6)([R * Math.sin(a), R * Math.cos(a), 0])));
  return [...each(lines, chain(rotY(t * 0.3), rotX(0.35), rotZ(0.5))), ring(0, 0, R, 72)];
}

/** A torus seen from above, its tube rings flowing around it. */
function torus(t: number): Lines {
  const R = 46, r = 20, lines: Lines = [];
  for (let i = 0; i < 28; i++) {
    const phi = (i / 28) * Math.PI * 2;
    lines.push(loop(24, (u) => [(R + r * Math.cos(u)) * Math.cos(phi), r * Math.sin(u), (R + r * Math.cos(u)) * Math.sin(phi)]));
  }
  for (let j = 0; j < 10; j++) {
    const u = (j / 10) * Math.PI * 2, rr = R + r * Math.cos(u), y = r * Math.sin(u);
    lines.push(loop(72, (phi) => [rr * Math.cos(phi), y, rr * Math.sin(phi)]));
  }
  return each(lines, chain(rotY(t * 0.4), rotX(1.0 + 0.12 * Math.sin(t * 0.5)), rotZ(0.25)));
}

/** A wormhole: a narrow throat flaring to two wide rims, its meridians sliding round. */
function wormhole(t: number): Lines {
  const H = 62, L = 70, k = 388;
  const radius = (y: number) => 9 + k / (L - Math.abs(y)) - k / L;
  const lines: Lines = [];
  for (const y of [0, 20, 36, 46, 53, 58, 62]) {
    for (const s of y ? [1, -1] : [1]) lines.push(loop(72, (a) => [radius(y) * Math.cos(a), s * y, radius(y) * Math.sin(a)]));
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    lines.push(run(48, (u) => {
      // Denser near the rims, where the surface turns fastest.
      const y = H * Math.sign(u - 0.5) * Math.abs(2 * u - 1) ** 0.6;
      return [radius(y) * Math.cos(a), y, radius(y) * Math.sin(a)];
    }));
  }
  return each(lines, chain(rotY(t * 0.3), rotX(0.32)));
}

/** A coil spring that compresses and relaxes as it turns. */
function coil(t: number): Lines {
  const R = 52, turns = 11, h = 92 + 22 * Math.sin(t * 1.3);
  const helix = run(turns * 48, (u) => {
    const a = u * turns * Math.PI * 2;
    return [R * Math.cos(a), -h / 2 + u * h, R * Math.sin(a)];
  });
  // Short leads off each end, as a spring's wire leaves it.
  const top = helix[helix.length - 1], bottom = helix[0];
  return each([[[bottom[0] - 30, bottom[1] - 12, bottom[2]], bottom], helix, [top, [top[0] - 30, top[1] + 12, top[2]]]], chain(rotY(t * 0.6), rotX(0.3)));
}

/** Five rings, each a little behind the last, turning through edge-on together, like one ring's afterimages. */
function rings(t: number): Lines {
  const R = 62;
  return Array.from({ length: 5 }, (_, i) => loop(72, (a) => chain(rotY(t * 0.5 + i * 0.13), rotZ(-0.45), rotX(0.18))([R * Math.cos(a), R * Math.sin(a), 0])));
}

/** A diagonal stack of rings with a wave travelling up it. */
function stack(t: number): Lines {
  const R = 36;
  return Array.from({ length: 6 }, (_, i) => {
    const y = (i - 2.5) * 17, x = 13 * Math.sin(t * 1.2 - i * 0.7);
    return loop(64, (a) => chain(rotX(0.5), rotZ(-0.6))([x + R * Math.cos(a), y, R * Math.sin(a)]));
  });
}

/** An hourglass of stacked rings whose waist travels up and down as a wave. */
function hourglass(t: number): Lines {
  const lines: Lines = [];
  for (let k = 0; k <= 16; k++) {
    const y = -60 + k * 7.5, r = 24 + 34 * (y / 60) ** 2 + 4 * Math.sin(t * 2 - y * 0.08);
    lines.push(loop(64, (a) => rotX(0.22)([r * Math.cos(a), y, r * Math.sin(a)])));
  }
  return lines;
}

/** A tetrahedron, with a line from each corner to its centre, turning so it passes through its face-on view. */
function tetra(t: number): Lines {
  const top: V = [0, 64, 0];
  const base = [0, 1, 2].map((i): V => [62 * Math.cos(i * 120 * DEG), -22, 62 * Math.sin(i * 120 * DEG)]);
  const centre: V = [0, (64 - 22 * 3) / 4, 0];
  const [a, b, c] = base;
  const lines: Lines = [[a, b, c, a], [top, a], [top, b], [top, c], ...[top, a, b, c].map((p) => [p, centre])];
  return each(lines, chain(rotY(t * 0.45), rotX(0.38)));
}

/** A grid on the ground plane with its three axes, turning about the vertical one. */
function plane(t: number): Lines {
  const S = 46, n = 8, lines: Lines = [];
  for (let i = 0; i <= n; i++) {
    const u = -S + (2 * S * i) / n;
    lines.push([[u, 0, -S], [u, 0, S]], [[-S, 0, u], [S, 0, u]]);
  }
  lines.push(
    ...arrow([0, 0, 0], [0, 92, 0], [1, 0, 0]),
    ...arrow([S, 0, 0], [92, 0, 0], [0, 0, 1]),
    ...arrow([0, 0, S], [0, 0, 92], [1, 0, 0]),
  );
  return each(lines, chain(rotY(t * 0.3 + Math.PI / 4), rotX(0.5)));
}

/** Eight rays and the polygon through a point on each, the points sliding along their rays. */
function radar(t: number): Lines {
  const lines: Lines = [];
  const points: V[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * 45 + 22.5) * DEG, c = Math.cos(a), s = Math.sin(a);
    lines.push(...arrow([0, 0, 0], [72 * c, 72 * s, 0], [-s, c, 0], 5));
    for (const r of [24, 48]) lines.push([[r * c - 2.5 * s, r * s + 2.5 * c, 0], [r * c + 2.5 * s, r * s - 2.5 * c, 0]]);
    const r = 36 + 20 * Math.sin(t * 0.9 + k * 1.7) * Math.cos(t * 0.35 + k);
    points.push([r * c, r * s, 0]);
  }
  lines.push([...points, points[0]], ...points.map(([x, y]) => ring(x, y, 2.2, 10)));
  return lines;
}

/** y = k / x on ticked axes, k breathing, so both branches sweep toward the axes and away. */
function hyperbola(t: number): Lines {
  const k = 300 + 180 * Math.sin(t * 0.8), M = 68, lines: Lines = [];
  lines.push(...arrow([-72, 0, 0], [76, 0, 0], [0, 1, 0], 5), ...arrow([0, -72, 0], [0, 76, 0], [1, 0, 0], 5));
  for (let u = -64; u <= 64; u += 8) {
    if (!u) continue;
    lines.push([[u, -2, 0], [u, 2, 0]], [[-2, u, 0], [2, u, 0]]);
  }
  for (const s of [1, -1]) {
    lines.push(run(60, (u) => {
      // Spaced evenly in angle, so the curve is as smooth near the axes as at its bend.
      const x = (k / M) * (M / (k / M)) ** u;
      return [s * x, (s * k) / x, 0];
    }));
  }
  return lines;
}

export const Sphere = () => <Wireframe draw={sphere} rest={1.2} label="A wireframe sphere of latitudes and longitudes, turning on a tilted axis" />;
export const Globe = () => <Wireframe draw={globe} label="Great circles meeting at a tilted pole, turning about it" dim />;
export const Torus = () => <Wireframe draw={torus} label="A wireframe torus seen from above, its rings flowing round" />;
export const Wormhole = () => <Wireframe draw={wormhole} label="A wormhole surface, a narrow throat flaring to two rims, turning" />;
export const Coil = () => <Wireframe draw={coil} label="A coil spring compressing and relaxing as it turns" />;
export const Rings = () => <Wireframe draw={rings} rest={0.6} label="Five tilted rings turning through edge-on together" dim />;
export const Stack = () => <Wireframe draw={stack} label="A diagonal stack of rings with a wave travelling through it" dim />;
export const Hourglass = () => <Wireframe draw={hourglass} label="An hourglass of stacked rings whose waist rises and falls" />;
export const Tetra = () => <Wireframe draw={tetra} rest={0.8} label="A tetrahedron with lines from its corners to its centre, turning" />;
export const Plane = () => <Wireframe draw={plane} label="A grid on the ground plane with three axes, turning" />;
export const Radar = () => <Wireframe draw={radar} rest={2} label="Eight rays and a polygon whose corners slide along them" />;
export const Hyperbola = () => <Wireframe draw={hyperbola} label="The hyperbola y equals k over x on ticked axes, k changing" />;
