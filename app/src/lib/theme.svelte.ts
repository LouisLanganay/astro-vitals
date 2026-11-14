export type Theme = 'dark' | 'light';

const KEY = 'astro-vitals-theme';

export const theme = $state<{ value: Theme }>({ value: 'dark' });

/** Dark by default. A saved choice wins. */
export function initTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    // Storage is optional.
  }
  setTheme(saved === 'light' ? 'light' : 'dark', false);
}

export function setTheme(value: Theme, save = true) {
  theme.value = value;
  document.documentElement.setAttribute('data-theme', value);
  if (!save) return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage is optional.
  }
}

export const toggleTheme = () => setTheme(theme.value === 'dark' ? 'light' : 'dark');
