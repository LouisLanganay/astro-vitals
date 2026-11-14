/**
 * Development mock of the Tauri commands, so the front renders in a normal browser.
 * main.ts loads it only in dev mode and outside Tauri: it is not in the production build.
 * The rules below are a small copy of rules/rules.toml, enough to show each level.
 */
import { mockIPC } from '@tauri-apps/api/mocks';

import { INDICATOR_INFO } from '../lib/labels';
import {
  BASELINE_DAYS,
  BODY_REGIONS,
  DEFAULT_EXERCISE_MIN,
  INDICATORS,
  LEVELS,
  MIN_PREFLIGHT_DAYS,
  PACKET_VERSION,
  PVT_FALSE_START_MS,
  PVT_LAPSE_MS,
  type Assessment,
  type BodyRegion,
  type DailyCheck,
  type DayView,
  type Document,
  type FiredRule,
  type Indicator,
  type IndicatorState,
  type IndicatorStatus,
  type IsoDate,
  type Level,
  type Packet,
  type PvtInput,
  type PvtResult,
  type ScenarioId,
  type ScenarioInfo,
  type Series,
  type Settings,
  type Symptom,
  type VisionResult,
  type Baseline,
} from '../lib/types';

const MISSION_DAYS = 120;
const DEMO_DAY = 62;

/* ---------- dates ---------- */
const toDate = (iso: IsoDate) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: IsoDate, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
};
const diffDays = (a: IsoDate, b: IsoDate) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / 864e5);
const localToday = () => {
  const d = new Date();
  return toIso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
};

/* ---------- deterministic random ---------- */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- store ---------- */
const TODAY = localToday();
let doc: Document;

function generate(id: ScenarioId, todayDay: number): Document {
  const launch = addDays(TODAY, -todayDay);
  const r = rng(2026);
  const range = (lo: number, hi: number) => lo + (hi - lo) * r();
  const scale = (v: number) => Math.max(0, Math.min(10, Math.floor(v)));
  const d: Document = {
    version: 1,
    settings: { launch_date: launch, exercise_prescription_min: DEFAULT_EXERCISE_MIN, calibration: null },
    checks: {},
    pvt: {},
    vision: {},
  };
  for (let day = -BASELINE_DAYS; day < todayDay; day++) {
    const date = addDays(launch, day);
    const debt = id === 'sleep_debt' ? Math.min(2.9, 0.35 * Math.max(0, Math.min(4, day - 39)) + 0.03 * Math.max(0, day - 43)) : 0;
    const strain = Math.max(0, debt - 1.6);
    const start = 1330 + Math.floor(range(0, 41));
    const sleepMin = Math.round((7.5 - debt + range(-0.25, 0.25)) * 60);
    const symptoms: Symptom[] = [];
    if (id === 'sleep_debt' && day >= 50) {
      const treated = day >= 53;
      symptoms.push({ kind: 'headache', severity: day < 57 ? 1 : 2, region: 'head', treated, improved: treated ? day < 60 : null });
    }
    d.checks[date] = {
      date,
      answers: {
        sleep_start_min: start,
        sleep_end_min: (start + sleepMin) % 1440,
        sleep_quality: scale(7 - debt + range(0, 2)),
        sleep_aid: debt > 2,
        mood: scale(7 - 2 * strain + range(0, 2)),
        stress: scale(2 + 1.5 * strain + range(0, 2)),
        tiredness: scale(2 + 2.5 * strain + range(0, 2)),
        workload: scale(4 + range(0, 3)),
        fluid_l: Math.round((2.8 + range(0, 0.6)) * 10) / 10,
        exercise_resistive_min: 50 + Math.floor(range(0, 16)),
        exercise_aerobic_min: 45 + Math.floor(range(0, 16)),
      },
      symptoms,
      red_flags: [],
    };
    const lapses = Math.max(0, Math.round(range(0, 2) + debt * 2.2));
    d.pvt[date] = {
      date,
      stimuli: 60,
      mean_rt_ms: Math.round(240 + range(-12, 12) + debt * 28),
      lapses,
      false_starts: r() < 0.15 ? 1 : 0,
    };
    if (day === -13 || day === -6 || (day >= 0 && day % 7 === 0)) {
      const distorted = id === 'vision' && day >= 70;
      d.vision[date] = {
        date,
        left: { acuity_logmar: r() < 0.25 ? 0.1 : 0, amsler_distortion: false, amsler_cells: [] },
        right: {
          acuity_logmar: r() < 0.25 ? 0.1 : 0,
          amsler_distortion: distorted,
          amsler_cells: distorted ? [{ row: 9, col: 10 }, { row: 10, col: 10 }] : [],
        },
      };
    }
  }
  return d;
}

