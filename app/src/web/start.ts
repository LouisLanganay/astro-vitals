import { mockIPC } from '@tauri-apps/api/mocks';

import type { PacketExport } from '../lib/types';
import { ready, send } from './engine';
import './web.css';

const DOC_KEY = 'astro-vitals.document';
const CORRUPT_KEY = 'astro-vitals.document.corrupt';
const CORRUPT_LABEL = `browser storage, key ${CORRUPT_KEY}`;
const FIRST_SCENARIO = 'sleep_debt';

let memory: string | null = null;
let corruptBackup: string | null = null;

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

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function storedDoc(): unknown {
  const raw = memory ?? read(DOC_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    keepCorrupt(raw);
    return null;
  }
}

function keepCorrupt(raw: string) {
  write(CORRUPT_KEY, raw);
  write(DOC_KEY, null);
  memory = null;
  corruptBackup = CORRUPT_LABEL;
}

async function run(command: string, args: unknown): Promise<unknown> {
  const doc = storedDoc();
  const response = await send({
    command,
    args: args ?? {},
    today: today(),
    doc,
    corrupt_backup: corruptBackup,
  });
  if (response.corrupt && doc !== null) keepCorrupt(JSON.stringify(doc));
  if (response.doc !== undefined) {
    memory = JSON.stringify(response.doc);
    write(DOC_KEY, memory);
  }
  if (response.error) throw response.error;
  return response.ok ?? null;
}

function download(name: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Payload = Record<string, unknown> | undefined;

mockIPC(async (cmd, payload) => {
  const args = payload as Payload;
  if (cmd === 'plugin:dialog|save') {
    const options = args?.options as { defaultPath?: string } | undefined;
    return options?.defaultPath ?? 'astro-vitals-packet.json';
  }
  const result = await run(cmd, args);
  if (cmd === 'export_packet') {
    const packet = result as PacketExport;
    if (packet.path) download(packet.path, packet.json);
  }
  return result;
});

function banner() {
  const note = document.createElement('p');
  note.className = 'web-demo-note';
  note.setAttribute('role', 'note');
  note.textContent = 'Web demo';
  document.body.append(note);
}

export async function startWeb() {
  await ready();
  if (memory === null && read(DOC_KEY) === null && read(CORRUPT_KEY) === null) {
    await run('load_scenario', { id: FIRST_SCENARIO });
  }
  banner();
}
