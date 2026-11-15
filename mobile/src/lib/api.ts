import { run } from '../core/session';
import type {
  Assessment,
  DailyCheck,
  DayView,
  Indicator,
  IsoDate,
  PacketExport,
  PvtInput,
  PvtResult,
  RuleCatalog,
  ScenarioId,
  ScenarioInfo,
  Series,
  Settings,
  VisionResult,
} from './types';

export const getDay = (date: IsoDate | null = null) => run<DayView>('get_day', { date });

export const saveDailyCheck = (check: DailyCheck) => run<void>('save_daily_check', { check });

export const savePvt = (input: PvtInput) => run<PvtResult>('save_pvt', { input });

export const saveVisionTest = (result: VisionResult) => run<void>('save_vision_test', { result });

export const evaluate = (date: IsoDate | null = null) => run<Assessment>('evaluate', { date });

export const series = (indicator: Indicator) => run<Series>('series', { indicator });

export const exportPacket = (path: string | null = null) =>
  run<PacketExport>('export_packet', { path });

export const loadScenario = (id: ScenarioId) => run<ScenarioInfo>('load_scenario', { id });

export const getSettings = () => run<Settings>('get_settings');

export const setSettings = (settings: Settings) => run<void>('set_settings', { settings });

export const rules = () => run<RuleCatalog>('rules');
