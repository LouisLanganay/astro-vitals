import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import * as api from '../lib/api';
import { exportFile } from '../core/storage';
import { errorText, toAppError } from '../lib/errors';
import { INDICATOR_INFO, RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../lib/labels';
import { ruleTitle } from '../lib/rules';
import { useApp } from '../lib/state';
import { PACKET_MAX_BYTES, type AppError, type PacketExport } from '../lib/types';
import { Banner, Btn, Card, Disclaimer, LevelBadge, Loading, Row, Screen, T, Well } from '../ui/kit';
import { C, F } from '../ui/theme';

export default function Export() {
  const app = useApp();
  const [preview, setPreview] = useState<PacketExport | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);

  useEffect(() => {
    api
      .exportPacket(null)
      .then(setPreview)
      .catch((e) => setError(toAppError(e)));
  }, [app.revision]);

  if (error && !preview) {
    return (
      <Screen back title="Export packet">
          <Banner tone="error" text={errorText(error)} />
      </Screen>
    );
  }
  if (!preview) return <Loading />;
  const p = preview.packet;
  const name = `astro-vitals-packet-day-${p.mission_day}.json`;

  async function share() {
    if (!preview) return;
    try {
      const uri = exportFile(name, preview.json);
      if (Platform.OS === 'web') {
        setNote(`The file ${name} is in your downloads.`);
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        setNote(`Sharing is not available. The file is at ${uri}.`);
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Send the packet', UTI: 'public.json' });
      setNote('The share sheet closed.');
    } catch (e) {
      setError(toAppError(e));
    }
  }

  return (
    <Screen back title="Export packet" eyebrow="A summary for the flight surgeon. Read it before you send it.">
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Mission day {p.mission_day}</T>
          <LevelBadge state={p.level} large />
        </Row>
        <T v="small" color={C.muted}>
          {p.date}. Size: {preview.bytes} bytes of {PACKET_MAX_BYTES} maximum.
        </T>
        <View style={{ gap: 6 }}>
          <T v="label">Fired rules ({p.fired.length})</T>
          {p.fired.map((r, k) => (
            <Row key={`${r.rule_id}-${k}`} gap={8} style={{ flexWrap: 'nowrap' }}>
              <LevelBadge state={r.level} />
              <T v="small" style={{ flex: 1 }}>
                {ruleTitle(r)}
              </T>
            </Row>
          ))}
          {!p.fired.length ? <T v="small" color={C.muted}>No rule fired.</T> : null}
        </View>
        <View style={{ gap: 4 }}>
          <T v="label">Flagged indicators, 14 days</T>
          {p.flagged.map((f) => (
            <T key={f.indicator} v="small">
              {INDICATOR_INFO[f.indicator].label}: <T v="small" color={C.muted} style={{ fontFamily: F.mono }}>{f.values.map((v) => (v == null ? '-' : Math.round(v * 10) / 10)).join(' ')}</T>
            </T>
          ))}
          {!p.flagged.length ? <T v="small" color={C.muted}>None.</T> : null}
        </View>
        <View style={{ gap: 4 }}>
          <T v="label">Symptoms, 14 days ({p.symptoms.length})</T>
          {p.symptoms.slice(-6).map((s, k) => (
            <T key={k} v="small">
              {s.date}: {SYMPTOM_LABEL[s.symptom.kind]}, {REGION_LABEL[s.symptom.region].toLowerCase()}, severity {s.symptom.severity}
            </T>
          ))}
          {p.symptoms.length > 6 ? <T v="small" color={C.muted}>And {p.symptoms.length - 6} more in the file.</T> : null}
          {p.red_flags.map((r, k) => (
            <T key={`r${k}`} v="small" color={C.red}>
              {r.date}: red flag, {RED_FLAG_LABEL[r.kind].toLowerCase()}
            </T>
          ))}
        </View>
        <T v="small" color={C.muted}>
          Baselines: {p.baselines.length} indicators.
        </T>
        <Btn small kind="ghost" label={raw ? 'Hide the JSON file' : 'Show the JSON file'} onPress={() => setRaw((r) => !r)} />
        {raw ? (
          <Well style={{ maxHeight: 320 }}>
            <ScrollView nestedScrollEnabled>
              <T v="mono" style={{ fontSize: 11, lineHeight: 15 }}>
                {JSON.stringify(JSON.parse(preview.json), null, 1)}
              </T>
            </ScrollView>
          </Well>
        ) : null}
      </Card>
      {error ? <Banner tone="error" text={errorText(error)} /> : null}
      {note ? <Banner text={note} /> : null}
      <Btn kind="primary" icon="export" label="Share the packet" onPress={share} />
      <T v="small" color={C.faint} style={{ textAlign: 'center' }}>
        Nothing leaves the device until you share the file.
      </T>
      <Disclaimer />
    </Screen>
  );
}
