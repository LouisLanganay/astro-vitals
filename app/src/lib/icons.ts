import type { IndicatorState } from './types';

export const ICON = {
  home:
    '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/>',
  check:
    '<rect x="5" y="4.5" width="14" height="16.5" rx="3"/><path d="M9.2 4.5V3.2h5.6v1.3M8.8 12.8l2.2 2.2 4.2-4.4"/>',
  body:
    '<circle cx="12" cy="4.9" r="2.3"/><path d="M6.5 9.4 12 8.2l5.5 1.2M12 8.2v6.6M9.3 21.2l2.7-6.4 2.7 6.4"/>',
  trends:
    '<path d="M3.5 17.5 8.6 12l4 3.4 7.4-8.4"/><path d="M15.6 7H20v4.4"/>',
  tests:
    '<circle cx="12" cy="13.4" r="7.6"/><path d="M12 13.4V9.4M9.6 2.8h4.8M18.3 6.6l1.3-1.3"/>',
  export:
    '<path d="M12 14.8V3.6M7.6 7.9 12 3.6l4.4 4.3"/><path d="M5 13v4.6A2.4 2.4 0 0 0 7.4 20h9.2a2.4 2.4 0 0 0 2.4-2.4V13"/>',
  rules:
    '<path d="M9 6.5h10.5M9 12h10.5M9 17.5h10.5"/><path d="M4.6 6.5h.1M4.6 12h.1M4.6 17.5h.1" stroke-width="2.6"/>',
  eye:
    '<path d="M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  bolt:
    '<path d="M13.2 2.6 5.2 13.4h6.1l-1.1 8 8.1-10.9h-6.2Z"/>',
  moon:
    '<path d="M19.8 14.6A8.2 8.2 0 0 1 9.4 4.2a8.2 8.2 0 1 0 10.4 10.4Z"/>',
  drop:
    '<path d="M12 3.2s6.4 6.9 6.4 11.3a6.4 6.4 0 0 1-12.8 0C5.6 10.1 12 3.2 12 3.2Z"/>',
  smile:
    '<circle cx="12" cy="12" r="8.8"/><path d="M8.6 14.3s1.3 2 3.4 2 3.4-2 3.4-2M9.2 9.6h.1M14.8 9.6h.1" stroke-width="2"/>',
  wave:
    '<path d="M2.8 12c2.1-4.2 4.1-4.2 6.1 0s4.1 4.2 6.1 0 4.1-4.2 6.1 0"/>',
  battery:
    '<rect x="2.8" y="7.4" width="16" height="9.2" rx="2.6"/><path d="M21.2 10.6v2.8M6.4 10.4v3.2"/>',
  brief:
    '<rect x="3.4" y="7.4" width="17.2" height="12.2" rx="2.6"/><path d="M9 7.4V5.9a1.9 1.9 0 0 1 1.9-1.9h2.2A1.9 1.9 0 0 1 15 5.9v1.5M3.4 12.6h17.2"/>',
  dumbbell:
    '<path d="M6.6 7.6v8.8M17.4 7.6v8.8M3.6 10v4M20.4 10v4M6.6 12h10.8"/>',
  pulse:
    '<path d="M3 12h4l2.2-5 4 10 2.2-5H21"/>',
  sun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  chevron: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
} as const;

export type IconName = keyof typeof ICON;

export const LEVEL_ICON: Record<IndicatorState, string> = {
  ok: '<circle cx="6" cy="6" r="5.5"/>',
  self_care: '<path d="M6 .6 11.7 11H.3Z"/>',
  tell_cmo: '<path d="M6 .3 11.7 6 6 11.7.3 6Z"/>',
  flight_surgeon: '<rect x=".6" y=".6" width="10.8" height="10.8" rx="1.5"/>',
  not_enough_data:
    '<circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};
