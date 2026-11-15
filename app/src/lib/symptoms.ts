import { getDay } from './api';
import { addDays } from './mission';
import type { DayView, Symptom } from './types';

export async function openSymptoms(day: DayView): Promise<{ symptoms: Symptom[]; carried: boolean }> {
  const check = day.check;
  if (check.answers !== null || check.symptoms.length > 0 || check.red_flags.length > 0) {
    return { symptoms: check.symptoms, carried: false };
  }
  const before = await getDay(addDays(day.date, -1)).catch(() => null);
  const symptoms = before ? before.check.symptoms.map((s) => ({ ...s })) : [];
  return { symptoms, carried: symptoms.length > 0 };
}