doc = generate('sleep_debt', DEMO_DAY);

/* ---------- values and baselines ---------- */
function value(ind: Indicator, date: IsoDate): number | null {
  const a = doc.checks[date]?.answers;
  const p = doc.pvt[date];
  const v = doc.vision[date];
  switch (ind) {
    case 'sleep_hours': {
      if (!a) return null;
      let m = a.sleep_end_min - a.sleep_start_min;
      if (m <= 0) m += 1440;
      return m / 60;
    }
    case 'exercise_min':
      return a ? a.exercise_resistive_min + a.exercise_aerobic_min : null;
    case 'sleep_quality':
    case 'mood':
    case 'stress':
    case 'tiredness':
    case 'workload':
    case 'fluid_l':
      return a ? a[ind] : null;
    case 'pvt_mean_rt_ms':
      return p?.mean_rt_ms ?? null;
    case 'pvt_lapses':
      return p ? p.lapses : null;
    case 'pvt_false_starts':
      return p ? p.false_starts : null;
    case 'acuity_left':
      return v ? v.left.acuity_logmar : null;
    case 'acuity_right':
      return v ? v.right.acuity_logmar : null;
    case 'amsler_left':
      return v ? Number(v.left.amsler_distortion) : null;
    case 'amsler_right':
      return v ? Number(v.right.amsler_distortion) : null;
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

function preflightDays(): number {
  return Object.keys(doc.checks).filter((d) => d < doc.settings.launch_date).length;
}

function baseline(ind: Indicator): Baseline | null {
  const xs: number[] = [];
  for (let k = -BASELINE_DAYS; k < 0; k++) {
    const x = value(ind, addDays(doc.settings.launch_date, k));
    if (x != null) xs.push(x);
  }
  if (!xs.length) return null;
  const m = median(xs);
  return { median: m, mad: median(xs.map((x) => Math.abs(x - m))), days: xs.length };
}

function windowMean(ind: Indicator, date: IsoDate, days: number, minDays: number): number | null {
  const xs: number[] = [];
  for (let k = 0; k < days; k++) {
    const x = value(ind, addDays(date, -k));
    if (x != null) xs.push(x);
  }
  return xs.length >= minDays ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

const MIN_SCALE: Partial<Record<Indicator, number>> = { sleep_hours: 0.25, fluid_l: 0.15, exercise_min: 8, pvt_mean_rt_ms: 8, pvt_lapses: 1 };

function driftScore(ind: Indicator, date: IsoDate): number | null {
  const b = baseline(ind);
  if (!b || preflightDays() < MIN_PREFLIGHT_DAYS || b.days < MIN_PREFLIGHT_DAYS) return null;
  const m = windowMean(ind, date, 7, 3);
  if (m == null) return null;
  return (m - b.median) / Math.max(1.4826 * b.mad, MIN_SCALE[ind] ?? 0.75);
}

/* ---------- rules: a subset of rules/rules.toml ---------- */
const SRC = {
  sleep: 'https://doi.org/10.1093/sleep/zsac006',
  mars500: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0093298',
  urine: 'https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/',
  fitness: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/',
  symptom: 'https://www.dovepress.com/incidence-of-clinical-symptoms-during-long-duration-orbital-spacefligh-peer-reviewed-article-IJGM',
  sans: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/',
};

interface Rule {
  id: string;
  ind: Indicator;
  kind: 'absolute' | 'drift' | 'amsler';
  limit: number;
  window: number;
  min: number;
  level: Level;
  region: BodyRegion;
  action: string;
  explanation: string;
  source: string;
}

const PVT_ACTION_1 = 'Check your sleep for the last nights. Take a break before a precise task.';
const PVT_ACTION_2 = 'Tell the Crew Medical Officer. Avoid critical tasks until you sleep more.';
const RULES: Rule[] = [
  { id: 'sleep_7d_below_6h', ind: 'sleep_hours', kind: 'absolute', limit: 6, window: 7, min: 5, level: 'self_care', region: 'head',
    action: 'Protect your next sleep period. Dim the light 1 hour before. Plan a nap if the schedule permits.',
    explanation: 'Your mean sleep for 7 days is below 6 hours. Sleep below 6 hours slows reaction time.', source: SRC.sleep },
  { id: 'sleep_3d_below_5h', ind: 'sleep_hours', kind: 'absolute', limit: 5, window: 3, min: 3, level: 'tell_cmo', region: 'head',
    action: 'Tell the Crew Medical Officer. Avoid critical tasks until you sleep more.',
    explanation: 'Your mean sleep for 3 days is below 5 hours. Sleep below 5 hours increases exhaustion.', source: SRC.sleep },
  { id: 'pvt_lapses_drift_self_care', ind: 'pvt_lapses', kind: 'drift', limit: 2, window: 7, min: 3, level: 'self_care', region: 'head',
    action: PVT_ACTION_1, explanation: 'You have more lapses than in your pre-flight baseline. A lapse is a reaction time of 355 ms or more.', source: SRC.sleep },
  { id: 'pvt_lapses_drift_tell_cmo', ind: 'pvt_lapses', kind: 'drift', limit: 3, window: 7, min: 3, level: 'tell_cmo', region: 'head',
    action: PVT_ACTION_2, explanation: 'You have many more lapses than in your pre-flight baseline.', source: SRC.sleep },
  { id: 'pvt_mean_rt_drift_self_care', ind: 'pvt_mean_rt_ms', kind: 'drift', limit: 2, window: 7, min: 3, level: 'self_care', region: 'head',
    action: PVT_ACTION_1, explanation: 'Your mean reaction time is slower than your pre-flight baseline.', source: SRC.sleep },
  { id: 'pvt_mean_rt_drift_tell_cmo', ind: 'pvt_mean_rt_ms', kind: 'drift', limit: 3, window: 7, min: 3, level: 'tell_cmo', region: 'head',
    action: PVT_ACTION_2, explanation: 'Your mean reaction time is much slower than your pre-flight baseline.', source: SRC.sleep },
  { id: 'mood_drift_7d', ind: 'mood', kind: 'drift', limit: 2, window: 7, min: 3, level: 'self_care', region: 'head',
    action: 'Plan a private call home, a crew activity, or time for your journal.',
    explanation: 'Your mood for 7 days is lower than your pre-flight baseline. Isolation can lower mood on long missions.', source: SRC.mars500 },
  { id: 'stress_drift_7d', ind: 'stress', kind: 'drift', limit: 2, window: 7, min: 3, level: 'self_care', region: 'head',
    action: 'Plan a rest period. Talk about the workload in the next crew debrief.',
    explanation: 'Your stress for 7 days is higher than your pre-flight baseline.', source: SRC.mars500 },
  { id: 'tiredness_drift_7d', ind: 'tiredness', kind: 'drift', limit: 2, window: 7, min: 3, level: 'self_care', region: 'head',
    action: 'Protect your next sleep period. Check your exercise and fluid intake.',
    explanation: 'Your tiredness for 7 days is higher than your pre-flight baseline.', source: SRC.mars500 },
  { id: 'fluid_3d_below_2_5l', ind: 'fluid_l', kind: 'absolute', limit: 2.5, window: 3, min: 3, level: 'self_care', region: 'abdomen',
    action: 'Drink more today. Aim for 2.5 L or more each day.',
    explanation: 'Your mean fluid intake for 3 days is below 2.5 L. In microgravity, urinary calcium increases, and low fluid increases the risk of kidney stones.', source: SRC.urine },
  { id: 'exercise_7d_below_prescription', ind: 'exercise_min', kind: 'absolute', limit: -1, window: 7, min: 7, level: 'self_care', region: 'legs',
    action: 'Do your full exercise session today. Resistive exercise protects bone and muscle.',
    explanation: 'Your mean exercise for 7 days is below your prescription.', source: SRC.fitness },
  { id: 'amsler_right_distortion', ind: 'amsler_right', kind: 'amsler', limit: 1, window: 0, min: 1, level: 'tell_cmo', region: 'eyes',
    action: 'Tell the Crew Medical Officer. Do the vision test again in 7 days.',
    explanation: 'The last Amsler grid test of the right eye shows a new distortion. Your last pre-flight test is the reference.', source: SRC.sans },
  { id: 'amsler_right_distortion_2_tests', ind: 'amsler_right', kind: 'amsler', limit: 2, window: 0, min: 1, level: 'flight_surgeon', region: 'eyes',
    action: 'Export the summary packet for the flight surgeon. Tell the Crew Medical Officer.',
    explanation: 'The last 2 Amsler grid tests of the right eye show a new distortion.', source: SRC.sans },
];

const rank = (l: Level) => LEVELS.indexOf(l);
const maxLevel = (ls: Level[]): Level => ls.reduce<Level>((a, b) => (rank(b) > rank(a) ? b : a), 'ok');

/** Returns [fires, value] or null when the rule has not enough data. */
function check(rule: Rule, date: IsoDate): [boolean, number] | null {
  const low = INDICATOR_INFO[rule.ind].bad === 'low';
  if (rule.kind === 'absolute') {
    const limit = rule.limit < 0 ? doc.settings.exercise_prescription_min : rule.limit;
    const m = windowMean(rule.ind, date, rule.window, rule.min);
    if (m == null) return null;
    return [low ? m < limit : m >= limit, m];
  }
  if (rule.kind === 'drift') {
    const s = driftScore(rule.ind, date);
    if (s == null) return null;
    return [(low ? -s : s) >= rule.limit - 1e-9, s];
  }
  const tests = Object.keys(doc.vision)
    .filter((d) => d >= doc.settings.launch_date && d <= date)
    .sort()
    .slice(-rule.limit);
  if (tests.length < rule.limit) return null;
  const all = tests.every((d) => value(rule.ind, d) === 1);
  return [all, 1];
}

function symptomRules(date: IsoDate): FiredRule[] {
  const out: FiredRule[] = [];
  const today = doc.checks[date];
  if (!today) return out;
  for (const s of today.symptoms) {
    let n = 0;
    while (doc.checks[addDays(date, -n)]?.symptoms.some((x) => x.kind === s.kind)) n++;
    if (n > 7) {
      out.push({ rule_id: 'symptom_longer_than_7_days', level: 'tell_cmo', action: 'Tell the Crew Medical Officer.',
        explanation: 'This symptom is present for more than 7 consecutive days. On the ISS, a symptom of more than 1 week is a notable event.',
        body_region: s.region, source: SRC.symptom, subject: { type: 'symptom', value: s.kind }, value: n });
    }
    if (s.treated && s.improved === false) {
      out.push({ rule_id: 'symptom_treated_not_improved', level: 'tell_cmo',
        action: 'Tell the Crew Medical Officer. Do not repeat the treatment without advice.',
        explanation: 'You treated this symptom and it did not improve. No response to treatment is a notable event.',
        body_region: s.region, source: SRC.symptom, subject: { type: 'symptom', value: s.kind }, value: null });
    }
  }
  for (const f of today.red_flags) {
    out.push({ rule_id: `red_flag_${f}`, level: 'flight_surgeon',
      action: 'Stop your task. Tell the Crew Medical Officer immediately. Export the summary packet for the flight surgeon.',
      explanation: 'This sign is a red flag. It needs a medical assessment immediately.',
      body_region: f === 'sudden_vision_loss' ? 'eyes' : f === 'chest_pain' ? 'chest' : f === 'blood_in_urine' ? 'abdomen' : f === 'one_sided_swelling' ? 'neck' : 'head',
      source: 'https://www.nasa.gov/wp-content/uploads/2023/07/ochmo-tb-033-spaceflight-experience-medical-care-rev-c.pdf',
      subject: { type: 'red_flag', value: f }, value: null });
  }
  return out;
}

function evaluate(date: IsoDate = TODAY): Assessment {
  const fired: FiredRule[] = [];
  const states = new Map<Indicator, IndicatorState>();
  for (const rule of RULES) {
    const res = check(rule, date);
    const prev = states.get(rule.ind) ?? 'not_enough_data';
    if (!res) {
      states.set(rule.ind, prev);
      continue;
    }
    const [fires, v] = res;
    const level: Level = fires ? rule.level : 'ok';
    if (prev === 'not_enough_data' || rank(level) > rank(prev)) states.set(rule.ind, level);
    if (fires) {
      fired.push({ rule_id: rule.id, level: rule.level, action: rule.action, explanation: rule.explanation,
        body_region: rule.region, source: rule.source, subject: { type: 'indicator', value: rule.ind }, value: v });
    }
  }
  // One indicator, two drift levels: the mock keeps the higher one only.
  const kept = fired.filter((f) => !fired.some((g) => g !== f && g.rule_id.includes('drift') && f.rule_id.includes('drift')
    && g.subject.value === f.subject.value && rank(g.level) > rank(f.level)));
  kept.push(...symptomRules(date));
  kept.sort((a, b) => rank(b.level) - rank(a.level));

  const indicators: IndicatorStatus[] = INDICATORS.map((ind) => ({
    indicator: ind,
    region: INDICATOR_INFO[ind].region,
    state: states.get(ind) ?? (windowMean(ind, date, 7, 1) == null ? 'not_enough_data' : 'ok'),
    value: value(ind, date),
    mean_7d: windowMean(ind, date, 7, 1),
    baseline: baseline(ind),
    drift_score: driftScore(ind, date),
  }));
  const symptoms = doc.checks[date]?.symptoms ?? [];
  const regions = BODY_REGIONS.map((region) => {
    const rf = kept.filter((f) => f.body_region === region);
    return {
      region,
      level: maxLevel(rf.map((f) => f.level)),
      symptoms: symptoms.filter((s) => s.region === region),
      indicators: indicators.filter((i) => i.region === region),
      fired: rf,
    };
  });
  const pre = preflightDays();
  return {
    date,
    mission_day: diffDays(date, doc.settings.launch_date),
    level: maxLevel(kept.map((f) => f.level)),
    fired: kept,
    indicators,
    regions,
    preflight_days: pre,
    drift_enabled: pre >= MIN_PREFLIGHT_DAYS,
  };
}

/* ---------- day view ---------- */
const complete = (date: IsoDate) => doc.checks[date]?.answers != null;

function getDay(date: IsoDate = TODAY): DayView {
  const due: DayView['mission']['due'] = [];
  if (!complete(date)) due.push({ kind: 'daily_check', optional: false });
  if (!doc.pvt[date]) due.push({ kind: 'pvt', optional: true });
  const last = Object.keys(doc.vision).filter((d) => d <= date).sort().pop();
  if (!last || diffDays(date, last) >= 7) due.push({ kind: 'vision_test', optional: false });
  let streak = 0;
  let d = complete(date) ? date : addDays(date, -1);
  while (complete(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return {
    date,
    mission_day: diffDays(date, doc.settings.launch_date),
    check: doc.checks[date] ?? { date, answers: null, symptoms: [], red_flags: [] },
    pvt: doc.pvt[date] ?? null,
    vision: doc.vision[date] ?? null,
    mission: { today: date, mission_day: diffDays(date, doc.settings.launch_date), due, streak, notices: [] },
  };
}

function series(ind: Indicator): Series {
  const points: Series['points'] = [];
  const first = Object.keys(doc.checks).sort()[0] ?? TODAY;
  for (let d = first; d <= TODAY; d = addDays(d, 1)) {
    points.push({ date: d, mission_day: diffDays(d, doc.settings.launch_date), value: value(ind, d), mean_7d: windowMean(ind, d, 7, 1) });
  }
  return { indicator: ind, baseline: baseline(ind), points };
}

function scorePvt(input: PvtInput): PvtResult {
  const rts = input.trials.flatMap((t) => (t.kind === 'response' ? [t.rt_ms] : []));
  const valid = rts.filter((x) => x >= PVT_FALSE_START_MS);
  const falseStarts = rts.length - valid.length + input.trials.filter((t) => t.kind === 'premature').length;
  const timeouts = input.trials.filter((t) => t.kind === 'timeout').length;
  return {
    date: input.date,
    stimuli: valid.length + timeouts,
    mean_rt_ms: valid.length ? Math.round(valid.reduce((s, x) => s + x, 0) / valid.length) : null,
    lapses: valid.filter((x) => x >= PVT_LAPSE_MS).length + timeouts,
    false_starts: falseStarts,
  };
}

function packet(path: string | null) {
  const a = evaluate();
  const window = Array.from({ length: 14 }, (_, k) => addDays(TODAY, k - 13));
  const flaggedInd = [...new Set(a.fired.flatMap((f) => (f.subject.type === 'indicator' ? [f.subject.value] : [])))];
  const p: Packet = {
    version: PACKET_VERSION,
    date: TODAY,
    mission_day: a.mission_day,
    level: a.level,
    fired: a.fired,
    flagged: flaggedInd.map((indicator) => ({ indicator, values: window.map((d) => value(indicator, d)) })),
    symptoms: window.flatMap((date) => (doc.checks[date]?.symptoms ?? []).map((symptom) => ({ date, symptom }))),
    red_flags: window.flatMap((date) => (doc.checks[date]?.red_flags ?? []).map((kind) => ({ date, kind }))),
    baselines: INDICATORS.flatMap((indicator) => {
      const b = baseline(indicator);
      return b ? [{ indicator, baseline: b }] : [];
    }),
  };
  const json = JSON.stringify(p);
  return { packet: p, json, bytes: new TextEncoder().encode(json).length, path };
}

const SCENARIOS: Record<ScenarioId, Omit<ScenarioInfo, 'id' | 'mission_day'>> = {
  healthy: { description: 'All indicators stay near the pre-flight baseline. The level is ok on each day.', expected: [{ level: 'ok', first_mission_day: 0 }] },
  sleep_debt: {
    description: 'Sleep decreases from mission day 40. A headache starts on mission day 50 and continues.',
    expected: [{ level: 'ok', first_mission_day: 0 }, { level: 'self_care', first_mission_day: 50 }, { level: 'tell_cmo', first_mission_day: 57 }],
  },
  vision: {
    description: 'The Amsler grid of the right eye shows distortion in each weekly test from week 10 (mission day 70).',
    expected: [{ level: 'ok', first_mission_day: 0 }, { level: 'tell_cmo', first_mission_day: 70 }, { level: 'flight_surgeon', first_mission_day: 77 }],
  },
};

/* ---------- IPC ---------- */
type Args = Record<string, unknown>;
const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));

mockIPC((cmd, payload) => {
  const args = (payload ?? {}) as Args;
  switch (cmd) {
    case 'get_day':
      return delay(getDay((args.date as IsoDate | null) ?? undefined));
    case 'evaluate':
      return delay(evaluate((args.date as IsoDate | null) ?? undefined));
    case 'series':
      return delay(series(args.indicator as Indicator));
    case 'save_daily_check': {
      const c = args.check as DailyCheck;
      doc.checks[c.date] = structuredClone(c);
      return delay(null);
    }
    case 'save_pvt': {
      const r = scorePvt(args.input as PvtInput);
      doc.pvt[r.date] = r;
      return delay(r);
    }
    case 'save_vision_test': {
      const v = args.result as VisionResult;
      doc.vision[v.date] = structuredClone(v);
      return delay(null);
    }
    case 'export_packet':
      return delay(packet((args.path as string | null) ?? null));
    case 'load_scenario': {
      const id = args.id as ScenarioId;
      const calibration = doc.settings.calibration;
      doc = generate(id, MISSION_DAYS);
      doc.settings.calibration = calibration;
      return delay({ id, mission_day: MISSION_DAYS, ...SCENARIOS[id] });
    }
    case 'get_settings':
      return delay(structuredClone(doc.settings));
    case 'set_settings':
      doc.settings = structuredClone(args.settings as Settings);
      return delay(null);
    case 'plugin:dialog|save':
      return delay('/home/crew/astro-vitals-packet.json');
    default:
      return Promise.reject({ kind: 'internal', message: `The dev mock does not know the command ${cmd}.` });
  }
});

console.info('[dev] Tauri IPC is mocked: dev/mock.ts');
