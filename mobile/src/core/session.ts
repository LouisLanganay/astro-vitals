import type { AppError } from '../lib/types';
import { callCore } from './engine';
import { hasCorrupt, keepCorrupt, readDoc, writeDoc } from './storage';

type Answer = { ok?: unknown; error?: AppError; doc?: unknown; corrupt?: boolean };

const FIRST_SCENARIO = 'sleep_debt';

let memory: string | null = null;
let loaded = false;
let corruptBackup: string | null = null;

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function markCorrupt(raw: string) {
  corruptBackup = keepCorrupt(raw);
  memory = null;
}

function storedDoc(): string | null {
  if (loaded) return memory;
  loaded = true;
  const raw = readDoc();
  if (raw === null) return null;
  try {
    JSON.parse(raw);
    memory = raw;
  } catch {
    markCorrupt(raw);
  }
  return memory;
}

function send(command: string, args: unknown): unknown {
  const doc = storedDoc();
  const request =
    `{"command":${JSON.stringify(command)},"args":${JSON.stringify(args ?? {})},` +
    `"today":${JSON.stringify(today())},"doc":${doc ?? 'null'},` +
    `"corrupt_backup":${JSON.stringify(corruptBackup)}}`;
  let answer: Answer;
  try {
    answer = JSON.parse(callCore(request)) as Answer;
  } catch (e) {
    const error: AppError = {
      kind: 'internal',
      message: `The engine stopped: ${e instanceof Error ? e.message : String(e)}`,
    };
    throw error;
  }
  if (answer.corrupt && doc !== null) markCorrupt(doc);
  if (answer.doc !== undefined) {
    memory = JSON.stringify(answer.doc);
    try {
      writeDoc(memory);
    } catch (e) {
      const error: AppError = {
        kind: 'storage',
        message: `The data did not save: ${e instanceof Error ? e.message : String(e)}`,
      };
      throw error;
    }
  }
  if (answer.error) throw answer.error;
  return answer.ok ?? null;
}

const yieldFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function run<T>(command: string, args?: unknown): Promise<T> {
  await yieldFrame();
  return send(command, args) as T;
}

export async function start() {
  await yieldFrame();
  if (storedDoc() === null && corruptBackup === null && !hasCorrupt()) {
    send('load_scenario', { id: FIRST_SCENARIO });
  }
}
