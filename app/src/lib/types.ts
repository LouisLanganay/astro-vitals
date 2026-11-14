export type IsoDate = string;

export const DOCUMENT_VERSION = 1;
export const PACKET_VERSION = 1;
export const BASELINE_DAYS = 14;
export const MIN_PREFLIGHT_DAYS = 7;
export const MEAN_WINDOW_DAYS = 7;
export const VISION_INTERVAL_DAYS = 7;
export const DEFAULT_EXERCISE_MIN = 90;
export const MINUTES_PER_DAY = 1440;
export const SCALE_MAX = 10;
export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 3;
export const FLUID_MAX_L = 15;
export const CARD_WIDTH_MM = 85.6;
export const VIEWING_DISTANCE_CM = 40;
export const LOGMAR_STEP = 0.1;
export const ACUITY_TRIALS_PER_SIZE = 5;
export const ACUITY_MIN_CORRECT = 3;
export const AMSLER_GRID_SIZE = 20;
export const PVT_LAPSE_MS = 355;
export const PVT_FALSE_START_MS = 100;
export const PVT_TIMEOUT_MS = 30000;
export const PVT_DURATION_MS = 180000;
export const PVT_INTERVAL_MIN_MS = 1000;
export const PVT_INTERVAL_MAX_MS = 4000;
export const PACKET_MAX_BYTES = 16384;
export const PACKET_WINDOW_DAYS = 14;

export const LEVELS = ['ok', 'self_care', 'tell_cmo', 'flight_surgeon'] as const;
export type Level = (typeof LEVELS)[number];

export type IndicatorState = 'not_enough_data' | Level;

