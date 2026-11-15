import { File, Paths } from 'expo-file-system';

const DOC = 'data.json';
const TMP = 'data.json.tmp';
const corruptName = (n: number) => `data.corrupt-${n}.json`;

export function readDoc(): string | null {
  const file = new File(Paths.document, DOC);
  return file.exists ? file.textSync() : null;
}

export function writeDoc(text: string) {
  const tmp = new File(Paths.document, TMP);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.writeSync(text);
  tmp.moveSync(new File(Paths.document, DOC), { overwrite: true });
}

export function hasCorrupt(): boolean {
  return new File(Paths.document, corruptName(1)).exists;
}

export function keepCorrupt(raw: string): string {
  let n = 1;
  while (new File(Paths.document, corruptName(n)).exists) n++;
  const backup = new File(Paths.document, corruptName(n));
  backup.create();
  backup.writeSync(raw);
  const doc = new File(Paths.document, DOC);
  if (doc.exists) doc.delete();
  return backup.uri;
}

export function exportFile(name: string, json: string): string {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.writeSync(json);
  return file.uri;
}
