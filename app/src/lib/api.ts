import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

import type {
  Assessment,
  DailyCheck,
  DayView,
  Indicator,
  IsoDate,
  PacketExport,
  PvtInput,
  PvtResult,
  ScenarioId,
  ScenarioInfo,
  Series,
  Settings,
  VisionResult,
} from './types';

export const getDay = (date: IsoDate | null = null) => invoke<DayView>('get_day', { date });

export const saveDailyCheck = (check: DailyCheck) => invoke<void>('save_daily_check', { check });

export const savePvt = (input: PvtInput) => invoke<PvtResult>('save_pvt', { input });

export const saveVisionTest = (result: VisionResult) =>
  invoke<void>('save_vision_test', { result });

export const evaluate = (date: IsoDate | null = null) => invoke<Assessment>('evaluate', { date });

export const series = (indicator: Indicator) => invoke<Series>('series', { indicator });

export const exportPacket = (path: string | null = null) =>
  invoke<PacketExport>('export_packet', { path });

export const loadScenario = (id: ScenarioId) => invoke<ScenarioInfo>('load_scenario', { id });

export const getSettings = () => invoke<Settings>('get_settings');

export const setSettings = (settings: Settings) => invoke<void>('set_settings', { settings });

export const pickExportPath = (defaultName: string) =>
  save({ defaultPath: defaultName, filters: [{ name: 'JSON', extensions: ['json'] }] });
