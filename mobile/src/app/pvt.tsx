import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import * as api from '../lib/api';
import { errorText, toAppError } from '../lib/errors';
import { refresh, useApp } from '../lib/state';
import {
  PVT_DURATION_MS,
  PVT_FALSE_START_MS,
  PVT_INTERVAL_MAX_MS,
  PVT_INTERVAL_MIN_MS,
  PVT_LAPSE_MS,
  PVT_TIMEOUT_MS,
  type AppError,
  type Indicator,
  type PvtResult,
  type PvtTrial,
} from '../lib/types';
import { Banner, Btn, Card, Disclaimer, LevelBadge, Row, Screen, T, Well } from '../ui/kit';
import { C, F } from '../ui/theme';

type Phase = 'intro' | 'running' | 'saving' | 'done' | 'cancelled';

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export default function Pvt() {
  const app = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [lit, setLit] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<PvtResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const trials = useRef<PvtTrial[]>([]);
  const startedAt = useRef(0);
  const stimulusAt = useRef(0);
  const litRef = useRef(false);
  const phaseRef = useRef<Phase>('intro');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const date = useRef('');

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const cancel = useCallback((why: string) => {
    if (phaseRef.current !== 'running') return;
    clear();
    litRef.current = false;
    setLit(false);
    trials.current = [];
    setReason(why);
    setP('cancelled');
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') cancel('The app went to the background. The test stopped and saved nothing.');
    });
    return () => {
      sub.remove();
      clear();
    };
  }, [cancel]);

  useFocusEffect(
    useCallback(() => () => cancel('You left the screen. The test stopped and saved nothing.'), [cancel]),
  );

  async function finish() {
    clear();
    litRef.current = false;
    setLit(false);
    setP('saving');
    try {
      const r = await api.savePvt({ date: date.current, trials: trials.current });
      setResult(r);
      setError(null);
      setP('done');
      await refresh();
    } catch (e) {
      setError(toAppError(e));
      setP('done');
    }
  }

  function next() {
    clear();
    litRef.current = false;
    setLit(false);
    const spent = now() - startedAt.current;
    setElapsed(spent);
    const left = PVT_DURATION_MS - spent;
    if (left <= 0) {
      finish();
      return;
    }
    const wait = PVT_INTERVAL_MIN_MS + Math.random() * (PVT_INTERVAL_MAX_MS - PVT_INTERVAL_MIN_MS);
    timer.current = wait < left ? setTimeout(show, wait) : setTimeout(finish, left);
  }

  function show() {
    litRef.current = true;
    setLit(true);
    setFeedback('');
    stimulusAt.current = now();
    timer.current = setTimeout(() => {
      trials.current.push({ kind: 'timeout' });
      setFeedback('No input');
      next();
    }, PVT_TIMEOUT_MS);
  }

  function start() {
    if (!app.day) return;
    date.current = app.day.mission.today;
    trials.current = [];
    setResult(null);
    setError(null);
    setFeedback('');
    setP('running');
    startedAt.current = now();
    next();
  }

  function input() {
    if (phaseRef.current !== 'running') return;
    const rt = now() - stimulusAt.current;
    if (litRef.current && rt >= PVT_TIMEOUT_MS) {
      trials.current.push({ kind: 'timeout' });
      setFeedback('No input');
    } else if (litRef.current) {
      trials.current.push({ kind: 'response', rt_ms: rt });
      setFeedback(`${Math.round(rt)} ms`);
    } else {
      trials.current.push({ kind: 'premature' });
      setFeedback('Too early');
    }
    next();
  }

  if (phase === 'running') {
    const left = Math.max(0, Math.ceil((PVT_DURATION_MS - elapsed) / 1000));
    return (
      <Pressable
        onPressIn={input}
        accessibilityLabel="Test area. Tap when the circle shows."
        style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 28 }}
      >
        <T v="label">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left. {trials.current.length} trials.
        </T>
        <View
          style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: lit ? C.ui : C.well,
            borderWidth: 2,
            borderColor: lit ? '#fff' : C.line2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T style={{ fontFamily: F.monoMedium, fontSize: 28, lineHeight: 34 }} color={lit ? '#fff' : C.muted}>
            {lit ? 'TAP' : feedback || 'Wait'}
          </T>
        </View>
        <T v="small" color={C.faint} style={{ textAlign: 'center', paddingHorizontal: 32 }}>
          Tap anywhere when the circle lights up. Do not tap before.
        </T>
        <View style={{ position: 'absolute', bottom: 40 }}>
          <Btn small kind="ghost" label="Stop the test" onPress={() => cancel('You stopped the test. It saved nothing.')} />
        </View>
      </Pressable>
    );
  }

  const shown = result ?? app.day?.pvt ?? null;
  const stateOf = (i: Indicator) => app.assessment?.indicators.find((s) => s.indicator === i)?.state ?? 'not_enough_data';
  const rows = (r: PvtResult): { i: Indicator; label: string; value: string; help: string }[] => [
    { i: 'pvt_mean_rt_ms', label: 'Mean reaction time', value: r.mean_rt_ms === null ? 'No valid response' : `${Math.round(r.mean_rt_ms)} ms`, help: 'A lower value is better.' },
    { i: 'pvt_lapses', label: 'Lapses', value: String(r.lapses), help: `${PVT_LAPSE_MS} ms or more, or no response in ${PVT_TIMEOUT_MS / 1000} s.` },
    { i: 'pvt_false_starts', label: 'False starts', value: String(r.false_starts), help: `Tap before the signal, or below ${PVT_FALSE_START_MS} ms.` },
  ];

  return (
    <Screen back title="PVT-B reaction test" eyebrow="3 minutes. Optional, one time each day.">
      {phase === 'cancelled' ? <Banner tone="warn" text={reason} /> : null}
      {error ? <Banner tone="error" text={errorText(error)} /> : null}
      <Card>
        <T v="h2">How to do the test</T>
        <T v="small" color={C.muted}>
          1. Hold the phone in your hand. Stay on this screen for 3 minutes.
        </T>
        <T v="small" color={C.muted}>
          2. A circle lights up after 1 to 4 seconds. Tap the screen immediately.
        </T>
        <T v="small" color={C.muted}>
          3. A tap before the circle is a false start. If the app goes to the background, the test stops and saves nothing.
        </T>
        <Btn kind="violet" icon="bolt" label={phase === 'saving' ? 'Saving...' : 'Start the test'} onPress={start} disabled={phase === 'saving'} />
      </Card>
      {shown ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h2">{result ? 'Your result' : 'Result of today'}</T>
            <T v="label">{shown.stimuli} stimuli</T>
          </Row>
          {rows(shown).map((r) => (
            <Well key={r.i} style={{ padding: 12, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small" color={C.muted}>
                  {r.label}
                </T>
                <LevelBadge state={stateOf(r.i)} />
              </Row>
              <T style={{ fontFamily: F.monoMedium, fontSize: 26, lineHeight: 32 }}>{r.value}</T>
              <T v="small" color={C.faint}>
                {r.help}
              </T>
            </Well>
          ))}
        </Card>
      ) : null}
      <Disclaimer />
    </Screen>
  );
}
