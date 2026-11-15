import { memo, useMemo } from 'react';
import { Pressable, type GestureResponderEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { EDGE_WIDTH, FIG_H, FIG_W, figure, ORDER, SHADE_WIDTH, type Sex, type Side } from '../lib/bodyShape';
import { REGION_LABEL } from '../lib/labels';
import type { BodyRegion, Level } from '../lib/types';
import { C, LEVEL_COLOR } from './theme';

const OPACITY = [0.22, 0.32, 0.47, 0.63, 0.81, 1];
const FLAG_OPACITY = [0.46, 0.56, 0.67, 0.78, 0.9, 1];

type Props = {
  side: Side;
  sex: Sex;
  width: number;
  levels: Partial<Record<BodyRegion, Level>>;
  selected: BodyRegion | null;
  onPick: (region: BodyRegion) => void;
};

function DotFigureView({ side, sex, width, levels, selected, onPick }: Props) {
  const geo = useMemo(() => figure(side, sex), [side, sex]);
  const scale = width / FIG_W;
  const height = FIG_H * scale;

  function pick(e: GestureResponderEvent) {
    const x = e.nativeEvent.locationX / scale;
    const y = e.nativeEvent.locationY / scale;
    let best: BodyRegion | null = null;
    let dist = 64;
    for (const z of ORDER) {
      for (const [px, py] of geo[z]?.pts ?? []) {
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < dist) {
          dist = d;
          best = z;
        }
      }
    }
    if (best) onPick(best);
  }

  return (
    <Pressable onPress={pick} accessibilityLabel="Body figure. Tap a region." style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${FIG_W} ${FIG_H}`} pointerEvents="none">
        {ORDER.map((z) => {
          const g = geo[z];
          if (!g) return null;
          const lv = levels[z] ?? 'ok';
          const flag = lv !== 'ok';
          const on = selected === z;
          const color = flag ? LEVEL_COLOR[lv] : z === 'eyes' ? C.fg : on ? '#c9c9d1' : '#9a9aa3';
          const op = flag ? FLAG_OPACITY : OPACITY;
          return (
            <G key={z}>
              {g.shades.map((d, k) =>
                d ? <Path key={k} d={d} stroke={color} strokeOpacity={op[k]} strokeWidth={SHADE_WIDTH[k]} strokeLinecap="round" fill="none" /> : null,
              )}
              {on ? <Path d={g.edge} stroke={flag ? LEVEL_COLOR[lv] : C.fg} strokeWidth={EDGE_WIDTH} strokeLinecap="round" fill="none" /> : null}
            </G>
          );
        })}
      </Svg>
    </Pressable>
  );
}

export const DotFigure = memo(DotFigureView);
export const regionName = (z: BodyRegion) => REGION_LABEL[z];
