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

export const PIN: Record<BodyRegion, Pin> = {
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
};

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

const EYES = bone(0, 36.5, 9.6, 37, 4.9, 4.9);
const NECK = bone(0, 58, 0, 86, 13, 13.5);
const UPPER_ARM = bone(48, 99.5, 60, 168, 10, 9.4, 2.6, 0.45);
const FOREARM = bone(60, 168, 69, 232, 9.6, 6.6, 1.6, 0.6);
const HAND = bone(69, 232, 73.5, 271, 6.4, 5.8, 2.5);
const THUMB = bone(64.5, 243, 61.5, 258, 3.4, 2.8);
const THIGH = bone(20, 230, 22.5, 322, 18.6, 13, 1.2);
const THIGH_Z = bone(19.4, 204, 22.5, 322, 17.6, 13, 1.6);
const CALF = bone(22.5, 322, 21, 420, 13, 7.8, 2.8, 0.55);
const FOOT: Record<Side, Bone> = {
  front: bone(20.5, 430, 30, 437.5, 8.2, 9.2),
  back: bone(21, 430, 23.5, 437.5, 8.8, 9),
};
const TORSO_TOP = 72;
const TORSO_END = 236;
const TORSO_CAP = 30;
const TORSO: [number, number][] = [
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
];

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

const torsoD = (u: number, y: number) =>
  Math.max(u - profile(TORSO, y), TORSO_TOP - y, y - TORSO_END);

const skullK = (u: number, y: number) => Math.hypot(u / 15.5, (y - 42) / 22);

const headD = (u: number, y: number) =>
  smin(Math.hypot(u, y - 30) - 20, (skullK(u, y) - 1) * 15.5, 5);

interface Fields {
  head: number;
  neck: number;
  torso: number;
  arms: number;
  hands: number;
  legs: number;
  feet: number;
}

function fields(u: number, y: number, side: Side): Fields {
  return {
    head: headD(u, y),
    neck: boneD(NECK, u, y),
    torso: torsoD(u, y),
    arms: smin(boneD(UPPER_ARM, u, y), boneD(FOREARM, u, y), 3),
    hands: smin(boneD(HAND, u, y), boneD(THUMB, u, y), 2),
    legs: smin(boneD(THIGH, u, y), boneD(CALF, u, y), 4),
    feet: boneD(FOOT[side], u, y),
  };
}

function bodyD(f: Fields): number {
  const core = smin(smin(f.head, f.neck, 4), f.torso, 7);
  const upper = smin(core, smin(f.arms, f.hands, 2.5), 5);
  return smin(upper, smin(f.legs, f.feet, 3), 5);
}

function regionOf(f: Fields, u: number, y: number, side: Side): BodyRegion {
  if (f.head < 0) return side === 'front' && boneD(EYES, u, y) < 0 ? 'eyes' : 'head';
  let best: keyof Fields = 'head';
  for (const k of ['neck', 'torso', 'arms', 'hands', 'legs', 'feet'] as const) {
    if (f[k] < f[best]) best = k;
  }
  if (best !== 'torso') return best;
  if (side === 'back') return 'back';
  return y < 144 + 14 * (u / 36) ** 2 ? 'chest' : 'abdomen';
}

const bump = (u: number, y: number, cu: number, cy: number, su: number, sy: number) =>
  Math.exp(-(((u - cu) / su) ** 2) - ((y - cy) / sy) ** 2);

const span = (y: number, a: number, b: number, soft: number) =>
  clamp((y - a) / soft, 0, 1) * clamp((b - y) / soft, 0, 1);

function relief(u: number, y: number, side: Side): number {
  if (side === 'front') {
    return (
      3.4 * bump(u, y, 20, 108, 15, 12) -
      0.8 * Math.exp(-((u / 3.2) ** 2)) * span(y, 92, 196, 16) +
      1.2 * bump(u, y, 13, 176, 10, 28)
    );
  }
  return (
    2.8 * bump(u, y, 23, 110, 12, 15) -
    1.5 * Math.exp(-((u / 3.4) ** 2)) * span(y, 80, 210, 16) +
    2.6 * bump(u, y, 19, 222, 14, 12)
  );
}

const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

const ease = (y: number, a: number, b: number) => {
  const t = clamp((y - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function height(x: number, y: number, side: Side): number {
  const u = Math.abs(x - CX);
  const f = fields(u, y, side);
  const rim = clamp(-bodyD(f), 0, 4);
  let z = Math.sqrt(rim * (8 - rim));
  const k = skullK(u, y);
  if (k < 1) z = smax(z, 16 * Math.sqrt(1 - k * k), 3);
  const c = Math.hypot(u, y - 30);
  if (c < 20) z = smax(z, 0.85 * Math.sqrt(400 - c * c), 3);
  const t = clamp(profile(TORSO, y) - u, 0, TORSO_CAP);
  if (t > 0) {
    const ends = ease(y, 62, 84) * (1 - ease(y, 222, 254));
    const slab = 0.5 * Math.sqrt(t * (2 * TORSO_CAP - t)) + relief(u, y, side) * clamp(t / 8, 0, 1);
    z = smax(z, slab * ends, 5);
  }
  for (const b of [NECK, UPPER_ARM, FOREARM, HAND, THUMB, THIGH_Z, CALF, FOOT[side]]) {
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

function shade(x: number, y: number, side: Side): number {
  const e = 0.9;
  const n = norm([
    (height(x - e, y, side) - height(x + e, y, side)) / (2 * e),
    (height(x, y - e, side) - height(x, y + e, side)) / (2 * e),
    1,
  ]);
  const diffuse = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]);
  const rim = (1 - n[2]) ** 2 * Math.max(0, n[0] * RIM[0] + n[1] * RIM[1] + n[2] * RIM[2]);
  return clamp(0.03 + 1.02 * diffuse ** 1.15 + 0.7 * rim, 0, 0.999);
}

const cache: Partial<Record<Side, Figure>> = {};

export function figure(side: Side): Figure {
  const hit = cache[side];
  if (hit) return hit;

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
      const f = fields(u, y, side);
      if (bodyD(f) < 0) cells.set(id(j, q), regionOf(f, u, y, side));
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
      d.shades[Math.floor(shade(x, y, side) * SHADES)].push(dot);
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
  cache[side] = out;
  return out;
}
