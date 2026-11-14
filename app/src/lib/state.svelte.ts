import * as api from './api';
import { toAppError } from './errors';
import type { AppError, Assessment, BodyRegion, DayView, Indicator, IsoDate } from './types';

export type Screen =
  | 'home'
  | 'daily_check'
  | 'trends'
  | 'settings'
  | 'export'
  | 'pvt'
  | 'vision'
  | 'body';

export interface Route {
  screen: Screen;
  date: IsoDate | null;
  region: BodyRegion | null;
  indicator: Indicator | null;
}

interface AppState {
  route: Route;
  day: DayView | null;
  assessment: Assessment | null;
  error: AppError | null;
  loading: boolean;
  revision: number;
}

export const app = $state<AppState>({
  route: { screen: 'home', date: null, region: null, indicator: null },
  day: null,
  assessment: null,
  error: null,
  loading: false,
  revision: 0,
});

export function navigate(screen: Screen, params: Partial<Omit<Route, 'screen'>> = {}) {
  app.route = { screen, date: null, region: null, indicator: null, ...params };
}

export async function refresh() {
  app.loading = true;
  try {
    app.day = await api.getDay();
    app.assessment = await api.evaluate();
    app.error = null;
  } catch (e) {
    app.error = toAppError(e);
  } finally {
    app.loading = false;
    app.revision += 1;
  }
}