export const BODY_REGIONS = [
  'head',
  'eyes',
  'neck',
  'chest',
  'abdomen',
  'back',
  'arms',
  'hands',
  'legs',
  'feet',
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export const SYMPTOM_KINDS = [
  'headache',
  'congestion',
  'skin_rash',
  'back_pain',
  'nausea',
  'dizziness',
  'vision_change',
  'other',
] as const;
export type SymptomKind = (typeof SYMPTOM_KINDS)[number];

export const RED_FLAG_KINDS = [
  'chest_pain',
  'fainting',
  'sudden_vision_loss',
  'fever',
  'blood_in_urine',
  'one_sided_swelling',
] as const;
export type RedFlagKind = (typeof RED_FLAG_KINDS)[number];

export type Direction = 'low' | 'high';

export const INDICATORS = [
  'sleep_hours',
  'sleep_quality',
  'mood',
  'stress',
  'tiredness',
  'workload',
  'fluid_l',
  'exercise_min',
  'pvt_mean_rt_ms',
  'pvt_lapses',
  'pvt_false_starts',
  'acuity_left',
  'acuity_right',
  'amsler_left',
  'amsler_right',
] as const;
export type Indicator = (typeof INDICATORS)[number];

export const SCENARIO_IDS = ['healthy', 'sleep_debt', 'vision'] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export type TaskKind = 'daily_check' | 'pvt' | 'vision_test';

export interface Symptom {
  kind: SymptomKind;
  severity: number;
  region: BodyRegion;
  treated: boolean;
  improved: boolean | null;
}

export interface DailyAnswers {
  sleep_start_min: number;
  sleep_end_min: number;
  sleep_quality: number;
  sleep_aid: boolean;
  mood: number;
  stress: number;
  tiredness: number;
  workload: number;
  fluid_l: number;
  exercise_resistive_min: number;
  exercise_aerobic_min: number;
}

export interface DailyCheck {
  date: IsoDate;
  answers: DailyAnswers | null;
  symptoms: Symptom[];
  red_flags: RedFlagKind[];
}

export type PvtTrial =
  | { kind: 'response'; rt_ms: number }
  | { kind: 'premature' }
  | { kind: 'timeout' };

export interface PvtInput {
  date: IsoDate;
  trials: PvtTrial[];
}

export interface PvtResult {
  date: IsoDate;
  stimuli: number;
  mean_rt_ms: number | null;
  lapses: number;
  false_starts: number;
}

export interface Calibration {
  px_per_mm: number;
}

export interface AmslerCell {
  row: number;
  col: number;
}

export interface EyeResult {
  acuity_logmar: number;
  amsler_distortion: boolean;
  amsler_cells: AmslerCell[];
}

export interface VisionResult {
  date: IsoDate;
  left: EyeResult;
  right: EyeResult;
}

export interface Settings {
  launch_date: IsoDate;
  exercise_prescription_min: number;
  calibration: Calibration | null;
}

export interface Document {
  version: number;
  settings: Settings;
  checks: Record<IsoDate, DailyCheck>;
  pvt: Record<IsoDate, PvtResult>;
  vision: Record<IsoDate, VisionResult>;
}

export type RuleSubject =
  | { type: 'indicator'; value: Indicator }
  | { type: 'symptom'; value: SymptomKind }
  | { type: 'red_flag'; value: RedFlagKind };

export interface FiredRule {
  rule_id: string;
  level: Level;
  action: string;
  explanation: string;
  body_region: BodyRegion | null;
  source: string;
  subject: RuleSubject;
  value: number | null;
}

export interface Baseline {
  median: number;
  mad: number;
  days: number;
}

export interface IndicatorStatus {
  indicator: Indicator;
  region: BodyRegion;
  state: IndicatorState;
  value: number | null;
  mean_7d: number | null;
  baseline: Baseline | null;
  drift_score: number | null;
}

export interface RegionStatus {
  region: BodyRegion;
  level: Level;
  symptoms: Symptom[];
  indicators: IndicatorStatus[];
  fired: FiredRule[];
}

export interface Assessment {
  date: IsoDate;
  mission_day: number;
  level: Level;
  fired: FiredRule[];
  indicators: IndicatorStatus[];
  regions: RegionStatus[];
  preflight_days: number;
  drift_enabled: boolean;
}

export interface SeriesPoint {
  date: IsoDate;
  mission_day: number;
  value: number | null;
  mean_7d: number | null;
}

export interface Series {
  indicator: Indicator;
  baseline: Baseline | null;
  points: SeriesPoint[];
}

export interface DueTask {
  kind: TaskKind;
  optional: boolean;
}

export type Notice = { kind: 'data_file_corrupt'; backup_path: string };

export interface MissionStatus {
  today: IsoDate;
  mission_day: number;
  due: DueTask[];
  streak: number;
  notices: Notice[];
}

export interface DayView {
  date: IsoDate;
  mission_day: number;
  check: DailyCheck;
  pvt: PvtResult | null;
  vision: VisionResult | null;
  mission: MissionStatus;
}

export interface PacketIndicator {
  indicator: Indicator;
  values: (number | null)[];
}

export interface IndicatorBaseline {
  indicator: Indicator;
  baseline: Baseline;
}

export interface DatedSymptom {
  date: IsoDate;
  symptom: Symptom;
}

export interface DatedRedFlag {
  date: IsoDate;
  kind: RedFlagKind;
}

export interface Packet {
  version: number;
  date: IsoDate;
  mission_day: number;
  level: Level;
  fired: FiredRule[];
  flagged: PacketIndicator[];
  symptoms: DatedSymptom[];
  red_flags: DatedRedFlag[];
  baselines: IndicatorBaseline[];
}

export interface PacketExport {
  packet: Packet;
  json: string;
  bytes: number;
  path: string | null;
}

export interface ExpectedLevel {
  level: Level;
  first_mission_day: number;
}

export interface ScenarioInfo {
  id: ScenarioId;
  description: string;
  mission_day: number;
  expected: ExpectedLevel[];
}

export interface FieldError {
  field: string;
  message: string;
}

export type AppError =
  | { kind: 'validation'; errors: FieldError[] }
  | { kind: 'rules'; rule_id: string | null; message: string }
  | { kind: 'storage'; message: string }
  | { kind: 'internal'; message: string };
