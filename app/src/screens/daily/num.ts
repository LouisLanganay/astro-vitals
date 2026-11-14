import { MINUTES_PER_DAY } from '../../lib/types';

export const num = (n: number) => String(+n.toFixed(2));

export const minutesError = (v: number | null) =>
  v == null
    ? 'Enter a value.'
    : Number.isInteger(v) && v >= 0 && v <= MINUTES_PER_DAY
      ? null
      : `Enter a whole number from 0 to ${MINUTES_PER_DAY}.`;
