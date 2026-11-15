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
import { Banner, Btn, Card, Icon, LevelBadge, Loading, Row, Screen, T, Well } from '../ui/kit';
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
    <Screen back title="Export packet" eyebrow="For the flight surgeon">
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Mission day {p.mission_day}</T>
          <LevelBadge state={p.level} large />
        </Row>
        <T v="small" color={C.muted}>
          {p.date} · {(preview.bytes / 1024).toFixed(1)} / {PACKET_MAX_BYTES / 1024} KB
        </T>
        <View style={{ gap: 6 }}>
          <T v="label">Fired rules · {p.fired.length}</T>
          {p.fired.map((r, k) => (
            <Row key={`${r.rule_id}-${k}`} gap={8} style={{ flexWrap: 'nowrap' }}>
              <LevelBadge state={r.level} />
              <T v="small" style={{ flex: 1 }}>
                {ruleTitle(r)}
              </T>
            </Row>
          ))}
          {!p.fired.length ? <T v="small" color={C.muted}>None</T> : null}
        </View>
        <View style={{ gap: 4 }}>
          <T v="label">Flagged · 14 days</T>
          {p.flagged.map((f) => (
            <T key={f.indicator} v="small">
              {INDICATOR_INFO[f.indicator].label}: <T v="small" color={C.muted} style={{ fontFamily: F.mono }}>{f.values.map((v) => (v == null ? '-' : Math.round(v * 10) / 10)).join(' ')}</T>
            </T>
          ))}
          {!p.flagged.length ? <T v="small" color={C.muted}>None</T> : null}
        </View>
        <View style={{ gap: 4 }}>
          <T v="label">Symptoms · 14 days · {p.symptoms.length}</T>
          {p.symptoms.slice(-6).map((s, k) => (
            <T key={k} v="small">
              {s.date}: {SYMPTOM_LABEL[s.symptom.kind]}, {REGION_LABEL[s.symptom.region].toLowerCase()}, {s.symptom.severity}/3
            </T>
          ))}
          {p.symptoms.length > 6 ? <T v="small" color={C.muted}>+{p.symptoms.length - 6}</T> : null}
          {p.red_flags.map((r, k) => (
            <T key={`r${k}`} v="small" color={C.red}>
              {r.date}: red flag, {RED_FLAG_LABEL[r.kind].toLowerCase()}
            </T>
          ))}
        </View>
        <Btn small kind="ghost" icon={raw ? 'up' : 'down'} label="JSON" onPress={() => setRaw((r) => !r)} />
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
      <Btn kind="primary" icon="export" label="Share" a11y="Share the packet" onPress={share} />
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <Icon name="lock" size={13} color={C.faint} />
        <T v="small" color={C.faint}>
          Nothing leaves the device until you share it
        </T>
      </Row>
    </Screen>
  );
}
