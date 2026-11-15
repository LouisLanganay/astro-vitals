import { mockIPC } from '@tauri-apps/api/mocks';

import { MISSION_DAYS, addDays } from '../lib/mission';
import { SCENARIO_IDS, type PacketExport, type ScenarioId } from '../lib/types';
import { ready, send } from './engine';
import './web.css';

const DOC_KEY = 'astro-vitals.document';
const CORRUPT_KEY = 'astro-vitals.document.corrupt';
const CORRUPT_LABEL = `browser storage, key ${CORRUPT_KEY}`;
const FIRST_SCENARIO = 'sleep_debt';
const NOTE_MS = 7000;

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

async function exec(command: string, args: unknown): Promise<unknown> {
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

async function staleScenario(): Promise<ScenarioId | null> {
  try {
    const doc = storedDoc() as { settings?: { launch_date?: string } } | null;
    const launch = doc?.settings?.launch_date;
    if (typeof launch !== 'string') return null;
    const loaded = addDays(launch, MISSION_DAYS);
    if (loaded === today()) return null;
    const stored = JSON.stringify(doc);
    for (const id of SCENARIO_IDS) {
      const response = await send({
        command: 'load_scenario',
        args: { id },
        today: loaded,
        doc,
        corrupt_backup: null,
      });
      if (response.doc !== undefined && JSON.stringify(response.doc) === stored) return id;
    }
    return null;
  } catch {
    return null;
  }
}

async function prepare() {
  await ready();
  if (memory === null && read(DOC_KEY) === null && read(CORRUPT_KEY) === null) {
    await exec('load_scenario', { id: FIRST_SCENARIO });
    return;
  }
  const id = await staleScenario();
  if (id) await exec('load_scenario', { id });
}

let boot: Promise<void> | null = null;

function seed(): Promise<void> {
  boot ??= prepare().catch((e) => {
    boot = null;
    throw e;
  });
  return boot;
}

async function run(command: string, args: unknown): Promise<unknown> {
  await seed();
  return exec(command, args);
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

export function showNote() {
  const note = document.createElement('p');
  note.className = 'web-demo-note';
  note.setAttribute('role', 'note');
  note.textContent = 'Web demo. Your data stays in this browser.';
  document.body.append(note);
  setTimeout(() => note.classList.add('out'), NOTE_MS);
  setTimeout(() => note.remove(), NOTE_MS + 600);
}

export const startWeb = seed;
