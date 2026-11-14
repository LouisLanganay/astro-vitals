const SEEN_KEY = 'astro-vitals.landing';

export function landingWanted(): boolean {
  if (location.hash === '#landing') return true;
  if (location.hash === '#app') return false;
  if (import.meta.env.MODE !== 'web') return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) === null;
  } catch {
    return true;
  }
}

export function landingSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    return;
  }
}
