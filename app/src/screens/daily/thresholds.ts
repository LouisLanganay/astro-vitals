import type { Indicator, Level } from '../../lib/types';

export const THRESHOLDS: Partial<Record<Indicator, { value: number | 'prescription'; level: Level }[]>> = {
  sleep_hours: [
    { value: 6, level: 'self_care' },
    { value: 5, level: 'tell_cmo' },
  ],
  fluid_l: [{ value: 2.5, level: 'self_care' }],
  exercise_min: [{ value: 'prescription', level: 'self_care' }],
};

export const DRIFT_LEVELS = { self_care: 2, tell_cmo: 3 } as const;

export const WEEKLY: readonly Indicator[] = ['acuity_left', 'acuity_right', 'amsler_left', 'amsler_right'];
