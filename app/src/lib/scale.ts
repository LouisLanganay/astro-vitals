const KEY = 'astro-vitals.calibration-scale';
const NO_SCALE = '1.00';

const pageScale = () => (window.visualViewport?.scale ?? 1).toFixed(2);

export function calibrationFits(): boolean {
  try {
    return (localStorage.getItem(KEY) ?? NO_SCALE) === pageScale();
  } catch {
    return pageScale() === NO_SCALE;
  }
}

export function calibrationSaved() {
  try {
    localStorage.setItem(KEY, pageScale());
  } catch {
    return;
  }
}
