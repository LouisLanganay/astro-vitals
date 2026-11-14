import { INDICATOR_INFO, RED_FLAG_LABEL, SYMPTOM_LABEL } from './labels';
import { ruleThreshold } from './catalog.svelte';
import type { FiredRule, Indicator, RedFlagKind, RuleInfo } from './types';

const INDICATOR_TITLE: Record<Indicator, string> = {
  sleep_hours: 'Short sleep',
  sleep_quality: 'Poor sleep quality',
  mood: 'Mood below your baseline',
  stress: 'Stress above your baseline',
  tiredness: 'Tiredness above your baseline',
  workload: 'High workload',
  fluid_l: 'Low fluid intake',
  exercise_min: 'Exercise under the prescription',
  pvt_mean_rt_ms: 'Slower reaction time',
  pvt_lapses: 'More lapses on the reaction test',
  pvt_false_starts: 'More false starts on the reaction test',
  acuity_left: 'Near acuity is worse, left eye',
  acuity_right: 'Near acuity is worse, right eye',
  amsler_left: 'Distortion on the Amsler grid, left eye',
  amsler_right: 'Distortion on the Amsler grid, right eye',
};

export function ruleTitle(rule: FiredRule): string {
  const s = rule.subject;
  switch (s.type) {
    case 'indicator':
      return INDICATOR_TITLE[s.value];
    case 'symptom':
      return SYMPTOM_LABEL[s.value];
    case 'red_flag':
      return `Red flag: ${RED_FLAG_LABEL[s.value].toLowerCase()}`;
  }
}

export function formatValue(indicator: Indicator, value: number): string {
  const unit = INDICATOR_INFO[indicator].unit;
  if (unit === '0-10') return `${round(value, 1)} / 10`;
  if (unit === 'count' || unit === '0-1') return `${round(value, 1)}`;
  return `${round(value, unit === 'ms' || unit === 'min' ? 0 : 1)} ${unit}`;
}

export function round(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function ruleFact(rule: FiredRule): string | null {
  if (rule.value == null) return null;
  const s = rule.subject;
  if (s.type !== 'indicator') return `${round(rule.value, 0)} days`;
  if (rule.rule_id.includes('drift')) {
    return `drift score ${round(Math.abs(rule.value), 1)} from your baseline`;
  }
  if (s.value.startsWith('amsler')) return 'distortion on the Amsler grid';
  if (s.value.startsWith('acuity')) return `acuity ${round(rule.value, 1)} logMAR`;
  return `mean ${formatValue(s.value, rule.value)}`;
}

export function sourceLabel(source: string): string {
  try {
    return new URL(source).hostname.replace(/^www\./, '');
  } catch {
    return source;
  }
}

export const isUrl = (source: string) => /^https?:\/\//.test(source);

const isIndicator = (name: string): name is Indicator => name in INDICATOR_TITLE;

export function catalogTitle(r: RuleInfo): string {
  if (r.kind === 'red_flag') return `Red flag: ${(RED_FLAG_LABEL[r.indicator as RedFlagKind] ?? r.indicator).toLowerCase()}`;
  if (r.kind === 'symptom_duration') return 'A symptom that lasts';
  if (r.kind === 'symptom_recurrence') return 'A symptom that comes back';
  if (r.kind === 'symptom_unresolved') return 'A treated symptom that does not improve';
  return isIndicator(r.indicator) ? INDICATOR_TITLE[r.indicator] : r.indicator;
}

export function catalogCondition(r: RuleInfo, prescription: number | null): string {
  const t = ruleThreshold(r);
  const days = (n: number | null) => (n == null ? '' : ` for ${n} days`);
  const data = r.min_days == null ? '' : `, ${r.min_days} days with data minimum`;
  switch (r.kind) {
    case 'absolute': {
      if (!isIndicator(r.indicator)) return '';
      const dir = INDICATOR_INFO[r.indicator].bad === 'high' ? 'above' : 'below';
      const limit = t == null ? (prescription == null ? 'the prescription' : `the prescription, ${prescription} min`) : formatValue(r.indicator, t);
      return `Mean ${dir} ${limit}${days(r.window_days)}${data}`;
    }
    case 'drift': {
      const run = r.sustain_days == null ? '' : `, on ${r.sustain_days} days in sequence`;
      return `Drift score ${t == null ? '' : `${round(t, 0)} or more `}on the ${r.window_days ?? 7}-day mean${run}${data}`;
    }
    case 'symptom_duration':
      return `The same symptom on more than ${round(t ?? 0, 0)} days in sequence`;
    case 'symptom_recurrence':
      return `${round(t ?? 0, 0)} episodes or more of the same symptom in ${r.window_days ?? 30} days`;
    case 'symptom_unresolved':
      return 'You treated the symptom and it did not improve';
    case 'vision_change':
      return r.indicator.startsWith('acuity')
        ? `Acuity ${round(t ?? 0, 1)} logMAR or more worse than before the flight`
        : 'A new distortion on the Amsler grid';
    case 'vision_persistent':
      return r.indicator.startsWith('acuity')
        ? `Acuity ${round(t ?? 0, 1)} logMAR or more worse on 2 tests in sequence`
        : 'A distortion on the Amsler grid on 2 tests in sequence';
    case 'red_flag':
      return 'You set this sign in the daily check';
  }
}
