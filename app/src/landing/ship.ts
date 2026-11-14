export const STRIDE = 14;
export const NOSE_Z = 5;
export const TAIL_Z = -5.5;
export const TUNNEL_END_Z = -7;
export const CENTER: Vec3 = [0, 0, -0.25];

export type Vec3 = [number, number, number];

export interface Zone {
  id: number;
  anchor: Vec3;
  samples: Vec3[];
  radius: number;
}

export const AIRLOCK = 1;
const HABITAT = 2;
const GRAVITY_RING = 3;
const ARRAYS = 4;
const SERVICE = 5;

const around = (count: number, radius: number, z: number): Vec3[] =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return [radius * Math.cos(a), radius * Math.sin(a), z];
  });

export const ZONES: Zone[] = [
  { id: AIRLOCK, anchor: [0, 0, 5], samples: [[0, 0, 5], [0, 0, 4.5], [0, 0, 4]], radius: 0.85 },
  { id: HABITAT, anchor: [0, 0, 2.2], samples: [[0, 0, 3], [0, 0, 2.4], [0, 0, 1.8], [0, 0, 1.2]], radius: 1.3 },
  { id: GRAVITY_RING, anchor: [0, 2.7, -1], samples: around(20, 2.7, -1), radius: 0.5 },
  { id: ARRAYS, anchor: [2.9, 0, -3.95], samples: [[1.8, 0, -3.95], [2.9, 0, -3.95], [4, 0, -3.95]], radius: 0.7 },
  { id: ARRAYS, anchor: [-2.9, 0, -3.95], samples: [[-1.8, 0, -3.95], [-2.9, 0, -3.95], [-4, 0, -3.95]], radius: 0.7 },
  { id: SERVICE, anchor: [0, 0, -4], samples: [[0, 0, -3.4], [0, 0, -4], [0, 0, -4.6], [0, 0, -5.2]], radius: 1 },
];

export interface Cloud {
  data: Float32Array;
  count: number;
  solid: number;
  outside: number;
  mesh: Float32Array;
}

const TAU = Math.PI * 2;
const HULL = 0;
const INTERIOR = 1;
const STAR = 2;
const HATCH = 3;
const ONE_SIDE = 0;
const TWO_SIDES = 1;
const NO_SIDE = 2;
const STEP = 0.1;
const DOT = 0.054;
const SHRINK = 0.985;
const PROFILE: [number, number][] = [
  [NOSE_Z, 0.72],
  [4.2, 0.72],
  [3.4, 1.25],
  [0.9, 1.25],
  [0.3, 0.34],
  [-2.9, 0.34],
  [-3.2, 0.9],
  [-4.7, 0.9],
  [-4.85, 0.42],
  [TAIL_Z, 0.8],
];
const RING = { z: -1, major: 2.7, minor: 0.34 };
const WING = { z0: -4.55, z1: -3.35, from: 1.3, length: 1, gap: 0.08, count: 3 };
const PETALS = 6;

interface Options {
  size?: number;
  spin?: boolean;
  accent?: 0 | 1 | 2;
  group?: number;
  side?: number;
  aux?: number;
}

function generator(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Mesh {
  out: number[] = [];

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
    this.out.push(...a, ...b, ...c, ...a, ...c, ...d);
  }

  band(z0: number, z1: number, r0: number, r1: number, parts = 40) {
    for (let j = 0; j < parts; j++) {
      const a = (j / parts) * TAU;
      const b = ((j + 1) / parts) * TAU;
      this.quad(
        [r0 * Math.cos(a), r0 * Math.sin(a), z0],
        [r0 * Math.cos(b), r0 * Math.sin(b), z0],
        [r1 * Math.cos(b), r1 * Math.sin(b), z1],
        [r1 * Math.cos(a), r1 * Math.sin(a), z1],
      );
    }
  }

  torus(zc: number, major: number, minor: number, parts = 56, rows = 12) {
    const at = (i: number, j: number): Vec3 => {
      const f = (i / rows) * TAU;
      const a = (j / parts) * TAU;
      const r = major + minor * Math.cos(f);
      return [r * Math.cos(a), r * Math.sin(a), zc + minor * Math.sin(f)];
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < parts; j++) this.quad(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j));
    }
  }
}

class Builder {
  out: number[] = [];
  zone = 0;
  random = generator(20261114);

  add(p: Vec3, n: Vec3, o: Options = {}) {
    this.out.push(
      p[0], p[1], p[2],
      n[0], n[1], n[2],
      o.size ?? DOT, this.random(), o.aux ?? 0, this.zone,
      o.spin ? 1 : 0, o.accent ?? 0, o.group ?? HULL, o.side ?? ONE_SIDE,
    );
  }

