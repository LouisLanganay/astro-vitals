const DOC_KEY = 'astro-vitals.mobile.document';
const CORRUPT_KEY = 'astro-vitals.mobile.document.corrupt';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export const readDoc = () => read(DOC_KEY);

export const writeDoc = (text: string) => write(DOC_KEY, text);

export const hasCorrupt = () => read(CORRUPT_KEY) !== null;

export function keepCorrupt(raw: string): string {
  write(CORRUPT_KEY, raw);
  write(DOC_KEY, null);
  return `browser storage, key ${CORRUPT_KEY}`;
}

export function exportFile(name: string, json: string): string {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
