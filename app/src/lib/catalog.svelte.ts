import * as api from './api';
import type { Indicator, Level, RuleCatalog, RuleInfo } from './types';

export const catalog = $state<{ value: RuleCatalog | null; failed: boolean }>({ value: null, failed: false });

let started: Promise<void> | null = null;

export function loadCatalog() {
  started ??= api
    .rules()
    .then((c) => {
      catalog.value = c;
    })
    .catch(() => {
      catalog.failed = true;
      started = null;
    });
  return started;
}

export function driftLevel(level: Level): number | null {
  const d = catalog.value?.drift;
  if (!d) return null;
  if (level === 'self_care') return d.self_care;
  if (level === 'tell_cmo') return d.tell_cmo;
  return null;
}

export function thresholdLines(indicator: Indicator, prescription: number | null): { value: number; level: Level }[] {
  return (catalog.value?.rules ?? [])
    .filter((r) => r.kind === 'absolute' && r.indicator === indicator)
    .flatMap((r) => {
      const value = r.threshold ?? (indicator === 'exercise_min' ? prescription : null);
      return value == null ? [] : [{ value, level: r.level }];
    });
}

export const ruleThreshold = (r: RuleInfo) => (r.kind === 'drift' ? (r.threshold ?? driftLevel(r.level)) : r.threshold);
