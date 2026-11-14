<script lang="ts">
  import { exportPacket, pickExportPath } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import FiredRuleCard from '../../lib/FiredRuleCard.svelte';
  import { missionDayLabel } from '../../lib/format';
  import { INDICATOR_INFO, RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app } from '../../lib/state.svelte';
  import {
    PACKET_MAX_BYTES,
    PACKET_WINDOW_DAYS,
    type AppError,
    type PacketExport,
    type Symptom,
  } from '../../lib/types';
  import { num } from './num';

  let preview = $state.raw<PacketExport | null>(null);
  let loading = $state(true);
  let error = $state<AppError | null>(null);
  let exporting = $state(false);
  let exportError = $state<AppError | null>(null);
  let message = $state<string | null>(null);

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
    try {
      const path = await pickExportPath(`astro-vitals-packet-${preview.packet.date}.json`);
      if (path === null) {
        message = 'The export was cancelled. No file was written.';
        return;
      }
      const done = await exportPacket(path);
      preview = done;
      message = `The packet is in the file ${done.path ?? path}. Size: ${done.bytes} bytes.`;
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
</script>

<section>
  <h1>Packet export</h1>
  <p class="muted">
    The packet is a summary for the flight surgeon on Earth. It is one JSON file. No data leaves the
    device until you export the file and send it.
  </p>

  {#if error}
    <p class="banner error" role="alert">{errorText(error)}</p>
  {/if}

  {#if preview}
    {@const packet = preview.packet}
    <div class="card block">
      <h2>{missionDayLabel(packet.mission_day)}, {packet.date}</h2>
      <div class="row">
        <span>Day level:</span>
        <LevelBadge state={packet.level} />
      </div>
      <p>File size: {preview.bytes} bytes. The limit is {PACKET_MAX_BYTES} bytes.</p>
      {#if preview.bytes > PACKET_MAX_BYTES}
        <p class="banner warn" role="alert">The packet is larger than the limit.</p>
      {/if}
      <div class="row">
        <button class="btn primary" disabled={exporting || loading} onclick={exportFile}>
          {exporting ? 'Exporting...' : 'Export the packet'}
        </button>
        <span class="muted">The application asks for the file path.</span>
      </div>
      {#if message}
        <p class="banner info" role="status">{message}</p>
      {/if}
      {#if exportError}
        <p class="banner error" role="alert">The export failed. {errorText(exportError)}</p>
      {/if}
    </div>

    <h2>Packet content</h2>

    <h3>Rules that fired ({packet.fired.length})</h3>
    {#each packet.fired as rule}
      <FiredRuleCard {rule} />
    {:else}
      <p class="muted">No rule fired.</p>
    {/each}

    <div class="card block">
      <h3>Flagged indicators, values of the last {PACKET_WINDOW_DAYS} days</h3>
      {#each packet.flagged as flagged (flagged.indicator)}
        {@const info = INDICATOR_INFO[flagged.indicator]}
        <p>
          <strong>{info.label} ({info.unit}):</strong>
          <span class="values">
            {flagged.values.map((v) => (v === null ? '-' : num(v))).join(', ')}
          </span>
        </p>
      {:else}
        <p class="muted">No indicator is flagged.</p>
      {/each}
      <p class="muted">The oldest day is first. "-" shows a day with no data.</p>
    </div>

    <div class="card block">
      <h3>Symptoms of the last {PACKET_WINDOW_DAYS} days</h3>
      {#each packet.symptoms as item}
        <p>
          {item.date}: {SYMPTOM_LABEL[item.symptom.kind]}, severity {item.symptom.severity},
          {REGION_LABEL[item.symptom.region]}, {treatment(item.symptom)}
        </p>
      {:else}
        <p class="muted">No symptom.</p>
      {/each}
      <h3>Red flags</h3>
      {#each packet.red_flags as flag}
        <p>{flag.date}: {RED_FLAG_LABEL[flag.kind]}</p>
      {:else}
        <p class="muted">No red flag.</p>
      {/each}
    </div>

    <div class="card block">
      <h3>Baseline values</h3>
      {#each packet.baselines as item (item.indicator)}
        {@const info = INDICATOR_INFO[item.indicator]}
        <p>
          <strong>{info.label} ({info.unit}):</strong>
          median {num(item.baseline.median)}, MAD {num(item.baseline.mad)},
          {item.baseline.days} days
        </p>
      {:else}
        <p class="muted">No baseline is available.</p>
      {/each}
    </div>

    <details class="card">
      <summary>Exact file content (JSON)</summary>
      <pre>{preview.json}</pre>
    </details>
  {:else if loading}
    <p class="muted" role="status">Loading...</p>
  {:else}
    <div>
      <button class="btn" onclick={load}>Try again</button>
    </div>
  {/if}
</section>

<style>
  .block {
    display: grid;
    gap: 0.6rem;
  }
  .values {
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  pre {
    margin: 0.75rem 0 0;
    max-height: 24rem;
    overflow: auto;
    font-size: 0.8rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
