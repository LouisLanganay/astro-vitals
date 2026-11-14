import type { Sex } from '../../lib/figure.svelte';
import type { BodyRegion } from '../../lib/types';

export type Side = 'front' | 'back';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RegionGeo {
  shades: string[];
  edge: string;
  hit: string;
  parts: Box[];
  top: number;
}

export type Figure = Partial<Record<BodyRegion, RegionGeo>>;

export interface Pin {
  side: Side;
  x: number;
  y: number;
  row: number;
}

export const FIG_W = 180;
export const FIG_H = 452;
export const PITCH = 4;
export const SHADES = 6;
export const SHADE_WIDTH = Array.from(
  { length: SHADES },
  (_, k) => +(PITCH * (0.4 + (0.38 * k) / (SHADES - 1))).toFixed(2),
);
export const EDGE_WIDTH = +(PITCH * 0.8).toFixed(2);
export const HIT_WIDTH = +(PITCH * 1.3).toFixed(2);
export const FLOOR_Y = 440;

export const ORDER: BodyRegion[] = [
  'head',
  'eyes',
  'neck',
  'chest',
  'abdomen',
  'back',
  'arms',
  'hands',
  'legs',
  'feet',
];

const CX = FIG_W / 2;
const ROW = PITCH * 0.866;
const Y0 = 5.4;
const SPLIT: BodyRegion[] = ['arms', 'hands', 'legs', 'feet'];

interface Bone {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r1: number;
  r2: number;
  bulge: number;
  skew: number;
}

const bone = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r1: number,
  r2: number,
  bulge = 0,
  skew = 1,
): Bone => ({ ax, ay, bx, by, r1, r2, bulge, skew });

interface Bump {
  a: number;
  cu: number;
  cy: number;
  su: number;
  sy: number;
}

interface Groove {
  a: number;
  w: number;
  from: number;
  to: number;
}

interface Shape {
  crown: { cy: number; r: number; z: number };
  skull: { cy: number; rx: number; ry: number; z: number };
  eyes: Bone;
  neck: Bone;
  upperArm: Bone;
  forearm: Bone;
  hand: Bone;
  thumb: Bone;
  thigh: Bone;
  thighZ: Bone;
  calf: Bone;
  foot: Record<Side, Bone>;
  torso: [number, number][];
  torsoTop: number;
  torsoEnd: number;
  relief: Record<Side, { bumps: Bump[]; groove: Groove }>;
  waist: { y: number; dy: number; w: number };
  pin: Record<BodyRegion, Pin>;
}

const MALE: Shape = {
  crown: { cy: 30, r: 20, z: 0.85 },
  skull: { cy: 42, rx: 15.5, ry: 22, z: 16 },
  eyes: bone(0, 36.5, 9.6, 37, 4.9, 4.9),
  neck: bone(0, 58, 0, 86, 13, 13.5),
  upperArm: bone(48, 99.5, 60, 168, 10, 9.4, 2.6, 0.45),
  forearm: bone(60, 168, 69, 232, 9.6, 6.6, 1.6, 0.6),
  hand: bone(69, 232, 73.5, 271, 6.4, 5.8, 2.5),
  thumb: bone(64.5, 243, 61.5, 258, 3.4, 2.8),
  thigh: bone(20, 230, 22.5, 322, 18.6, 13, 1.2),
  thighZ: bone(19.4, 204, 22.5, 322, 17.6, 13, 1.6),
  calf: bone(22.5, 322, 21, 420, 13, 7.8, 2.8, 0.55),
  foot: {
    front: bone(20.5, 430, 30, 437.5, 8.2, 9.2),
    back: bone(21, 430, 23.5, 437.5, 8.8, 9),
  },
  torso: [
    [72, 13],
    [78, 26],
    [84, 38.5],
    [89, 45],
    [98, 42.5],
    [110, 42],
    [126, 40.5],
    [146, 36],
    [168, 32.5],
    [190, 34],
    [212, 38],
    [236, 38],
  ],
  torsoTop: 72,
  torsoEnd: 236,
  relief: {
    front: {
      bumps: [
        { a: 3.4, cu: 20, cy: 108, su: 15, sy: 12 },
        { a: 1.2, cu: 13, cy: 176, su: 10, sy: 28 },
      ],
      groove: { a: 0.8, w: 3.2, from: 92, to: 196 },
    },
    back: {
      bumps: [
        { a: 2.8, cu: 23, cy: 110, su: 12, sy: 15 },
        { a: 2.6, cu: 19, cy: 222, su: 14, sy: 12 },
      ],
      groove: { a: 1.5, w: 3.4, from: 80, to: 210 },
    },
  },
  waist: { y: 144, dy: 14, w: 36 },
  pin: {
    head: { side: 'front', x: 76, y: 22, row: 24 },
    eyes: { side: 'front', x: 79, y: 37, row: 76 },
    chest: { side: 'front', x: 68, y: 114, row: 128 },
    abdomen: { side: 'front', x: 72, y: 190, row: 190 },
    neck: { side: 'back', x: 99, y: 72, row: 56 },
    arms: { side: 'back', x: 144, y: 132, row: 108 },
    back: { side: 'back', x: 110, y: 160, row: 160 },
    hands: { side: 'back', x: 160, y: 254, row: 254 },
    legs: { side: 'front', x: 64, y: 330, row: 330 },
    feet: { side: 'back', x: 116, y: 434, row: 424 },
  },
};

