import * as generated from './engine.generated.js';
import { decode, encode } from './utf8';

export type Exports = {
  memory: { readonly buffer: ArrayBuffer };
  alloc(len: number): number;
  dealloc(ptr: number, len: number): void;
  call_ptr(ptr: number, len: number): number;
  call_len(): number;
};

export function callWith(core: Exports, request: string): string {
  const input = encode(request);
  const ptr = core.alloc(input.length);
  new Uint8Array(core.memory.buffer, ptr, input.length).set(input);
  const outPtr = core.call_ptr(ptr, input.length) >>> 0;
  const outLen = core.call_len() >>> 0;
  core.dealloc(ptr, input.length);
  const text = decode(new Uint8Array(core.memory.buffer, outPtr, outLen));
  core.dealloc(outPtr, outLen);
  return text;
}

export const callCore = (request: string) => callWith(generated, request);
