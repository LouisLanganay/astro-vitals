import type { IndicatorState } from '../lib/types';

export const C = {
  bg: '#000000',
  card: '#0e0e11',
  cardEdge: 'rgba(255,255,255,0.07)',
  well: '#141417',
  well2: '#1e1e22',
  raiseA: '#3a3a41',
  raiseB: '#232328',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.13)',
  fg: '#f5f5f7',
  muted: '#8b8b94',
  faint: '#52525a',
  ui: '#8b6cff',
  ui2: '#5a3cf0',
  dot: '#3e3e46',
  dot2: '#6a6a74',
  green: '#34d17a',
  yellow: '#ffd23f',
  orange: '#ff9f43',
  red: '#ff5a5f',
  onFg: '#000000',
};

export const LEVEL_COLOR: Record<IndicatorState, string> = {
  ok: C.green,
  self_care: C.yellow,
  tell_cmo: C.orange,
  flight_surgeon: C.red,
  not_enough_data: C.muted,
};

export const F = {
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semi: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
};

export const R = 22;

export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
