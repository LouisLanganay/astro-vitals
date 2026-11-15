import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import * as api from '../../lib/api';
import { INDICATOR_INFO } from '../../lib/labels';
import { fmt } from '../../lib/mission';
import { formatValue, thresholdLines } from '../../lib/rules';
import { useApp } from '../../lib/state';
import { INDICATORS, type Indicator, type IndicatorState, type Series } from '../../lib/types';
import { Card, LevelBadge, Loading, Row, Screen, T } from '../../ui/kit';
import { LineChart } from '../../ui/LineChart';
import { C, LEVEL_COLOR } from '../../ui/theme';

const WEEKLY: Indicator[] = ['acuity_left', 'acuity_right', 'amsler_left', 'amsler_right'];
const DECIMALS: Partial<Record<Indicator, number>> = { pvt_mean_rt_ms: 0, exercise_min: 0, pvt_lapses: 0, pvt_false_starts: 0 };
const MIN_SPAN: Partial<Record<Indicator, number>> = { sleep_hours: 2, fluid_l: 1, pvt_mean_rt_ms: 40, exercise_min: 30, acuity_left: 0.3, acuity_right: 0.3, amsler_left: 1, amsler_right: 1 };

export default function Trends() {
  const app = useApp();
  const params = useLocalSearchParams<{ indicator?: string }>();
  const { width } = useWindowDimensions();
  const [series, setSeries] = useState<Series[] | null>(null);

  useEffect(() => {
    let stale = false;
    (async () => {
      const out: Series[] = [];
      for (const id of INDICATORS) {
        const s = await api.series(id).catch(() => null);
        if (s) out.push(s);
      }
      if (!stale) setSeries(out);
    })();
    return () => {
      stale = true;
    };
  }, [app.revision]);

  if (!series) return <Loading />;
  const focus = params.indicator as Indicator | undefined;
  const ordered = focus ? [...series.filter((s) => s.indicator === focus), ...series.filter((s) => s.indicator !== focus)] : series;
  const stateOf = (id: Indicator): IndicatorState => app.assessment?.indicators.find((i) => i.indicator === id)?.state ?? 'not_enough_data';
  const chartW = Math.min(width, 700) - 62;

  return (
    <Screen title="Trends">
      <Row gap={14}>
        <Row gap={6}>
          <View style={{ width: 8, height: 12, borderRadius: 2, backgroundColor: C.ui, opacity: 0.45 }} />
          <T v="small" color={C.muted}>Day</T>
        </Row>
        <Row gap={6}>
          <View style={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: C.ui }} />
          <T v="small" color={C.muted}>7-day mean</T>
        </Row>
        <Row gap={6}>
          <View style={{ width: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: C.muted }} />
          <T v="small" color={C.muted}>Baseline</T>
        </Row>
      </Row>
      {ordered.map((s) => {
        const info = INDICATOR_INFO[s.indicator];
        const st = stateOf(s.indicator);
        const weekly = WEEKLY.includes(s.indicator);
        const d = DECIMALS[s.indicator] ?? 1;
        const lastPoint = [...s.points].reverse().find((p) => p.value !== null) ?? null;
        return (
          <Card key={s.indicator} style={{ gap: 10, borderColor: s.indicator === focus ? C.ui : undefined }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3" style={{ flex: 1 }}>
                {info.label}
              </T>
              <LevelBadge state={st} />
            </Row>
            <Row gap={8} style={{ alignItems: 'baseline' }}>
              <T v="h2">{lastPoint?.value != null ? formatValue(s.indicator, lastPoint.value) : '-'}</T>
              {s.baseline ? (
                <T v="small" color={C.muted}>
                  baseline {formatValue(s.indicator, s.baseline.median)}
                </T>
              ) : null}
            </Row>
            <View style={{ marginHorizontal: -4 }}>
              {lastPoint ? (
                <LineChart
                  points={s.points}
                  baseline={s.baseline?.median ?? null}
                  width={chartW}
                  color={st === 'ok' || st === 'not_enough_data' ? C.ui : LEVEL_COLOR[st]}
                  weekly={weekly}
                  thresholds={thresholdLines(app.catalog, s.indicator, app.settings?.exercise_prescription_min ?? null)}
                  minSpan={MIN_SPAN[s.indicator] ?? 1}
                  format={(v) => fmt(v, d === 0 ? 0 : 1)}
                  label={`${info.label} across the mission`}
                />
              ) : (
                <T v="small" color={C.muted}>
                  No data
                </T>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
