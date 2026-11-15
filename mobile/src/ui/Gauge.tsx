import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { STATE_LABEL } from '../lib/labels';
import { LEVELS, type IndicatorState } from '../lib/types';
import { alpha, C, F, LEVEL_COLOR } from './theme';

const R = 54;
const CX = 70;
const START = 135;
const GAP = 8;
const SEG = (270 - GAP * 3) / 4;

const point = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(CX + R * Math.cos(a)).toFixed(2)} ${(CX + R * Math.sin(a)).toFixed(2)}`;
};
const ARCS = LEVELS.map((_, k) => {
  const s = START + k * (SEG + GAP);
  return `M${point(s)} A${R} ${R} 0 0 1 ${point(s + SEG)}`;
});

export function Gauge({ state, width = 150 }: { state: IndicatorState; width?: number }) {
  const index = state === 'not_enough_data' ? -1 : LEVELS.indexOf(state);
  const color = LEVEL_COLOR[state];
  return (
    <Svg
      width={width}
      height={(width * 124) / 140}
      viewBox="0 0 140 124"
      accessibilityLabel={`Level ${index + 1} of 4: ${STATE_LABEL[state]}`}
    >
      {ARCS.map((d, k) => (
        <Path
          key={k}
          d={d}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          stroke={k === index ? color : k < index ? alpha(color, 0.34) : C.well2}
        />
      ))}
      <SvgText x={70} y={75} textAnchor="middle" fill={color} fontSize={14} fontFamily={F.medium}>
        {index >= 0 ? STATE_LABEL[state] : 'No data'}
      </SvgText>
    </Svg>
  );
}