const FEMALE: Shape = {
  crown: { cy: 30.5, r: 18.6, z: 0.85 },
  skull: { cy: 41, rx: 13.6, ry: 20.5, z: 15 },
  eyes: bone(0, 37, 8.8, 37.4, 4.6, 4.6),
  neck: bone(0, 57, 0, 86, 10, 11),
  upperArm: bone(38.5, 102, 50, 166, 8.6, 7.4, 1.6, 0.45),
  forearm: bone(50.5, 166, 60.5, 228, 7.4, 5.2, 1.2, 0.6),
  hand: bone(60.5, 228, 64.5, 263, 5.4, 4.8, 2),
  thumb: bone(56.5, 238, 54, 251, 2.8, 2.3),
  thigh: bone(21.5, 228, 20, 320, 20.5, 11.6, 1.6),
  thighZ: bone(21, 204, 20, 320, 19.5, 11.6, 1.8),
  calf: bone(20, 320, 18.5, 418, 11.4, 6.4, 2.6, 0.55),
  foot: {
    front: bone(18, 429, 26, 437, 6.8, 7.8),
    back: bone(18.5, 429, 20.5, 437, 7.2, 7.6),
  },
  torso: [
    [72, 10.5],
    [78, 17.5],
    [84, 27],
    [90, 34],
    [97, 39],
    [106, 37],
    [116, 36],
    [124, 35],
    [140, 31],
    [160, 27.5],
    [180, 31],
    [200, 37.5],
    [218, 41.5],
    [236, 41],
  ],
  torsoTop: 72,
  torsoEnd: 236,
  relief: {
    front: {
      bumps: [
        { a: 4.2, cu: 16.5, cy: 121, su: 11, sy: 12 },
        { a: 0.8, cu: 12, cy: 182, su: 10, sy: 24 },
      ],
      groove: { a: 0.5, w: 3, from: 130, to: 196 },
    },
    back: {
      bumps: [
        { a: 2.2, cu: 20, cy: 112, su: 11, sy: 14 },
        { a: 3.4, cu: 20, cy: 226, su: 16, sy: 14 },
      ],
      groove: { a: 1.3, w: 3.2, from: 80, to: 206 },
    },
  },
  waist: { y: 150, dy: 10, w: 34 },
  pin: {
    head: { side: 'front', x: 77, y: 22, row: 24 },
    eyes: { side: 'front', x: 80, y: 37, row: 76 },
    chest: { side: 'front', x: 72, y: 122, row: 128 },
    abdomen: { side: 'front', x: 74, y: 186, row: 190 },
    neck: { side: 'back', x: 98, y: 72, row: 56 },
    arms: { side: 'back', x: 137, y: 132, row: 108 },
    back: { side: 'back', x: 108, y: 160, row: 160 },
    hands: { side: 'back', x: 153, y: 250, row: 254 },
    legs: { side: 'front', x: 66, y: 330, row: 330 },
    feet: { side: 'back', x: 111, y: 433, row: 424 },
  },
};

const SHAPES: Record<Sex, Shape> = { male: MALE, female: FEMALE };

export const PIN: Record<Sex, Record<BodyRegion, Pin>> = { male: MALE.pin, female: FEMALE.pin };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function boneAt(b: Bone, u: number, y: number): [number, number] {
  const dx = b.bx - b.ax;
  const dy = b.by - b.ay;
  const len = dx * dx + dy * dy;
  const t = len ? clamp(((u - b.ax) * dx + (y - b.ay) * dy) / len, 0, 1) : 0;
  const r = b.r1 + (b.r2 - b.r1) * t + b.bulge * Math.sin(Math.PI * t ** b.skew);
  return [Math.hypot(u - b.ax - t * dx, y - b.ay - t * dy), r];
}

