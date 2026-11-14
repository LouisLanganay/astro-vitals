import { INDICATOR_INFO, RED_FLAG_LABEL, SYMPTOM_LABEL } from './labels';
import type { FiredRule, Indicator } from './types';

/** Short title of a fired rule. The rule file has no title, so it comes from the subject. */
export function ruleTitle(rule: FiredRule): string {
  const s = rule.subject;
  switch (s.type) {
    case 'indicator': {
      const info = INDICATOR_INFO[s.value];
      if (s.value.startsWith('amsler')) return `${info.label}`;
      if (s.value.startsWith('acuity')) return `${info.label} is worse`;
      return `${info.label} is ${info.bad === 'low' ? 'low' : 'high'}`;
    }
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

/** The measured fact behind a rule, in plain words, or null when the rule has no value. */
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

/** Host name of a source URL, for the link text. */
export function sourceLabel(source: string): string {
  try {
    return new URL(source).hostname.replace(/^www\./, '');
  } catch {
    return source;
  }
}

export const isUrl = (source: string) => /^https?:\/\//.test(source);
