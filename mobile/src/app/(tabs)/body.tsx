import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import * as api from '../../lib/api';
import type { Sex, Side } from '../../lib/bodyShape';
import { errorText, toAppError } from '../../lib/errors';
import { INDICATOR_INFO, REGION_LABEL, STATE_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
import { formatValue } from '../../lib/rules';
import { refresh, useApp } from '../../lib/state';
import { BODY_REGIONS, type AppError, type BodyRegion, type Level, type Symptom } from '../../lib/types';
import { DotFigure } from '../../ui/DotFigure';
import { FiredRuleCard } from '../../ui/FiredRuleCard';
import { Chips } from '../../ui/form';
import { Banner, Btn, Card, Disclaimer, LevelBadge, LevelIcon, Loading, Row, Screen, Seg, T, Well } from '../../ui/kit';
import { C, F } from '../../ui/theme';
import { SymptomEditor } from '../../ui/SymptomEditor';

const REGION_KIND: Partial<Record<BodyRegion, Symptom['kind']>> = {
  head: 'headache',
  eyes: 'vision_change',
  back: 'back_pain',
  abdomen: 'nausea',
  arms: 'skin_rash',
};

let savedSex: Sex = 'male';

export default function Body() {
  const app = useApp();
  const params = useLocalSearchParams<{ region?: string }>();
  const { width } = useWindowDimensions();
  const [side, setSide] = useState<Side>('front');
  const [sex, setSex] = useState<Sex>(savedSex);
  const [region, setRegion] = useState<BodyRegion>('head');
  const [draft, setDraft] = useState<Symptom | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const r = params.region as BodyRegion | undefined;
    if (r && BODY_REGIONS.includes(r)) {
      setRegion(r);
      if (r === 'back') setSide('back');
    }
  }, [params.region]);

  const a = app.assessment;
  if (!a || !app.day) return <Loading />;
  const levels: Partial<Record<BodyRegion, Level>> = {};
  a.regions.forEach((r) => (levels[r.region] = r.level));
  const rs = a.regions.find((r) => r.region === region)!;
  const figW = Math.min(width - 64, 150);

  function pick(z: BodyRegion) {
    setRegion(z);
    setDraft(null);
    setNote(null);
    setError(null);
  }

  async function log() {
    if (!draft || !app.day) return;
    try {
      const d = await api.getDay(app.day.mission.today);
      await api.saveDailyCheck({ ...d.check, symptoms: [...d.check.symptoms, draft] });
      setDraft(null);
      setError(null);
      setNote(`Saved: ${SYMPTOM_LABEL[draft.kind]}, ${REGION_LABEL[draft.region]}.`);
      await refresh();
    } catch (e) {
      setError(toAppError(e));
    }
  }

  return (
    <Screen title="Body">
      <Card style={{ alignItems: 'center' }}>
        <Row style={{ justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <Seg items={[{ key: 'front', label: 'Front' }, { key: 'back', label: 'Back' }]} value={side} onChange={setSide} />
          <Seg
            items={[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }]}
            value={sex}
            onChange={(s) => {
              savedSex = s;
              setSex(s);
            }}
          />
        </Row>
        <DotFigure side={side} sex={sex} width={figW} levels={levels} selected={region} onPick={pick} />
        <Chips
          items={BODY_REGIONS.map((z) => ({ key: z, label: REGION_LABEL[z] }))}
          value={region}
          onChange={(z) => {
            pick(z);
            if (z === 'back') setSide('back');
          }}
        />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">{REGION_LABEL[region]}</T>
          <LevelBadge state={rs.level} large />
        </Row>

        <View style={{ gap: 8 }}>
          <T v="label">Symptoms today</T>
          {rs.symptoms.length ? (
            rs.symptoms.map((s, k) => (
              <Well key={k} style={{ padding: 12 }}>
                <T style={{ fontFamily: F.medium }}>{SYMPTOM_LABEL[s.kind]}</T>
                <T v="small" color={C.muted}>
                  Severity {s.severity} of 3{s.treated ? `, treated, ${s.improved == null ? 'result not known' : s.improved ? 'improved' : 'not improved'}` : ''}
                </T>
              </Well>
            ))
          ) : (
            <T v="small" color={C.muted}>
              No symptom today.
            </T>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <T v="label">Indicators</T>
          {rs.indicators.length ? (
            rs.indicators.map((i) => (
              <Row key={i.indicator} style={{ justifyContent: 'space-between', flexWrap: 'nowrap', minHeight: 32 }}>
                <Row gap={8} style={{ flex: 1, flexWrap: 'nowrap' }}>
                  <LevelIcon state={i.state} size={9} />
                  <T v="small" style={{ flex: 1 }}>
                    {INDICATOR_INFO[i.indicator].label}
                  </T>
                </Row>
                <T v="small" color={C.muted} style={{ fontFamily: F.mono }}>
                  {i.mean_7d != null ? formatValue(i.indicator, i.mean_7d) : STATE_LABEL[i.state]}
                </T>
              </Row>
            ))
          ) : (
            <T v="small" color={C.muted}>
              No indicator for this region.
            </T>
          )}
          {rs.indicators.length ? (
            <T v="small" color={C.faint}>
              Values are 7-day means.
            </T>
          ) : null}
        </View>

        {rs.fired.length ? (
          <View style={{ gap: 10 }}>
            <T v="label">Fired rules</T>
            {rs.fired.map((r, k) => (
              <FiredRuleCard key={`${r.rule_id}-${k}`} rule={r} />
            ))}
          </View>
        ) : null}

        {note ? <Banner text={note} /> : null}
        {draft ? (
          <>
            <SymptomEditor symptom={draft} onChange={setDraft} prefix="symptoms[0]" error={null} />
            {error ? <Banner tone="error" text={errorText(error)} /> : null}
            <Row>
              <Btn kind="primary" icon="save" label="Save the symptom" onPress={log} />
              <Btn kind="ghost" label="Cancel" onPress={() => setDraft(null)} />
            </Row>
          </>
        ) : (
          <Btn
            icon="plus"
            label={`Log a symptom: ${REGION_LABEL[region].toLowerCase()}`}
            onPress={() => {
              setNote(null);
              setDraft({ kind: REGION_KIND[region] ?? 'other', severity: 1, region, treated: false, improved: null });
            }}
          />
        )}
      </Card>
      <Disclaimer />
    </Screen>
  );
}
