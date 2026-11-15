import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import * as api from '../../lib/api';
import { missionDayLabel } from '../../lib/format';
import type { IconName } from '../../lib/icons';
import { REGION_LABEL } from '../../lib/labels';
import { fmt } from '../../lib/mission';
import { useApp } from '../../lib/state';
import type { Indicator, IndicatorState, Series } from '../../lib/types';
import { FiredRuleCard } from '../../ui/FiredRuleCard';
import { Gauge } from '../../ui/Gauge';
import { Btn, Card, Disclaimer, Icon, IconBox, LevelBadge, Loading, Row, Screen, T } from '../../ui/kit';
import { Notices } from '../../ui/Notices';
import { C, F, LEVEL_COLOR } from '../../ui/theme';

const FLAGGED: IndicatorState[] = ['self_care', 'tell_cmo', 'flight_surgeon'];
const VITALS: { id: Indicator; name: string; decimals: number; unit: string }[] = [
  { id: 'sleep_hours', name: 'Sleep', decimals: 1, unit: 'h' },
  { id: 'pvt_mean_rt_ms', name: 'Reaction time', decimals: 0, unit: 'ms' },
  { id: 'mood', name: 'Mood', decimals: 0, unit: '/ 10' },
  { id: 'fluid_l', name: 'Fluid intake', decimals: 1, unit: 'L' },
];

type Task = { key: string; icon: IconName; status: 'done' | 'due' | 'optional'; title: string; sub: string; go: Href };

