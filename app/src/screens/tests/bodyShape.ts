import type { BodyRegion } from '../../lib/types';

/**
 * Geometry of the dot matrix body figure, ported from the mock-up. One silhouette of
 * 200 x 452 units, drawn twice: front and back. The first shape that holds a point gives
 * its region, so the order of BODY is the priority.
 */

export type Side = 'front' | 'back';

export type Shape =
  | { t: 'c'; x1: number; y1: number; x2: number; y2: number; r: number }
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'r'; x: number; y: number; w: number; h: number }
  | { t: 'p'; pts: [number, number][] };

export const DOT = 4.6;
export const DOT_STROKE = +(DOT * 0.6).toFixed(2);

const c = (x1: number, y1: number, x2: number, y2: number, r: number): Shape => ({ t: 'c', x1, y1, x2, y2, r });
const e = (cx: number, cy: number, rx: number, ry: number): Shape => ({ t: 'e', cx, cy, rx, ry });
const r = (x: number, y: number, w: number, h: number): Shape => ({ t: 'r', x, y, w, h });
const p = (pts: [number, number][]): Shape => ({ t: 'p', pts });

type Part = [Shape, BodyRegion | null, BodyRegion | null];

export const BODY: Part[] = [
  [r(77, 40, 46, 9), 'eyes', null],
  [e(100, 44, 22, 28), 'head', 'head'],
  [c(100, 70, 100, 92, 10), 'neck', 'neck'],
  [p([[66, 92], [134, 92], [150, 102], [154, 118], [146, 150], [140, 178], [60, 178], [54, 150], [46, 118], [50, 102]]), 'chest', 'back'],
  [p([[60, 178], [140, 178], [136, 212], [142, 250], [58, 250], [64, 212]]), 'abdomen', 'back'],
  [c(44, 112, 34, 184, 10), 'arms', 'arms'],
  [c(34, 184, 28, 246, 8.5), 'arms', 'arms'],
  [c(156, 112, 166, 184, 10), 'arms', 'arms'],
  [c(166, 184, 172, 246, 8.5), 'arms', 'arms'],
  [c(27, 256, 25, 276, 9), 'hands', 'hands'],
  [c(173, 256, 175, 276, 9), 'hands', 'hands'],
  [c(80, 250, 78, 340, 17), 'legs', 'legs'],
  [c(78, 340, 77, 420, 12), 'legs', 'legs'],
  [c(120, 250, 122, 340, 17), 'legs', 'legs'],
  [c(122, 340, 123, 420, 12), 'legs', 'legs'],
  [c(76, 432, 64, 438, 8), 'feet', 'feet'],
  [c(124, 432, 136, 438, 8), 'feet', 'feet'],
];

/** Higher priority is drawn last, on top. */
export const DRAW_ORDER: BodyRegion[] = ['feet', 'legs', 'hands', 'arms', 'abdomen', 'back', 'chest', 'neck', 'head', 'eyes'];

/** Distance of each region from the core of the body, for the entrance stagger. */
export const CORE_RANK: Record<BodyRegion, number> = {
  chest: 0, back: 0, abdomen: 1, neck: 1, arms: 2, head: 2, eyes: 3, hands: 3, legs: 3, feet: 4,
};

/** Label pins: anchor x and y on the figure, label row on the side column. */
export const PIN: Record<BodyRegion, [number, number, number]> = {
  head: [82, 24, 20], eyes: [84, 44, 60], neck: [94, 84, 100], chest: [76, 134, 140], arms: [40, 168, 182],
  abdomen: [80, 214, 226], hands: [27, 266, 276], legs: [80, 330, 336], feet: [68, 436, 420], back: [100, 180, 180],
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function inShape(s: Shape, x: number, y: number): boolean {
  if (s.t === 'e') {
    const a = (x - s.cx) / s.rx;
    const b = (y - s.cy) / s.ry;
    return a * a + b * b <= 1;
  }
  if (s.t === 'r') return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
  if (s.t === 'c') {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = dx * dx + dy * dy;
    const t = len ? clamp(((x - s.x1) * dx + (y - s.y1) * dy) / len, 0, 1) : 0;
    const px = s.x1 + t * dx - x;
    const py = s.y1 + t * dy - y;
    return px * px + py * py <= s.r * s.r;
  }
  let inside = false;
  const pts = s.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (
      pts[i][1] > y !== pts[j][1] > y &&
      x < ((pts[j][0] - pts[i][0]) * (y - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]
    )
      inside = !inside;
  }
  return inside;
}

export function regionAt(x: number, y: number, side: Side): BodyRegion | null {
  for (const [shape, front, back] of BODY) {
    const z = side === 'front' ? front : back;
    if (z && inShape(shape, x, y)) return z;
  }
  return null;
}

/** Shapes of a region on one side, used as hit areas. */
export const shapesOf = (z: BodyRegion, side: Side): Shape[] =>
  BODY.filter((b) => (side === 'front' ? b[1] : b[2]) === z).map((b) => b[0]);

export type DotPaths = Partial<Record<BodyRegion, [string, string, string]>>;

const cache: Partial<Record<Side, DotPaths>> = {};

/** Region to 3 path strings, from the edge (dim, bucket 0) to the core (bright, bucket 2). */
export function figDots(side: Side): DotPaths {
  const hit = cache[side];
  if (hit) return hit;
  const out: Partial<Record<BodyRegion, string[][]>> = {};
  const dy = DOT * 0.88;
  const dirs = [[1, 0], [-1, 0], [0.5, 0.88], [-0.5, 0.88], [0.5, -0.88], [-0.5, -0.88]];
  for (let j = 0, y = 4; y < 452; j++, y += dy) {
    for (let x = (j % 2 ? DOT / 2 : 0) + 2; x < 200; x += DOT) {
      const z = regionAt(x, y, side);
      if (!z) continue;
      let depth = 2;
      for (let k = 1; k <= 2 && depth === 2; k++) {
        if (dirs.some((v) => !regionAt(x + v[0] * DOT * k, y + v[1] * DOT * k, side))) depth = k - 1;
      }
      (out[z] ??= [[], [], []])[depth].push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`);
    }
  }
  const paths: DotPaths = {};
  for (const [z, lists] of Object.entries(out) as [BodyRegion, string[][]][]) {
    paths[z] = [lists[0].join(''), lists[1].join(''), lists[2].join('')];
  }
  cache[side] = paths;
  return paths;
}
