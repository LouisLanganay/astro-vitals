import { INDICATOR_INFO, RED_FLAG_LABEL, SYMPTOM_LABEL } from './labels';
import type { FiredRule, Indicator } from './types';

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
