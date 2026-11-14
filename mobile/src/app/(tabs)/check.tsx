import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import * as api from '../../lib/api';
import { errorText, fieldMessage, toAppError } from '../../lib/errors';
import { minToTime, missionDayLabel } from '../../lib/format';
import type { IconName } from '../../lib/icons';
import { RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
import { fmt } from '../../lib/mission';
import { refresh, useApp } from '../../lib/state';
import {
  BODY_REGIONS,
  RED_FLAG_KINDS,
  SYMPTOM_KINDS,
  type AppError,
  type BodyRegion,
  type DailyAnswers,
  type DailyCheck,
  type RedFlagKind,
  type Symptom,
  type SymptomKind,
} from '../../lib/types';
import { Chips, Field, Scale, Stepper, Toggle } from '../../ui/form';
import { Banner, Btn, Card, Disclaimer, Icon, Loading, Row, Screen, T, Well } from '../../ui/kit';
import { C, F } from '../../ui/theme';

type ScaleKey = 'sleep_quality' | 'mood' | 'stress' | 'tiredness' | 'workload';

const SCALES: { key: ScaleKey; label: string; icon: IconName; help: string }[] = [
  { key: 'sleep_quality', label: 'Sleep quality', icon: 'moon', help: '0 = very bad sleep. 10 = very good sleep.' },
  { key: 'mood', label: 'Mood', icon: 'smile', help: '0 = very bad mood. 10 = very good mood.' },
  { key: 'stress', label: 'Stress', icon: 'wave', help: '0 = no stress. 10 = the highest stress.' },
  { key: 'tiredness', label: 'Tiredness', icon: 'battery', help: '0 = fully awake. 10 = too tired to work.' },
  { key: 'workload', label: 'Workload', icon: 'brief', help: '0 = no work. 10 = more work than you can do.' },
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

const DEFAULT_REGION: Partial<Record<SymptomKind, BodyRegion>> = {
  headache: 'head',
  congestion: 'head',
  back_pain: 'back',
  nausea: 'abdomen',
  dizziness: 'head',
  vision_change: 'eyes',
  skin_rash: 'arms',
};

const wrap = (min: number) => ((min % 1440) + 1440) % 1440;
const sleepHours = (a: DailyAnswers) => wrap(a.sleep_end_min - a.sleep_start_min) / 60;

export function SymptomEditor({ symptom, onChange, onRemove, prefix, error }: { symptom: Symptom; onChange: (s: Symptom) => void; onRemove?: () => void; prefix: string; error: AppError | null }) {
  const msg = (f: string) => fieldMessage(error, `${prefix}.${f}`);
  return (
    <Well>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{SYMPTOM_LABEL[symptom.kind]}</T>
        {onRemove ? <Btn small kind="ghost" icon="trash" label="Remove" onPress={onRemove} /> : null}
      </Row>
      <Field label="Kind" error={msg('kind')}>
        <Chips
          items={SYMPTOM_KINDS.map((k) => ({ key: k, label: SYMPTOM_LABEL[k] }))}
          value={symptom.kind}
          onChange={(kind) => onChange({ ...symptom, kind, region: DEFAULT_REGION[kind] ?? symptom.region })}
        />
      </Field>
      <Field label="Severity" error={msg('severity')}>
        <Chips
          items={[
            { key: 1, label: '1 = mild' },
            { key: 2, label: '2 = moderate' },
            { key: 3, label: '3 = severe' },
          ]}
          value={symptom.severity}
          onChange={(severity) => onChange({ ...symptom, severity })}
        />
      </Field>
      <Field label="Body region" error={msg('region')}>
        <Chips items={BODY_REGIONS.map((r) => ({ key: r, label: REGION_LABEL[r] }))} value={symptom.region} onChange={(region) => onChange({ ...symptom, region })} />
      </Field>
      <Field
        label="Treated"
        help="You took a medicine or did a treatment."
        error={msg('treated')}
        right={<Toggle label="Treated" value={symptom.treated} onChange={(treated) => onChange({ ...symptom, treated, improved: treated ? symptom.improved : null })} />}
      >
        {null}
      </Field>
      {symptom.treated ? (
        <Field label="Improved after the treatment" error={msg('improved')}>
          <Chips
            items={[
              { key: 'unknown', label: 'Not known' },
              { key: 'yes', label: 'Yes' },
              { key: 'no', label: 'No' },
            ]}
            value={symptom.improved == null ? 'unknown' : symptom.improved ? 'yes' : 'no'}
            onChange={(k) => onChange({ ...symptom, improved: k === 'unknown' ? null : k === 'yes' })}
          />
        </Field>
      ) : null}
    </Well>
  );
}

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
    <Screen title="Daily check" eyebrow={`${missionDayLabel(app.day?.mission.mission_day ?? 0)}, ${date}`}>
      {base.answers ? <Banner text="You did the check today. A new save replaces it." /> : null}

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
          <T color={C.muted}>hours of sleep</T>
        </Row>
        <Field label="Sleep quality" help={SCALES[0].help} error={msg('answers.sleep_quality')}>
          <Scale label="Sleep quality" value={a.sleep_quality} onChange={(v) => put('sleep_quality', v)} />
        </Field>
        <Field label="Sleep aid" help="You took a medicine to sleep." error={msg('answers.sleep_aid')} right={<Toggle label="Sleep aid" value={a.sleep_aid} onChange={(v) => put('sleep_aid', v)} />}>
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
        <Field label="Fluid intake" help="The sum of all drinks of the day, in litres." icon="drop" error={msg('answers.fluid_l')}>
          <Stepper label="Fluid intake" value={a.fluid_l} text={`${fmt(a.fluid_l, 1)} L`} steps={[0.1, 0.5]} onChange={(v) => put('fluid_l', Math.max(0, Math.round(v * 10) / 10))} />
        </Field>
        <Field label="Resistive exercise" help="Exercise against a load. It keeps muscle and bone." icon="dumbbell" error={msg('answers.exercise_resistive_min')}>
          <Stepper label="Resistive exercise" value={a.exercise_resistive_min} text={`${a.exercise_resistive_min} min`} steps={[5, 15]} onChange={(v) => put('exercise_resistive_min', Math.max(0, v))} />
        </Field>
        <Field label="Aerobic exercise" help="Treadmill or cycle exercise." icon="pulse" error={msg('answers.exercise_aerobic_min')}>
          <Stepper label="Aerobic exercise" value={a.exercise_aerobic_min} text={`${a.exercise_aerobic_min} min`} steps={[5, 15]} onChange={(v) => put('exercise_aerobic_min', Math.max(0, v))} />
        </Field>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Symptoms</T>
          <T v="label">{symptoms.length ? `${symptoms.length}` : 'None'}</T>
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
        <Btn icon="plus" label="Add a symptom" onPress={() => setSymptoms((cur) => [...cur, { kind: 'headache', severity: 1, region: 'head', treated: false, improved: null }])} />
      </Card>

      <Card>
        <T v="h2">Red flags</T>
        <T v="small" color={C.muted}>
          Set a sign only if you have it now. A red flag sets the level to "Flight surgeon".
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

      {error ? <Banner tone="error" text={error.kind === 'validation' ? `Correct the fields in red. ${errorText(error)}` : errorText(error)} /> : null}
      {saved ? <Banner text="Saved. The level of today is up to date." /> : null}
      <Btn kind="primary" icon="save" label={saving ? 'Saving...' : 'Save the check'} onPress={save} disabled={saving} />
      <Disclaimer />
    </Screen>
  );
}