function boneD(b: Bone, u: number, y: number): number {
  const [dist, r] = boneAt(b, u, y);
  return dist - r;
}

function boneZ(b: Bone, u: number, y: number): number {
  const [dist, r] = boneAt(b, u, y);
  return dist < r ? Math.sqrt(r * r - dist * dist) : 0;
}

function profile(pts: [number, number][], y: number): number {
  const n = pts.length;
  if (y <= pts[0][0]) return pts[0][1];
  if (y >= pts[n - 1][0]) return pts[n - 1][1];
  let i = 0;
  while (pts[i + 1][0] < y) i++;
  const slope = (k: number) => {
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(n - 1, k + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const h = pts[i + 1][0] - pts[i][0];
  const t = (y - pts[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * pts[i][1] +
    (t3 - 2 * t2 + t) * h * slope(i) +
    (3 * t2 - 2 * t3) * pts[i + 1][1] +
    (t3 - t2) * h * slope(i + 1)
  );
}

const torsoD = (s: Shape, u: number, y: number) =>
  Math.max(u - profile(s.torso, y), s.torsoTop - y, y - s.torsoEnd);

const skullK = (s: Shape, u: number, y: number) =>
  Math.hypot(u / s.skull.rx, (y - s.skull.cy) / s.skull.ry);

const headD = (s: Shape, u: number, y: number) =>
  smin(Math.hypot(u, y - s.crown.cy) - s.crown.r, (skullK(s, u, y) - 1) * s.skull.rx, 5);

interface Fields {
  head: number;
  neck: number;
  torso: number;
  arms: number;
  hands: number;
  legs: number;
  feet: number;
}

function fields(s: Shape, u: number, y: number, side: Side): Fields {
  return {
    head: headD(s, u, y),
    neck: boneD(s.neck, u, y),
    torso: torsoD(s, u, y),
    arms: smin(boneD(s.upperArm, u, y), boneD(s.forearm, u, y), 3),
    hands: smin(boneD(s.hand, u, y), boneD(s.thumb, u, y), 2),
    legs: smin(boneD(s.thigh, u, y), boneD(s.calf, u, y), 4),
    feet: boneD(s.foot[side], u, y),
  };
}

function bodyD(f: Fields): number {
  const core = smin(smin(f.head, f.neck, 4), f.torso, 7);
  const upper = smin(core, smin(f.arms, f.hands, 2.5), 5);
  return smin(upper, smin(f.legs, f.feet, 3), 5);
}

function regionOf(s: Shape, f: Fields, u: number, y: number, side: Side): BodyRegion {
  if (f.head < 0) return side === 'front' && boneD(s.eyes, u, y) < 0 ? 'eyes' : 'head';
  let best: keyof Fields = 'head';
  for (const k of ['neck', 'torso', 'arms', 'hands', 'legs', 'feet'] as const) {
    if (f[k] < f[best]) best = k;
  }
  if (best !== 'torso') return best;
  if (side === 'back') return 'back';
  return y < s.waist.y + s.waist.dy * (u / s.waist.w) ** 2 ? 'chest' : 'abdomen';
}

const bump = (u: number, y: number, b: Bump) =>
  b.a * Math.exp(-(((u - b.cu) / b.su) ** 2) - ((y - b.cy) / b.sy) ** 2);

const span = (y: number, a: number, b: number, soft: number) =>
  clamp((y - a) / soft, 0, 1) * clamp((b - y) / soft, 0, 1);

function relief(s: Shape, u: number, y: number, side: Side): number {
  const { bumps, groove } = s.relief[side];
  const cut = groove.a * Math.exp(-((u / groove.w) ** 2)) * span(y, groove.from, groove.to, 16);
  return bumps.reduce((sum, b) => sum + bump(u, y, b), -cut);
}

const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

const ease = (y: number, a: number, b: number) => {
  const t = clamp((y - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function height(s: Shape, x: number, y: number, side: Side): number {
  const u = Math.abs(x - CX);
  const f = fields(s, u, y, side);
  const rim = clamp(-bodyD(f), 0, 4);
  let z = Math.sqrt(rim * (8 - rim));
  const k = skullK(s, u, y);
  if (k < 1) z = smax(z, s.skull.z * Math.sqrt(1 - k * k), 3);
  const c = Math.hypot(u, y - s.crown.cy);
  if (c < s.crown.r) z = smax(z, s.crown.z * Math.sqrt(s.crown.r ** 2 - c * c), 3);
  const cap = 30;
  const t = clamp(profile(s.torso, y) - u, 0, cap);
  if (t > 0) {
    const ends = ease(y, 62, 84) * (1 - ease(y, s.torsoEnd - 14, s.torsoEnd + 18));
    const slab = 0.5 * Math.sqrt(t * (2 * cap - t)) + relief(s, u, y, side) * clamp(t / 8, 0, 1);
    z = smax(z, slab * ends, 5);
  }
  for (const b of [s.neck, s.upperArm, s.forearm, s.hand, s.thumb, s.thighZ, s.calf, s.foot[side]]) {
    z = smax(z, 0.85 * boneZ(b, u, y), 5);
  }
  return z;
}

const norm = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const KEY = norm([-0.58, -0.52, 0.62]);
const RIM = norm([0.85, -0.25, 0.46]);

function shade(s: Shape, x: number, y: number, side: Side): number {
  const e = 0.9;
  const n = norm([
    (height(s, x - e, y, side) - height(s, x + e, y, side)) / (2 * e),
    (height(s, x, y - e, side) - height(s, x, y + e, side)) / (2 * e),
    1,
  ]);
  const diffuse = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]);
  const rim = (1 - n[2]) ** 2 * Math.max(0, n[0] * RIM[0] + n[1] * RIM[1] + n[2] * RIM[2]);
  return clamp(0.03 + 1.02 * diffuse ** 1.15 + 0.7 * rim, 0, 0.999);
}

const cache = new Map<string, Figure>();

export function figure(side: Side, sex: Sex = 'male'): Figure {
  const hit = cache.get(`${sex}-${side}`);
  if (hit) return hit;
  const s = SHAPES[sex];

  const cells = new Map<number, BodyRegion>();
  const id = (j: number, q: number) => j * 1024 + q + 512;
  const xOf = (q: number) => CX + (q * PITCH) / 2;
  const yOf = (j: number) => Y0 + j * ROW;
  const rows = Math.floor((FIG_H - Y0) / ROW);
  const cols = Math.ceil(FIG_W / PITCH);

  for (let j = 0; j < rows; j++) {
    for (let q = -cols + (j & 1); q <= cols; q += 2) {
      const x = xOf(q);
      const y = yOf(j);
      const u = Math.abs(x - CX);
      const f = fields(s, u, y, side);
      if (bodyD(f) < 0) cells.set(id(j, q), regionOf(s, f, u, y, side));
    }
  }

  const draft: Partial<
    Record<BodyRegion, { shades: string[][]; edge: string[]; hit: string[]; pts: [number, number][] }>
  > = {};
  const near = [
    [0, 2],
    [0, -2],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (let j = 0; j < rows; j++) {
    let run: { z: BodyRegion; from: number; to: number } | null = null;
    const close = () => {
      if (!run) return;
      const a = xOf(run.from).toFixed(1);
      const b = xOf(run.to).toFixed(1);
      draft[run.z]!.hit.push(`M${a} ${yOf(j).toFixed(1)}${a === b ? 'h.01' : `H${b}`}`);
      run = null;
    };
    for (let q = -cols + (j & 1); q <= cols; q += 2) {
      const z = cells.get(id(j, q));
      if (!z) {
        close();
        continue;
      }
      const x = xOf(q);
      const y = yOf(j);
      const d = (draft[z] ??= {
        shades: Array.from({ length: SHADES }, () => []),
        edge: [],
        hit: [],
        pts: [],
      });
      const dot = `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
      d.shades[Math.floor(shade(s, x, y, side) * SHADES)].push(dot);
      if (near.some(([dj, dq]) => cells.get(id(j + dj, q + dq)) !== z)) d.edge.push(dot);
      d.pts.push([x, y]);
      if (run && run.z === z) run.to = q;
      else {
        close();
        run = { z, from: q, to: q };
      }
    }
    close();
  }

  const box = (pts: [number, number][]): Box => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };

  const out: Figure = {};
  for (const [z, d] of Object.entries(draft) as [BodyRegion, NonNullable<(typeof draft)[BodyRegion]>][]) {
    const groups = SPLIT.includes(z)
      ? [d.pts.filter((p) => p[0] < CX), d.pts.filter((p) => p[0] >= CX)]
      : [d.pts];
    out[z] = {
      shades: d.shades.map((list) => list.join('')),
      edge: d.edge.join(''),
      hit: d.hit.join(''),
      parts: groups.filter((g) => g.length).map(box),
      top: Math.min(...d.pts.map((p) => p[1])),
    };
  }
  cache.set(`${sex}-${side}`, out);
  return out;
}
