<script lang="ts">
  import { exportPacket, pickExportPath } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import { missionDayLabel } from '../../lib/format';
  import Icon from '../../lib/Icon.svelte';
  import { INDICATOR_INFO, RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { ruleFact, ruleTitle } from '../../lib/rules';
  import { app } from '../../lib/state.svelte';
  import Ticker from '../../lib/Ticker.svelte';
  import {
    PACKET_MAX_BYTES,
    PACKET_WINDOW_DAYS,
    type AppError,
    type PacketExport,
    type Symptom,
  } from '../../lib/types';
  import { tokens } from './json';
  import { num } from './num';

  let preview = $state.raw<PacketExport | null>(null);
  let loading = $state(true);
  let error = $state<AppError | null>(null);
  let exporting = $state(false);
  let exportError = $state<AppError | null>(null);
  let message = $state<string | null>(null);
  let done = $state(false);

  async function load() {
    loading = true;
    try {
      preview = await exportPacket();
      error = null;
    } catch (e) {
      error = toAppError(e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    void app.revision;
    load();
  });

  async function exportFile() {
    if (!preview) return;
    exporting = true;
    exportError = null;
    message = null;
    done = false;
    try {
      const path = await pickExportPath(`astro-vitals-packet-${preview.packet.date}.json`);
      if (path === null) {
        message = 'The export was cancelled. No file was written.';
        return;
      }
      const result = await exportPacket(path);
      preview = result;
      done = true;
      message = `The packet is in the file ${result.path ?? path}. Size: ${result.bytes} bytes.`;
    } catch (e) {
      exportError = toAppError(e);
    } finally {
      exporting = false;
    }
  }

  function treatment(symptom: Symptom) {
    if (!symptom.treated) return 'not treated';
    if (symptom.improved === null) return 'treated, result not known';
    return symptom.improved ? 'treated, improved' : 'treated, not improved';
  }

  const pretty = $derived.by(() => {
    if (!preview) return [];
    try {
      return tokens(JSON.stringify(JSON.parse(preview.json), null, 1));
    } catch {
      return tokens(preview.json);
    }
  });
  const ratio = $derived(preview ? Math.min(1, preview.bytes / PACKET_MAX_BYTES) : 0);
  const over = $derived(preview ? preview.bytes > PACKET_MAX_BYTES : false);
</script>

<div class="stack">
  {#if error}
    <p class="banner error" role="alert">{errorText(error)}</p>
  {/if}

  {#if preview}
    {@const packet = preview.packet}
    <div class="grid g-5-7">
      <section class="card rise" aria-labelledby="x-s">
        <header>
          <div>
            <h2 id="x-s">Ready to export</h2>
            <p class="small muted sub">{missionDayLabel(packet.mission_day)}, {packet.date}</p>
          </div>
          <LevelBadge state={packet.level} />
        </header>

        <div class="cap">
          <div class="big">
            <Ticker value={preview.bytes / 1024} decimals={1} /><small>KB of {PACKET_MAX_BYTES / 1024} KB</small>
          </div>
          <div
            class="capbar"
            class:over
            role="meter"
            aria-label="Packet size"
            aria-valuemin={0}
            aria-valuemax={PACKET_MAX_BYTES}
            aria-valuenow={preview.bytes}
          >
            <i style:transform="scaleX({ratio})"></i>
          </div>
          {#if over}
            <p class="banner warn" role="alert">The packet is larger than the limit.</p>
          {/if}
        </div>

        <div class="tiles">
          <div class="tile rise" style:--i={1}>
            <b><Ticker value={packet.fired.length} /></b><span>Fired rules</span>
          </div>
          <div class="tile rise" style:--i={2}>
            <b><Ticker value={packet.flagged.length} /></b>
            <span>Flagged indicators</span>
          </div>
          <div class="tile rise" style:--i={3}>
            <b><Ticker value={packet.symptoms.length} /></b>
            <span>Symptoms, last {PACKET_WINDOW_DAYS} days</span>
          </div>
          <div class="tile rise" style:--i={4}>
            <b><Ticker value={packet.baselines.length} /></b><span>Baseline values</span>
          </div>
        </div>

        <button
          class="btn primary big wide"
          class:ok={done}
          disabled={exporting || loading}
          onclick={exportFile}
        >
          {#if done && !exporting}
            <svg class="tickmark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
            </svg>
            Exported. Export again
          {:else}
            {#if !exporting}<Icon name="export" size={17} />{/if}
            {exporting ? 'Exporting...' : 'Export'}
          {/if}
        </button>
        {#if message}
          <p class="status rise" role="status">{message}</p>
        {/if}
        {#if exportError}
          <p class="banner error" role="alert">The export failed. {errorText(exportError)}</p>
        {/if}
      </section>

      <section class="card rise" style:--i={1} aria-labelledby="x-c">
        <header>
          <h2 id="x-c">Packet content</h2>
          <span class="eyebrow lock">
            <Icon name="lock" size={13} />
            Nothing leaves this device until you export it
          </span>
        </header>
        {#key preview.json}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <pre class="json" tabindex="0" aria-label="Exact file content, JSON">{#each pretty as t, i (i)}{#if t.c}<span
                  class={t.c}>{t.t}</span
                >{:else}{t.t}{/if}{/each}</pre>
        {/key}
      </section>
    </div>

    <section class="card rise" style:--i={2} aria-labelledby="x-p">
      <header>
        <h2 id="x-p">The same packet in plain words</h2>
        <span class="eyebrow">"-" = no data</span>
      </header>
      <div class="plain">
        <div>
          <span class="lbl">Rules that fired ({packet.fired.length})</span>
          {#each packet.fired as rule (rule.rule_id)}
            {@const fact = ruleFact(rule)}
            <div class="kv">
              <span>{ruleTitle(rule)}{#if fact}<span class="small muted">, {fact}</span>{/if}</span>
              <LevelBadge state={rule.level} />
            </div>
          {:else}
            <p class="muted">No rule fired.</p>
          {/each}
        </div>
        <div>
          <span class="lbl">Flagged indicators, values of the last {PACKET_WINDOW_DAYS} days</span>
          {#each packet.flagged as flagged (flagged.indicator)}
            {@const info = INDICATOR_INFO[flagged.indicator]}
            <div class="kv col">
              <span>{info.label} ({info.unit})</span>
              <span class="num small muted">
                {flagged.values.map((v) => (v === null ? '-' : num(v))).join(', ')}
              </span>
            </div>
          {:else}
            <p class="muted">No indicator is flagged.</p>
          {/each}
        </div>
        <div>
          <span class="lbl">Symptoms and red flags, last {PACKET_WINDOW_DAYS} days</span>
          {#each packet.symptoms as item, i (i)}
            <div class="kv">
              <span>
                {SYMPTOM_LABEL[item.symptom.kind]}
                <span class="small muted">
                  severity {item.symptom.severity}, {REGION_LABEL[item.symptom.region]}, {treatment(item.symptom)}
                </span>
              </span>
              <span class="num small muted">{item.date}</span>
            </div>
          {:else}
            <p class="muted">No symptom.</p>
          {/each}
          {#each packet.red_flags as flag, i (i)}
            <div class="kv">
              <span>Red flag: {RED_FLAG_LABEL[flag.kind]}</span>
              <span class="num small muted">{flag.date}</span>
            </div>
          {:else}
            <p class="muted">No red flag.</p>
          {/each}
        </div>
        <div>
          <span class="lbl">Baseline values</span>
          {#each packet.baselines as item (item.indicator)}
            {@const info = INDICATOR_INFO[item.indicator]}
            <div class="kv">
              <span>{info.label} <span class="small muted">({info.unit})</span></span>
              <span class="num small muted">
                median {num(item.baseline.median)}, MAD {num(item.baseline.mad)}, {item.baseline.days} days
              </span>
            </div>
          {:else}
            <p class="muted">No baseline is available.</p>
          {/each}
        </div>
      </div>
    </section>
  {:else if loading}
    <p class="muted" role="status">Loading...</p>
  {:else}
    <div>
      <button class="btn" onclick={load}>Try again</button>
    </div>
  {/if}
</div>

<style>
  .sub {
    margin-top: 4px;
  }
  .cap {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .capbar {
    height: 8px;
    border-radius: 4px;
    background: var(--well-2);
    overflow: hidden;
  }
  .capbar i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--ui-2), var(--ui));
    transform-origin: left center;
    transition: transform var(--t-slow) var(--ease-out);
    animation: fill 600ms var(--ease-out) 120ms backwards;
  }
  .capbar.over i {
    background: var(--red);
  }
  @keyframes fill {
    from {
      transform: scaleX(0);
    }
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .tile {
    padding: 16px;
    border-radius: 18px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .tile b {
    display: block;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 1.1;
  }
  .tile span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .btn.ok {
    background: var(--green);
    color: #04140b;
  }
  .tickmark {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tickmark path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw-tick 260ms var(--ease-out) forwards;
  }
  @keyframes draw-tick {
    to {
      stroke-dashoffset: 0;
    }
  }
  .status {
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .json {
    margin: 0;
    font-family: var(--font-data);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 640px;
    overflow: auto;
    padding: 16px 18px;
    border-radius: 18px;
    background: var(--bg);
    box-shadow: inset 0 0 0 1px var(--line);
    color: var(--muted);
    animation: fade-in 320ms var(--ease-out) 80ms backwards;
  }
  .json :global(.k) {
    color: var(--muted);
  }
  .json :global(.s) {
    color: var(--fg);
  }
  .json :global(.n) {
    color: var(--ui);
  }
  .json :global(.b) {
    color: var(--orange);
  }
  .plain {
    display: grid;
    gap: 20px 32px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 900px) {
    .plain {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .kv {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
    align-items: center;
  }
  .kv.col {
    grid-template-columns: minmax(0, 1fr);
  }
  .kv .num {
    overflow-wrap: anywhere;
  }
  @media (max-width: 560px) {
    .json {
      max-height: 420px;
      padding: 12px 14px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .capbar i,
    .json,
    .tickmark path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