export default function Today() {
  const app = useApp();
  const [series, setSeries] = useState<Partial<Record<Indicator, Series>>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let stale = false;
    (async () => {
      const next: Partial<Record<Indicator, Series>> = {};
      for (const id of [...VITALS.map((v) => v.id), 'acuity_right' as Indicator]) {
        next[id] = await api.series(id).catch(() => undefined);
      }
      if (!stale) setSeries(next);
    })();
    return () => {
      stale = true;
    };
  }, [app.revision]);

  const day = app.day;
  const a = app.assessment;
  if (!day) return <Loading />;
  const mission = day.mission;
  const fired = a?.fired ?? [];
  const top = fired[0] ?? null;
  const noData = a != null && a.indicators.every((i) => i.state === 'not_enough_data');
  const level: IndicatorState = noData ? 'not_enough_data' : (a?.level ?? 'not_enough_data');
  const say = noData ? 'No data yet. Do the daily check to start.' : top ? top.action : 'No rule fired. No action needed.';
  const shown = showAll ? fired : fired.slice(0, 3);

  const last = (id: Indicator) => {
    const pts = series[id]?.points ?? [];
    for (let k = pts.length - 1; k >= 0; k--) if (pts[k].value != null) return pts[k];
    return null;
  };
  const stateOf = (id: Indicator): IndicatorState =>
    a?.indicators.find((i) => i.indicator === id)?.state ?? 'not_enough_data';

  const due = (kind: string) => mission.due.some((t) => t.kind === kind);
  const checkDone = day.check.answers != null;
  const visionDue = due('vision_test');
  const lastVision = last('acuity_right');
  const tasks: Task[] = [
    { key: 'check', icon: 'check', status: checkDone ? 'done' : 'due', title: 'Daily check', sub: checkDone ? '' : '2 min', go: '/check' },
    {
      key: 'pvt',
      icon: 'bolt',
      status: day.pvt ? 'done' : 'optional',
      title: 'PVT-B',
      sub: day.pvt ? `${day.pvt.mean_rt_ms ?? '-'} ms · ${day.pvt.lapses} ${day.pvt.lapses === 1 ? 'lapse' : 'lapses'}` : '3 min',
      go: '/pvt',
    },
    {
      key: 'vision',
      icon: 'eye',
      status: visionDue ? 'due' : 'done',
      title: 'Vision test',
      sub: visionDue ? '' : lastVision ? `Next: day ${lastVision.mission_day + 7}` : '',
      go: '/vision',
    },
  ];
  const left = tasks.filter((t) => t.status === 'due').length;
  const flaggedRegions = (a?.regions ?? []).filter((r) => FLAGGED.includes(r.level));

  return (
    <Screen title={missionDayLabel(mission.mission_day)} eyebrow={mission.today}>
      <Notices />
      <Card>
        <View style={{ alignItems: 'center' }}>
          <Gauge state={level} width={180} />
        </View>
        <T v="h3" style={{ fontSize: 18, lineHeight: 24 }}>
          {say}
        </T>
        {a?.level === 'flight_surgeon' ? <Btn kind="primary" label="Export the packet" icon="export" onPress={() => router.push('/export')} /> : null}
        {flaggedRegions.length ? (
          <Row gap={8}>
            {flaggedRegions.map((r) => (
              <Pressable key={r.region} onPress={() => router.push({ pathname: '/body', params: { region: r.region } })}>
                <LevelBadge state={r.level} text={REGION_LABEL[r.region]} />
              </Pressable>
            ))}
          </Row>
        ) : null}
      </Card>

      {fired.length ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h2">Fired rules</T>
            <T v="label">{fired.length}</T>
          </Row>
          {shown.map((r, k) => (
            <FiredRuleCard key={`${r.rule_id}-${k}`} rule={r} />
          ))}
          {fired.length > 3 ? (
            <Btn small kind="ghost" icon={showAll ? 'up' : 'down'} label={showAll ? 'Less' : `+${fired.length - 3}`} onPress={() => setShowAll((s) => !s)} />
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Due today</T>
          {left ? <T v="label">{left}</T> : <Icon name="save" size={16} color={C.green} />}
        </Row>
        {tasks.map((t) => {
          const tint = t.status === 'done' ? C.green : t.status === 'due' ? C.ui : C.muted;
          return (
            <Pressable
              key={t.key}
              onPress={() => router.push(t.go)}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}: ${t.status === 'done' ? 'done' : t.status === 'due' ? 'due' : 'optional'}${t.sub ? `, ${t.sub}` : ''}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}
            >
              <IconBox>
                <Icon name={t.icon} size={17} color={tint} />
              </IconBox>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.medium }}>{t.title}</T>
                {t.sub ? (
                  <T v="small" color={C.muted}>
                    {t.sub}
                  </T>
                ) : null}
              </View>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.status === 'due' ? C.fg : C.raiseB }}>
                <Icon name={t.status === 'done' ? 'save' : 'chevron'} size={16} color={t.status === 'due' ? C.onFg : t.status === 'done' ? C.green : C.fg} />
              </View>
            </Pressable>
          );
        })}
        <Row gap={12} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 }}>
          <IconBox>
            <Icon name="flame" size={17} color={C.orange} />
          </IconBox>
          <T v="big" style={{ fontSize: 34, lineHeight: 38 }}>
            {mission.streak}
          </T>
          <T v="small" color={C.muted}>
            {mission.streak === 1 ? 'day streak' : 'days streak'}
          </T>
        </Row>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {VITALS.map((v) => {
          const st = stateOf(v.id);
          const lv = last(v.id);
          const base = series[v.id]?.baseline ?? null;
          return (
            <Pressable
              key={v.id}
              onPress={() => router.push({ pathname: '/trends', params: { indicator: v.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${v.name}: open the trend`}
              style={({ pressed }) => ({ width: '48%', flexGrow: 1, opacity: pressed ? 0.8 : 1 })}
            >
              <Card style={{ gap: 8, padding: 14, borderColor: FLAGGED.includes(st) ? LEVEL_COLOR[st] + '55' : C.cardEdge }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="label">{v.name}</T>
                  <Icon name="trends" size={14} color={C.faint} />
                </Row>
                <Row gap={4} style={{ alignItems: 'baseline' }}>
                  {lv?.value != null ? (
                    <>
                      <T v="big" style={{ fontSize: 32, lineHeight: 36, fontFamily: F.monoMedium, letterSpacing: -1 }}>
                        {fmt(lv.value, v.decimals)}
                      </T>
                      <T v="small" color={C.muted}>
                        {v.unit}
                      </T>
                    </>
                  ) : (
                    <T color={C.muted}>no data</T>
                  )}
                </Row>
                {base ? (
                  <T v="small" color={C.muted}>
                    Baseline {fmt(base.median, v.decimals)}
                  </T>
                ) : null}
                {FLAGGED.includes(st) ? <LevelBadge state={st} /> : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Disclaimer />
    </Screen>
  );
}
