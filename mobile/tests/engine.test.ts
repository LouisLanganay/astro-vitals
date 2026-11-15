import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { callCore, callWith, type Exports } from '../src/core/engine';

const TODAY = '2026-11-14';
const root = join(import.meta.dir, '..', '..');
const wasmPath = [
  process.env.CORE_WASM,
  join(root, 'target/mobile-core/wasm2js/astro_vitals_web.wasm'),
  join(root, 'target/wasm32-unknown-unknown/release/astro_vitals_web.wasm'),
].find((p): p is string => !!p && existsSync(p));

async function realCore(): Promise<Exports | null> {
  if (!wasmPath) return null;
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), {});
  return instance.exports as unknown as Exports;
}

const request = (command: string, args: unknown, doc: unknown = null) =>
  JSON.stringify({ command, args, today: TODAY, doc, corrupt_backup: null });

type Answer = { ok?: any; error?: any; doc?: any; corrupt?: boolean };
const run = (command: string, args: unknown, doc: unknown = null): Answer =>
  JSON.parse(callCore(request(command, args, doc)));

describe('engine.generated.js', () => {
  const loaded = run('load_scenario', { id: 'sleep_debt' });
  const doc = loaded.doc;

  test('loads the sleep_debt scenario', () => {
    expect(loaded.ok.id).toBe('sleep_debt');
    expect(loaded.ok.mission_day).toBe(120);
    expect(Object.keys(doc.checks).length).toBeGreaterThan(100);
  });

  test('gives the expected level of the scenario', () => {
    const top = loaded.ok.expected.at(-1);
    const day = run('evaluate', { date: null }, doc).ok;
    expect(day.mission_day).toBe(120);
    expect(day.level).toBe(top.level);
    expect(day.regions).toHaveLength(10);
    const view = run('get_day', { date: null }, doc).ok;
    expect(view.mission.mission_day).toBe(120);
  });

  test('gives a series and a packet', () => {
    const series = run('series', { indicator: 'sleep_hours' }, doc).ok;
    expect(series.points.length).toBeGreaterThan(120);
    expect(series.baseline.median).toBeGreaterThan(6);
    const packet = run('export_packet', { path: null }, doc).ok;
    expect(packet.bytes).toBeLessThanOrEqual(16384);
    expect(JSON.parse(packet.json).mission_day).toBe(120);
  });

  test('gives a validation error with the field', () => {
    const check = {
      date: TODAY,
      answers: {
        sleep_start_min: 1380, sleep_end_min: 420, sleep_quality: 7, sleep_aid: false,
        mood: 11, stress: 2, tiredness: 3, workload: 5, fluid_l: 3,
        exercise_resistive_min: 45, exercise_aerobic_min: 45,
      },
      symptoms: [{ kind: 'headache', severity: 2, region: 'head', treated: false, improved: null }],
      red_flags: [],
    };
    const bad = run('save_daily_check', { check }, doc);
    expect(bad.error.kind).toBe('validation');
    expect(bad.error.errors[0].field).toBe('answers.mood');
    const good = run('save_daily_check', { check: { ...check, answers: { ...check.answers, mood: 6 } } }, doc);
    expect(good.error).toBeUndefined();
    expect(good.doc.checks[TODAY].symptoms[0].kind).toBe('headache');
  });

  test('marks a corrupt document', () => {
    const answer = run('get_day', { date: null }, { version: 'x' });
    expect(answer.corrupt).toBe(true);
  });

  test('gives the same answers as the real WebAssembly core', async () => {
    const core = await realCore();
    if (!core) throw new Error('No .wasm file. Run scripts/build-core.sh.');
    const requests = [
      request('load_scenario', { id: 'vision' }),
      request('get_day', { date: null }, doc),
      request('series', { indicator: 'mood' }, doc),
      request('export_packet', { path: null }, doc),
      request('rules', {}, doc),
      request('save_pvt', { input: { date: TODAY, trials: [{ kind: 'response', rt_ms: 250.5 }, { kind: 'premature' }, { kind: 'timeout' }] } }, doc),
      ...[0, 30, 60, 90, 119].map((k) =>
        request('evaluate', { date: new Date(Date.UTC(2026, 6, 17 + k)).toISOString().slice(0, 10) }, doc),
      ),
    ];
    for (const r of requests) expect(callCore(r)).toBe(callWith(core, r));
  });
});
