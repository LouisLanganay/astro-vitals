
export type Num = number | number[];

export interface Transition {
  duration?: number;
  delay?: number;
  ease?: string | number[];
  times?: number[];
  [prop: string]: unknown;
}

export interface Variant {
  transition?: Transition;
  [prop: string]: Num | Transition | undefined;
}

export interface Shape {
  tag: string;
  part?: string;
  [attr: string]: string | number | undefined;
}

export interface IconDef {
  source?: string;
  parts: Shape[];
  motion: Record<string, { initial?: Variant; animate: Variant }>;
  options: { origins?: Record<string, readonly number[]>; groupOrigin?: string };
}

const CURVES: Record<string, string> = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};
const BACK_MS = 250;
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

function easing(e: unknown): string {
  if (Array.isArray(e) && e.length === 4 && e.every((n) => typeof n === 'number')) return `cubic-bezier(${e.join(', ')})`;
  if (typeof e === 'string') return CURVES[e] ?? 'ease';
  return EASE;
}

const list = (v: Num | undefined, n: number, rest: number): number[] => {
  if (v === undefined) return Array(n).fill(rest);
  if (!Array.isArray(v)) return [rest, v];
  if (v.length >= n) return v;
  return [...v, ...Array(n - v.length).fill(v[v.length - 1])];
};

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function channels(v: Variant): { css: string; props: string[] }[] {
  const has = (p: string) => v[p] !== undefined;
  const out: { css: string; props: string[] }[] = [];
  if (has('x') || has('y')) out.push({ css: 'translate', props: ['x', 'y'] });
  if (has('rotate')) out.push({ css: 'rotate', props: ['rotate'] });
  if (has('scale') || has('scaleX') || has('scaleY')) out.push({ css: 'scale', props: ['scale', 'scaleX', 'scaleY'] });
  if (has('opacity')) out.push({ css: 'opacity', props: ['opacity'] });
  if (has('pathLength')) out.push({ css: 'strokeDashoffset', props: ['pathLength'] });
  return out;
}

function frames(css: string, v: Variant): { frames: Keyframe[]; held: boolean; lead: string } {
  const vals = (p: string) => v[p] as Num | undefined;
  const len = Math.max(...['x', 'y', 'rotate', 'scale', 'scaleX', 'scaleY', 'opacity', 'pathLength'].map((p) => {
    const x = vals(p);
    return Array.isArray(x) ? x.length : x === undefined ? 0 : 2;
  }));
  const pick = (p: string) => vals(p);
  let lead = '';
  let held = false;
  let out: Keyframe[] = [];
  if (css === 'translate') {
    lead = pick('x') !== undefined ? 'x' : 'y';
    held = !Array.isArray(pick(lead));
    const xs = list(pick('x'), len, 0);
    const ys = list(pick('y'), len, 0);
    out = xs.map((x, i) => ({ translate: `${x}px ${ys[i]}px` }));
  } else if (css === 'rotate') {
    lead = 'rotate';
    held = !Array.isArray(pick('rotate'));
    out = list(pick('rotate'), len, 0).map((r) => ({ rotate: `${r}deg` }));
  } else if (css === 'scale') {
    lead = ['scale', 'scaleX', 'scaleY'].find((p) => pick(p) !== undefined) ?? 'scale';
    held = !Array.isArray(pick(lead));
    const s = list(pick('scale'), len, 1);
    const sx = pick('scaleX') !== undefined ? list(pick('scaleX'), len, 1) : s;
    const sy = pick('scaleY') !== undefined ? list(pick('scaleY'), len, 1) : s;
    out = sx.map((x, i) => ({ scale: `${x} ${sy[i]}` }));
  } else if (css === 'opacity') {
    lead = 'opacity';
    held = !Array.isArray(pick('opacity'));
    out = list(pick('opacity'), len, 1).map((o) => ({ opacity: o }));
  } else {
    lead = 'pathLength';
    held = !Array.isArray(pick('pathLength'));
    out = list(pick('pathLength'), len, 1).map((p) => ({ strokeDasharray: '1', strokeDashoffset: `${1 - p}` }));
  }
  return { frames: out, held, lead };
}

function origin(el: SVGElement, def: IconDef, part: string) {
  const o = def.options.origins?.[part];
  if (part === 'group') {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = def.options.groupOrigin ?? '50% 50%';
  } else if (o) {
    el.style.transformBox = 'view-box';
    el.style.transformOrigin = `${o[0]}px ${o[1]}px`;
  } else {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = '50% 50%';
  }
}

const running = new WeakMap<SVGSVGElement, Animation[]>();

export function play(svg: SVGSVGElement, def: IconDef) {
  if (reduced()) return;
  for (const a of running.get(svg) ?? []) a.cancel();
  const anims: Animation[] = [];
  for (const [part, table] of Object.entries(def.motion)) {
    const v = table.animate;
    const t: Transition = v.transition ?? {};
    const els: SVGElement[] = part === 'group'
      ? [svg.querySelector('g[data-part="group"]') as SVGElement]
      : Array.from(svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`));
    for (const el of els) {
      if (!el) continue;
      origin(el, def, part);
      for (const ch of channels(v)) {
        const f = frames(ch.css, v);
        const own = (t[f.lead] ?? (ch.css === 'strokeDashoffset' ? t.pathLength : undefined)) as Transition | undefined;
        const tr: Transition = { ...t, ...(own && typeof own === 'object' ? own : {}) };
        const times = Array.isArray(tr.times) && tr.times.length === f.frames.length ? tr.times : null;
        const kfs = times ? f.frames.map((k, i) => ({ ...k, offset: times[i] })) : f.frames;
        anims.push(el.animate(kfs, {
          duration: (tr.duration ?? 0.4) * 1000,
          delay: (tr.delay ?? 0) * 1000,
          easing: easing(tr.ease),
          fill: f.held ? 'forwards' : 'backwards',
        }));
      }
    }
  }
  running.set(svg, anims);
}

export function release(svg: SVGSVGElement) {
  const anims = running.get(svg);
  if (!anims) return;
  for (const a of anims) {
    const fill = a.effect?.getTiming().fill;
    if (fill !== 'forwards') continue;
    const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
    if (!el) { a.cancel(); continue; }
    const cs = getComputedStyle(el);
    const from: Keyframe = { translate: cs.translate, rotate: cs.rotate, scale: cs.scale, opacity: cs.opacity };
    a.cancel();
    el.animate([from, { translate: '0px 0px', rotate: '0deg', scale: '1', opacity: '1' }], { duration: BACK_MS, easing: EASE });
  }
}

export const BEAT: IconDef['motion'] = {
  group: { animate: { scale: [1, 1.12, 1], transition: { duration: 0.4, ease: 'easeInOut' } } },
};
