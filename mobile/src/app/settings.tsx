import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import * as api from '../lib/api';
import { errorText, fieldMessage, toAppError } from '../lib/errors';
import { SCENARIO_LABEL } from '../lib/labels';
import { addDays } from '../lib/mission';
import { catalogCondition, catalogTitle, isUrl, sourceLabel } from '../lib/rules';
import { refresh, useApp } from '../lib/state';
import { SCENARIO_IDS, type AppError, type ScenarioId, type ScenarioInfo, type Settings } from '../lib/types';
import { Field, Stepper } from '../ui/form';
import { Banner, Btn, Card, Icon, LevelBadge, Loading, Row, Screen, T, Well } from '../ui/kit';
import { C, F } from '../ui/theme';

export default function SettingsScreen() {
  const app = useApp();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ScenarioId | null>(null);
  const [loaded, setLoaded] = useState<ScenarioInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app.settings) setDraft(app.settings);
  }, [app.settings]);

  if (!draft || !app.day) return <Loading />;

  async function save() {
    if (!draft) return;
    try {
      await api.setSettings(draft);
      setError(null);
      setNote('Settings saved.');
      await refresh();
    } catch (e) {
      setError(toAppError(e));
      setNote(null);
    }
  }

  async function load(id: ScenarioId) {
    setBusy(true);
    try {
      const info = await api.loadScenario(id);
      setLoaded(info);
      setConfirm(null);
      await refresh();
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setBusy(false);
    }
  }

  const days = Math.round((Date.parse(app.day.mission.today) - Date.parse(draft.launch_date)) / 86400000);

  return (
    <Screen back title="Settings">
      <Banner tone="warn" text="Prototype, not a medical device. The rules marked as a design selection need a medical review." />
      <Card>
        <T v="h2">Mission</T>
        <Field label="Launch date" help={`Mission day ${days} today. A date in the future makes all days pre-flight days.`} icon="calendar" error={fieldMessage(error, 'launch_date')}>
          <Stepper label="Launch date" value={0} text={draft.launch_date} steps={[1, 7]} onChange={(v) => setDraft({ ...draft, launch_date: addDays(draft.launch_date, v) })} />
        </Field>
        <Field label="Exercise prescription" icon="dumbbell" error={fieldMessage(error, 'exercise_prescription_min')}>
          <Stepper
            label="Exercise prescription"
            value={draft.exercise_prescription_min}
            text={`${draft.exercise_prescription_min} min`}
            steps={[5, 30]}
            onChange={(v) => setDraft({ ...draft, exercise_prescription_min: Math.max(0, v) })}
          />
        </Field>
        {error && error.kind !== 'validation' ? <Banner tone="error" text={errorText(error)} /> : null}
        {note ? <Banner text={note} /> : null}
        <Btn kind="primary" icon="save" label="Save the settings" onPress={save} />
      </Card>

      <Card>
        <T v="h2">Demo scenarios</T>
        <T v="small" color={C.muted}>
          A scenario replaces all stored data with a seeded mission of 120 days.
        </T>
        {SCENARIO_IDS.map((id) => (
          <Well key={id} style={{ padding: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontFamily: F.medium }}>{SCENARIO_LABEL[id]}</T>
              {confirm === id ? null : <Btn small label="Load" onPress={() => setConfirm(id)} />}
            </Row>
            {confirm === id ? (
              <View style={{ gap: 8 }}>
                <T v="small" color={C.orange}>
                  This deletes all your data on this device. Continue?
                </T>
                <Row>
                  <Btn small kind="danger" label={busy ? 'Loading...' : 'Replace my data'} onPress={() => load(id)} disabled={busy} />
                  <Btn small kind="ghost" label="Cancel" onPress={() => setConfirm(null)} />
                </Row>
              </View>
            ) : null}
          </Well>
        ))}
        {loaded ? (
          <Well>
            <T style={{ fontFamily: F.medium }}>Loaded: {SCENARIO_LABEL[loaded.id]}</T>
            <T v="small" color={C.muted}>
              {loaded.description}
            </T>
            {loaded.expected.map((e) => (
              <Row key={e.level} gap={8}>
                <LevelBadge state={e.level} />
                <T v="small" color={C.muted}>
                  from mission day {e.first_mission_day}
                </T>
              </Row>
            ))}
          </Well>
        ) : null}
      </Card>

      <Card>
        <T v="h2">Rule catalog</T>
        {app.catalog ? (
          <T v="small" color={C.muted}>
            Drift levels: score {app.catalog.drift.self_care} or more = self-care, {app.catalog.drift.tell_cmo} or more = tell the CMO.
          </T>
        ) : null}
        {(app.catalog?.rules ?? []).map((r) => (
          <Well key={r.id} style={{ padding: 12, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontFamily: F.medium, flex: 1 }}>{catalogTitle(r)}</T>
              <LevelBadge state={r.level} />
            </Row>
            <T v="small" color={C.muted}>
              {catalogCondition(app.catalog, r, draft.exercise_prescription_min)}
            </T>
            <T v="small">{r.action}</T>
            {isUrl(r.source) ? (
              <Pressable onPress={() => Linking.openURL(r.source)} accessibilityRole="link" style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name="link" size={13} color={C.muted} />
                <T v="small" style={{ textDecorationLine: 'underline' }}>
                  {sourceLabel(r.source)}
                </T>
              </Pressable>
            ) : (
              <T v="small" color={C.faint}>
                Source: {r.source}
              </T>
            )}
          </Well>
        ))}
      </Card>
      <T v="small" color={C.faint} style={{ textAlign: 'center' }}>
        Astro Vitals. Prototype, not a medical device. All data stays on this device.
      </T>
    </Screen>
  );
}