  get count() {
    return this.out.length / STRIDE;
  }
}

function shell(
  b: Builder,
  z0: number,
  z1: number,
  r0: number,
  r1: number,
  o: Options = {},
  inward = false,
  step = STEP,
  last = false,
) {
  const rows = Math.max(1, Math.round(Math.hypot(z1 - z0, r1 - r0) / (step * 0.866)));
  const slope = (r1 - r0) / (z1 - z0);
  const k = (inward ? -1 : 1) / Math.hypot(1, slope);
  const end = last ? rows : rows - 1;
  for (let i = 0; i <= end; i++) {
    const t = i / rows;
    const z = z0 + (z1 - z0) * t;
    const r = r0 + (r1 - r0) * t;
    const n = Math.max(6, Math.round((TAU * r) / step));
    const shift = (i % 2) * 0.5;
    for (let j = 0; j < n; j++) {
      const a = ((j + shift) / n) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      b.add([r * c, r * s, z], [k * c, k * s, -k * slope], o);
    }
  }
}

function disc(b: Builder, z: number, r0: number, r1: number, nz: number, o: Options = {}, step = STEP) {
  const rows = Math.max(1, Math.round((r1 - r0) / (step * 0.866)));
  for (let i = 0; i <= rows; i++) {
    const r = r0 + ((r1 - r0) * i) / rows;
    const n = r < step / 2 ? 1 : Math.max(6, Math.round((TAU * r) / step));
    const shift = (i % 2) * 0.5;
    for (let j = 0; j < n; j++) {
      const a = ((j + shift) / n) * TAU;
      b.add([r * Math.cos(a), r * Math.sin(a), z], [0, 0, nz], o);
    }
  }
}

function ring(b: Builder, z: number, r: number, n: number, normal: (a: number) => Vec3, o: (a: number) => Options) {
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU;
    b.add([r * Math.cos(a), r * Math.sin(a), z], normal(a), o(a));
  }
}

function torus(b: Builder, zc: number, major: number, minor: number, o: Options = {}) {
  const rows = Math.max(8, Math.round((TAU * minor) / STEP));
  for (let i = 0; i < rows; i++) {
    const f = (i / rows) * TAU;
    const cf = Math.cos(f);
    const sf = Math.sin(f);
    const r = major + minor * cf;
    const n = Math.round((TAU * r) / STEP);
    const shift = (i % 2) * 0.5;
    for (let j = 0; j < n; j++) {
      const a = ((j + shift) / n) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      b.add([r * c, r * s, zc + minor * sf], [cf * c, cf * s, sf], o);
    }
  }
}

function panel(b: Builder, x0: number, x1: number, z0: number, z1: number, o: Options = {}) {
  const dir = Math.sign(x1 - x0);
  const cols = Math.round(Math.abs(x1 - x0) / STEP);
  const rows = Math.round((z1 - z0) / (STEP * 0.866));
  for (let i = 0; i <= rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    const shift = (i % 2) * 0.5;
    for (let j = 0; j < cols; j++) {
      b.add([x0 + dir * (j + shift) * STEP, 0, z], [0, 1, 0], { ...o, side: TWO_SIDES });
    }
  }
}

function strut(b: Builder, from: Vec3, to: Vec3, o: Options = {}) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const n = Math.max(2, Math.round(length / (STEP * 0.8)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.add(
      [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t],
      [0, 1, 0],
      { ...o, side: NO_SIDE },
    );
  }
}

function hatch(b: Builder) {
  const radius = 0.6;
  const rows = Math.round(radius / (STEP * 0.8));
  const sector = TAU / PETALS;
  for (let i = 0; i <= rows; i++) {
    const r = (radius * i) / rows;
    const n = i === 0 ? 1 : Math.round((TAU * r) / (STEP * 0.8));
    for (let j = 0; j < n; j++) {
      const a = ((j + 0.5) / n) * TAU;
      const petal = Math.floor(a / sector);
      const edge = Math.min(a - petal * sector, (petal + 1) * sector - a);
      if (i > 0 && edge * r < 0.022) continue;
      b.add([r * Math.cos(a), r * Math.sin(a), NOSE_Z], [0, 0, 1], {
        group: HATCH,
        aux: (petal + 0.5) * sector,
        size: DOT * 0.9,
      });
    }
  }
}

