import { evaluate } from './api';
import type { IsoDate, Level } from './types';

export const MISSION_DAYS = 120;

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function missionLevels(today: IsoDate, missionDay: number): Promise<(Level | null)[]> {
  const days = Math.max(0, Math.min(missionDay, MISSION_DAYS));
  const out: (Level | null)[] = new Array(days + 1).fill(null);
  const BATCH = 12;
  for (let start = 0; start <= days; start += BATCH) {
    const batch = [];
    for (let k = start; k < Math.min(start + BATCH, days + 1); k++) {
      const date = addDays(today, k - missionDay);
      batch.push(
        evaluate(date).then(
          (a) => (out[k] = a.level),
          () => (out[k] = null),
        ),
      );
    }
    await Promise.all(batch);
  }
  return out;
}
