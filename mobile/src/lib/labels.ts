import type {
  BodyRegion,
  Direction,
  Indicator,
  IndicatorState,
  RedFlagKind,
  ScenarioId,
  SymptomKind,
  TaskKind,
} from './types';

export const STATE_LABEL: Record<IndicatorState, string> = {
  not_enough_data: 'Not enough data',
  ok: 'OK',
  self_care: 'Self-care',
  tell_cmo: 'Tell the CMO',
  flight_surgeon: 'Flight surgeon',
};

export const REGION_LABEL: Record<BodyRegion, string> = {
  head: 'Head',
  eyes: 'Eyes',
  neck: 'Neck',
  chest: 'Chest',
  abdomen: 'Abdomen',
  back: 'Back',
  arms: 'Arms',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
};

export const SYMPTOM_LABEL: Record<SymptomKind, string> = {
  headache: 'Headache',
  congestion: 'Congestion',
  skin_rash: 'Skin rash',
  back_pain: 'Back pain',
  nausea: 'Nausea',
  dizziness: 'Dizziness',
  vision_change: 'Vision change',
  other: 'Other',
};

export const RED_FLAG_LABEL: Record<RedFlagKind, string> = {
  chest_pain: 'Chest pain',
  fainting: 'Fainting',
  sudden_vision_loss: 'Sudden vision loss',
  fever: 'Fever',
  blood_in_urine: 'Blood in urine',
  one_sided_swelling: 'Swelling on one side of the neck or face',
};

export const INDICATOR_INFO: Record<
  Indicator,
  { label: string; unit: string; bad: Direction; region: BodyRegion }
> = {
  sleep_hours: { label: 'Sleep duration', unit: 'h', bad: 'low', region: 'head' },
  sleep_quality: { label: 'Sleep quality', unit: '0-10', bad: 'low', region: 'head' },
  mood: { label: 'Mood', unit: '0-10', bad: 'low', region: 'head' },
  stress: { label: 'Stress', unit: '0-10', bad: 'high', region: 'head' },
  tiredness: { label: 'Tiredness', unit: '0-10', bad: 'high', region: 'head' },
  workload: { label: 'Workload', unit: '0-10', bad: 'high', region: 'head' },
  fluid_l: { label: 'Fluid intake', unit: 'L', bad: 'low', region: 'abdomen' },
  exercise_min: { label: 'Exercise', unit: 'min', bad: 'low', region: 'legs' },
  pvt_mean_rt_ms: { label: 'PVT-B mean reaction time', unit: 'ms', bad: 'high', region: 'head' },
  pvt_lapses: { label: 'PVT-B lapses', unit: 'count', bad: 'high', region: 'head' },
  pvt_false_starts: { label: 'PVT-B false starts', unit: 'count', bad: 'high', region: 'head' },
  acuity_left: { label: 'Near acuity, left eye', unit: 'logMAR', bad: 'high', region: 'eyes' },
  acuity_right: { label: 'Near acuity, right eye', unit: 'logMAR', bad: 'high', region: 'eyes' },
  amsler_left: { label: 'Amsler distortion, left eye', unit: '0-1', bad: 'high', region: 'eyes' },
  amsler_right: { label: 'Amsler distortion, right eye', unit: '0-1', bad: 'high', region: 'eyes' },
};

export const TASK_LABEL: Record<TaskKind, string> = {
  daily_check: 'Daily check',
  pvt: 'PVT-B reaction test',
  vision_test: 'Vision test',
};

export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  healthy: 'Healthy',
  sleep_debt: 'Sleep debt',
  vision: 'Vision change',
};