function exterior(b: Builder, m: Mesh) {
  const radial = (a: number): Vec3 => [Math.cos(a), Math.sin(a), 0];

  const zones = [AIRLOCK, AIRLOCK, HABITAT, HABITAT, GRAVITY_RING, SERVICE, SERVICE, SERVICE, SERVICE];

  b.zone = AIRLOCK;
  hatch(b);
  disc(b, NOSE_Z, 0.62, 0.72, 1);
  ring(b, NOSE_Z + 0.02, 0.67, 24, () => [0, 0, 1], (a) => ({ accent: 2, aux: a, size: DOT * 1.25 }));
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [z0, r0] = PROFILE[i];
    const [z1, r1] = PROFILE[i + 1];
    b.zone = zones[i];
    shell(b, z0, z1, r0, r1, {}, false, STEP, i === PROFILE.length - 2);
    m.band(z0, z1, r0 * SHRINK, r1 * SHRINK);
  }
  b.zone = HABITAT;
  ring(b, 2.75, 1.262, 14, radial, () => ({ accent: 1, size: DOT * 1.5 }));
  ring(b, 1.55, 1.262, 14, radial, () => ({ accent: 1, size: DOT * 1.5 }));
  b.zone = SERVICE;
  ring(b, -3.95, 0.912, 10, radial, () => ({ accent: 1, size: DOT * 1.3 }));

  b.zone = GRAVITY_RING;
  torus(b, RING.z, RING.major, RING.minor, { spin: true });
  m.torus(RING.z, RING.major, RING.minor * SHRINK);
  ring(b, RING.z, RING.major + RING.minor + 0.012, 32, radial, () => ({ accent: 1, spin: true, size: DOT * 1.3 }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const offset of [-0.07, 0.07]) {
      strut(b, [0.36 * c, 0.36 * s, RING.z + offset], [2.38 * c, 2.38 * s, RING.z + offset], {
        spin: true,
        size: DOT * 0.85,
      });
    }
  }

  b.zone = ARRAYS;
  for (const dir of [-1, 1]) {
    strut(b, [dir * 0.9, 0, -3.95], [dir * WING.from, 0, -3.95], { size: DOT * 0.85 });
    for (let k = 0; k < WING.count; k++) {
      const x0 = dir * (WING.from + k * (WING.length + WING.gap));
      const x1 = x0 + dir * WING.length;
      panel(b, x0, x1, WING.z0, WING.z1);
      m.quad([x0, 0, WING.z0], [x1, 0, WING.z0], [x1, 0, WING.z1], [x0, 0, WING.z1]);
    }
  }
}

function interior(b: Builder) {
  b.zone = 0;
  const o: Options = { group: INTERIOR, size: DOT * 0.9 };
  const radius = (z: number) => (z > 4.2 ? 0.6 : z > 3.4 ? 0.6 + ((4.2 - z) / 0.8) * 0.5 : 1.1);
  let index = 0;
  for (let z = NOSE_Z - 0.1; z > TUNNEL_END_Z; z -= 0.36) {
    const r = radius(z);
    const n = Math.round((TAU * r) / 0.075);
    const lit = index % 3 === 0;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU;
      b.add([r * Math.cos(a), r * Math.sin(a), z], [-Math.cos(a), -Math.sin(a), 0], {
        ...o,
        accent: lit ? 1 : 0,
      });
    }
    index += 1;
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + TAU / 12;
    for (let z = NOSE_Z - 0.1; z > TUNNEL_END_Z; z -= 0.09) {
      const r = radius(z) * 0.985;
      b.add([r * Math.cos(a), r * Math.sin(a), z], [-Math.cos(a), -Math.sin(a), 0], {
        ...o,
        accent: 2,
        aux: -z * 2.6,
        size: DOT * 0.8,
      });
    }
  }
  disc(b, TUNNEL_END_Z, 0, 1.1, 1, { ...o, accent: 1, size: DOT * 1.1 }, 0.085);
}

function stars(b: Builder) {
  for (let i = 0; i < 2400; i++) {
    const z = b.random() * 2 - 1;
    const a = b.random() * TAU;
    const r = Math.sqrt(1 - z * z);
    const bright = Math.pow(b.random(), 3);
    b.add([r * Math.cos(a), r * Math.sin(a), z], [0, 0, 1], {
      group: STAR,
      size: 1 + bright * 1.6,
      aux: 0.25 + bright * 0.75,
    });
  }
}

export function buildCloud(): Cloud {
  const b = new Builder();
  const m = new Mesh();
  exterior(b, m);
  const solid = b.count;
  stars(b);
  const outside = b.count;
  interior(b);
  return { data: new Float32Array(b.out), count: b.count, solid, outside, mesh: new Float32Array(m.out) };
}
