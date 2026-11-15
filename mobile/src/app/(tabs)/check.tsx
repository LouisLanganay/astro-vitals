import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import * as api from '../../lib/api';
import { errorText, fieldMessage, toAppError } from '../../lib/errors';
import { minToTime, missionDayLabel } from '../../lib/format';
import type { IconName } from '../../lib/icons';
import { RED_FLAG_LABEL } from '../../lib/labels';
import { fmt } from '../../lib/mission';
import { refresh, useApp } from '../../lib/state';
import {
  RED_FLAG_KINDS,
  type AppError,
  type DailyAnswers,
  type DailyCheck,
  type RedFlagKind,
  type Symptom,
} from '../../lib/types';
import { Field, Scale, Stepper, Toggle } from '../../ui/form';
import { SymptomEditor } from '../../ui/SymptomEditor';
import { Banner, Btn, Card, Icon, LevelIcon, Loading, Row, Screen, T } from '../../ui/kit';
import { C, F } from '../../ui/theme';

type ScaleKey = 'sleep_quality' | 'mood' | 'stress' | 'tiredness' | 'workload';

const SCALES: { key: ScaleKey; label: string; icon: IconName; help: string }[] = [
  { key: 'sleep_quality', label: 'Sleep quality', icon: 'moon', help: 'Bad → good' },
  { key: 'mood', label: 'Mood', icon: 'smile', help: 'Bad → good' },
  { key: 'stress', label: 'Stress', icon: 'wave', help: 'None → very high' },
  { key: 'tiredness', label: 'Tiredness', icon: 'battery', help: 'Awake → too tired to work' },
  { key: 'workload', label: 'Workload', icon: 'brief', help: 'None → too much' },
];

const DEFAULT: DailyAnswers = {
  sleep_start_min: 23 * 60,
  sleep_end_min: 7 * 60,
  sleep_quality: 5,
  sleep_aid: false,
  mood: 5,
  stress: 5,
  tiredness: 5,
  workload: 5,
  fluid_l: 2.5,
  exercise_resistive_min: 45,
  exercise_aerobic_min: 45,
};

const wrap = (min: number) => ((min % 1440) + 1440) % 1440;
const sleepHours = (a: DailyAnswers) => wrap(a.sleep_end_min - a.sleep_start_min) / 60;

