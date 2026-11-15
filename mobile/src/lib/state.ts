import { useSyncExternalStore } from 'react';

import { start } from '../core/session';
import * as api from './api';
import { errorText, toAppError } from './errors';
import type { AppError, Assessment, DayView, RuleCatalog, Settings } from './types';

export type AppState = {
  ready: boolean;
  loading: boolean;
  day: DayView | null;
  assessment: Assessment | null;
  settings: Settings | null;
  catalog: RuleCatalog | null;
  revision: number;
  fatal: AppError | null;
  error: string | null;
  noticeDismissed: boolean;
};

let state: AppState = {
  ready: false,
  loading: false,
  day: null,
  assessment: null,
  settings: null,
  catalog: null,
  revision: 0,
  fatal: null,
  error: null,
  noticeDismissed: false,
};

const listeners = new Set<() => void>();

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const getApp = () => state;

export async function refresh() {
  set({ loading: true });
  try {
    const day = await api.getDay();
    const assessment = await api.evaluate();
    const settings = await api.getSettings();
    set({ day, assessment, settings, error: null, revision: state.revision + 1 });
  } catch (e) {
    const err = toAppError(e);
    if (err.kind === 'rules') set({ fatal: err });
    else set({ error: errorText(err) });
  } finally {
    set({ loading: false });
  }
}

let booting: Promise<void> | null = null;

export function boot() {
  booting ??= (async () => {
    try {
      await start();
      await refresh();
      const catalog = await api.rules().catch(() => null);
      set({ catalog });
    } catch (e) {
      set({ fatal: toAppError(e) });
    } finally {
      set({ ready: true });
    }
  })();
  return booting;
}

export const dismissNotice = () => set({ noticeDismissed: true });
