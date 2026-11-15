import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Level, SeriesPoint } from '../lib/types';
import { alpha, C, F, LEVEL_COLOR } from './theme';

type Props = {
  points: SeriesPoint[];
  baseline: number | null;
  width: number;
  color: string;
  weekly?: boolean;
  thresholds?: { value: number; level: Level }[];
  minSpan?: number;
  format: (v: number) => string;
  label: string;
};

const L = 38;
const R = 8;
const TOP = 10;
const B = 22;
const H = 160;

export function LineChart({ points, baseline, width, color, weekly = false, thresholds = [], minSpan = 1, format, label }: Props) {
  const vals = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  const means = weekly ? [] : points.flatMap((p) => (p.mean_7d === null ? [] : [p.mean_7d]));
  if (!points.length || (!vals.length && !means.length)) return null;
  const all = [...vals, ...means, ...thresholds.map((t) => t.value)];
  if (baseline !== null) all.push(baseline);
  let lo = all.reduce((m, v) => Math.min(m, v), Infinity);
  let hi = all.reduce((m, v) => Math.max(m, v), -Infinity);
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const pad = (hi - lo) * 0.12;
  hi += pad;
  lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;

  const first = points[0].mission_day;
  const last = points[points.length - 1].mission_day;
  const n = last - first + 1;
  const sw = (width - L - R) / n;
  const X = (d: number) => L + (d - first + 0.5) * sw;
  const Y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (H - TOP - B);
  const y0 = H - B;

  const trace = (key: 'value' | 'mean_7d') => {
    let d = '';
    let pen = false;
    for (const p of points) {
      const v = p[key];
      if (v === null) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${X(p.mission_day).toFixed(1)} ${Y(v).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const bw = Math.max(1, sw * 0.64);
  const ticks = [hi - pad, (hi + lo) / 2, lo + (lo >= 0 && lo === 0 ? 0 : pad)];
  const dayTicks = [first, 0, 30, 60, 90, 120].filter((d, k, arr) => d >= first && d <= last && arr.indexOf(d) === k);

  return (
    <Svg width={width} height={H} accessibilityLabel={label}>
      {ticks.map((t, k) => (
        <SvgText key={k} x={L - 6} y={Y(t) + 4} textAnchor="end" fill={C.faint} fontSize={10} fontFamily={F.mono}>
          {format(t)}
        </SvgText>
      ))}
      <Line x1={L} x2={width - R} y1={y0} y2={y0} stroke={C.line2} strokeWidth={1} />
      {first < 0 && last >= 0 ? <Rect x={L} y={TOP} width={X(0) - sw / 2 - L} height={y0 - TOP} fill={alpha(C.ui, 0.06)} /> : null}
      {!weekly
        ? points.map((p) => {
            if (p.value === null) return null;
            const y = Math.min(Y(p.value), y0 - 1);
            return <Rect key={p.date} x={X(p.mission_day) - bw / 2} y={y} width={bw} height={Math.max(1, y0 - y)} fill={alpha(color, 0.22)} />;
          })
        : null}
      {thresholds.map((t, k) => (
        <Line key={`t${k}`} x1={L} x2={width - R} y1={Y(t.value)} y2={Y(t.value)} stroke={LEVEL_COLOR[t.level]} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="2 3" />
      ))}
      {baseline !== null ? <Line x1={L} x2={width - R} y1={Y(baseline)} y2={Y(baseline)} stroke={C.fg} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="5 4" /> : null}
      {weekly ? (
        <>
          <Path d={trace('value')} stroke={color} strokeWidth={2} fill="none" />
          {points.map((p) => (p.value === null ? null : <Rect key={p.date} x={X(p.mission_day) - 3} y={Y(p.value) - 3} width={6} height={6} rx={3} fill={color} />))}
        </>
      ) : (
        <Path d={trace('mean_7d')} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      )}
      {dayTicks.map((d) => (
        <SvgText key={d} x={X(d)} y={H - 6} textAnchor="middle" fill={C.faint} fontSize={10} fontFamily={F.mono}>
          {d}
        </SvgText>
      ))}
    </Svg>
  );
}
