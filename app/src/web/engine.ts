import type { AppError } from '../lib/types';

type Exports = {
  memory: WebAssembly.Memory;
  alloc(len: number): number;
  dealloc(ptr: number, len: number): void;
  call(ptr: number, len: number): bigint;
};

type Response = {
  ok?: unknown;
  error?: AppError;
  doc?: unknown;
  corrupt?: boolean;
};

const WASM_URL = `${import.meta.env.BASE_URL}astro_vitals_web.wasm`;

let module: Promise<WebAssembly.Module> | null = null;
let instance: Promise<Exports> | null = null;

function load(): Promise<Exports> {
  module ??= fetch(WASM_URL).then(async (res) => {
    if (!res.ok) throw new Error(`The engine file did not load: HTTP ${res.status}`);
    return WebAssembly.compile(await res.arrayBuffer());
  });
  const current = module;
  instance ??= current
    .then((m) => WebAssembly.instantiate(m, {}))
    .then((i) => i.exports as unknown as Exports)
    .catch((e) => {
      module = null;
      instance = null;
      throw e;
    });
  return instance;
}

export const ready = () => load().then(() => undefined);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function send(request: object): Promise<Response> {
  const wasm = await load();
  const input = encoder.encode(JSON.stringify(request));
  try {
    const ptr = wasm.alloc(input.length);
    new Uint8Array(wasm.memory.buffer, ptr, input.length).set(input);
    const packed = wasm.call(ptr, input.length);
    wasm.dealloc(ptr, input.length);
    const outPtr = Number(packed >> 32n);
    const outLen = Number(packed & 0xffffffffn);
    const text = decoder.decode(new Uint8Array(wasm.memory.buffer, outPtr, outLen));
    wasm.dealloc(outPtr, outLen);
    return JSON.parse(text) as Response;
  } catch (e) {
    instance = null;
    const error: AppError = {
      kind: 'internal',
      message: `The engine stopped: ${e instanceof Error ? e.message : String(e)}`,
    };
    return { error };
  }
}