export default function Check() {
  const app = useApp();
  const date = app.day?.mission.today ?? null;
  const [base, setBase] = useState<DailyCheck | null>(null);
  const [a, setA] = useState<DailyAnswers>(DEFAULT);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [flags, setFlags] = useState<RedFlagKind[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!date) return;
    let stale = false;
    api.getDay(date).then((d) => {
      if (stale) return;
      setBase(d.check);
      setA(d.check.answers ?? DEFAULT);
      setSymptoms(d.check.symptoms);
      setFlags(d.check.red_flags);
    });
    return () => {
      stale = true;
    };
  }, [date, app.revision]);

  if (!date || !base) return <Loading />;

  const put = <K extends keyof DailyAnswers>(k: K, v: DailyAnswers[K]) => {
    setSaved(false);
    setA((cur) => ({ ...cur, [k]: v }));
  };
  const msg = (f: string) => fieldMessage(error, f);

  async function save() {
    if (!date) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.saveDailyCheck({ date, answers: a, symptoms, red_flags: flags });
      setError(null);
      setSaved(true);
      await refresh();
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setSaving(false);
    }
  }

  const hours = sleepHours(a);

  return (
    <Screen title="Daily check" eyebrow={missionDayLabel(app.day?.mission.mission_day ?? 0)}>
      {base.answers ? <Banner text="Done today. A new save replaces it." /> : null}

      <Card>
        <T v="h2">Sleep</T>
        <Field label="Sleep start" icon="moon" error={msg('answers.sleep_start_min')}>
          <Stepper label="Sleep start" value={a.sleep_start_min} text={minToTime(a.sleep_start_min)} steps={[15, 60]} onChange={(v) => put('sleep_start_min', wrap(v))} />
        </Field>
        <Field label="Wake time" icon="sun" error={msg('answers.sleep_end_min')}>
          <Stepper label="Wake time" value={a.sleep_end_min} text={minToTime(a.sleep_end_min)} steps={[15, 60]} onChange={(v) => put('sleep_end_min', wrap(v))} />
        </Field>
        <Row gap={6} style={{ alignItems: 'baseline' }}>
          <T v="big" style={{ fontSize: 34, lineHeight: 38, fontFamily: F.monoMedium }}>
            {fmt(hours, 1)}
          </T>
          <T color={C.muted}>h</T>
        </Row>
        <Field label="Sleep quality" help={SCALES[0].help} error={msg('answers.sleep_quality')}>
          <Scale label="Sleep quality" value={a.sleep_quality} onChange={(v) => put('sleep_quality', v)} />
        </Field>
        <Field label="Sleep aid" icon="pill" error={msg('answers.sleep_aid')} right={<Toggle label="Sleep aid" value={a.sleep_aid} onChange={(v) => put('sleep_aid', v)} />}>
          {null}
        </Field>
      </Card>

      <Card>
        <T v="h2">How you feel</T>
        {SCALES.slice(1).map((sc) => (
          <Field key={sc.key} label={sc.label} help={sc.help} icon={sc.icon} error={msg(`answers.${sc.key}`)}>
            <Scale label={sc.label} value={a[sc.key]} onChange={(v) => put(sc.key, v)} />
          </Field>
        ))}
      </Card>

      <Card>
        <T v="h2">Fluid and exercise</T>
        <Field label="Fluid intake" icon="drop" error={msg('answers.fluid_l')}>
          <Stepper label="Fluid intake" value={a.fluid_l} text={`${fmt(a.fluid_l, 1)} L`} steps={[0.1, 0.5]} onChange={(v) => put('fluid_l', Math.max(0, Math.round(v * 10) / 10))} />
        </Field>
        <Field label="Resistive exercise" icon="dumbbell" error={msg('answers.exercise_resistive_min')}>
          <Stepper label="Resistive exercise" value={a.exercise_resistive_min} text={`${a.exercise_resistive_min} min`} steps={[5, 15]} onChange={(v) => put('exercise_resistive_min', Math.max(0, v))} />
        </Field>
        <Field label="Aerobic exercise" icon="pulse" error={msg('answers.exercise_aerobic_min')}>
          <Stepper label="Aerobic exercise" value={a.exercise_aerobic_min} text={`${a.exercise_aerobic_min} min`} steps={[5, 15]} onChange={(v) => put('exercise_aerobic_min', Math.max(0, v))} />
        </Field>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Symptoms</T>
          {symptoms.length ? <T v="label">{symptoms.length}</T> : null}
        </Row>
        {symptoms.map((sy, k) => (
          <SymptomEditor
            key={k}
            symptom={sy}
            prefix={`symptoms[${k}]`}
            error={error}
            onChange={(n) => {
              setSaved(false);
              setSymptoms((cur) => cur.map((x, j) => (j === k ? n : x)));
            }}
            onRemove={() => setSymptoms((cur) => cur.filter((_, j) => j !== k))}
          />
        ))}
        <Btn icon="plus" label="Add" onPress={() => setSymptoms((cur) => [...cur, { kind: 'headache', severity: 1, region: 'head', treated: false, improved: null }])} />
      </Card>

      <Card>
        <Row gap={8}>
          <LevelIcon state="flight_surgeon" size={11} />
          <T v="h2">Red flags</T>
        </Row>
        <T v="small" color={C.muted}>
          Only if you have it now.
        </T>
        {RED_FLAG_KINDS.map((k) => {
          const on = flags.includes(k);
          return (
            <Pressable
              key={k}
              onPress={() => setFlags((cur) => (on ? cur.filter((f) => f !== k) : [...cur, k]))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.red : C.well2, borderWidth: 1.5, borderColor: on ? C.red : C.line2 }}>
                {on ? <Icon name="save" size={14} color="#fff" width={2.4} /> : null}
              </View>
              <T style={{ flex: 1 }}>{RED_FLAG_LABEL[k]}</T>
            </Pressable>
          );
        })}
        {msg('red_flags') ? <T v="small" color={C.red}>{msg('red_flags')}</T> : null}
      </Card>

      {error ? <Banner tone="error" text={error.kind === 'validation' ? `Correct the fields in red: ${error.errors.length}.` : errorText(error)} /> : null}
      {saved ? <Banner text="Saved." /> : null}
      <Btn kind="primary" icon="save" label={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} />
    </Screen>
  );
}
