import type { Indicator, Level } from '../../lib/types';

/**
 * Absolute rule thresholds, drawn as dotted lines on the trend charts.
 * The API does not expose the rule file, so this mirrors rules/rules.toml.
 * `prescription` means the exercise prescription from the settings.
 */
export const THRESHOLDS: Partial<Record<Indicator, { value: number | 'prescription'; level: Level }[]>> = {
  sleep_hours: [
    { value: 6, level: 'self_care' },
    { value: 5, level: 'tell_cmo' },
  ],
  fluid_l: [{ value: 2.5, level: 'self_care' }],
  exercise_min: [{ value: 'prescription', level: 'self_care' }],
};

/** Drift score levels, from the [drift] table of rules/rules.toml. */
export const DRIFT_LEVELS = { self_care: 2, tell_cmo: 3 } as const;

/** Indicators measured once a week, by the vision test. They show as dots and a line. */
export const WEEKLY: readonly Indicator[] = ['acuity_left', 'acuity_right', 'amsler_left', 'amsler_right'];
