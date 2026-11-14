<script lang="ts">
  import { onDestroy } from 'svelte';

  import { savePvt } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import { INDICATOR_INFO } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import {
    PVT_DURATION_MS,
    PVT_FALSE_START_MS,
    PVT_INTERVAL_MAX_MS,
    PVT_INTERVAL_MIN_MS,
    PVT_LAPSE_MS,
    PVT_TIMEOUT_MS,
    type AppError,
    type Indicator,
    type IsoDate,
    type PvtResult,
    type PvtTrial,
  } from '../../lib/types';

  type Phase = 'intro' | 'running' | 'saving' | 'done' | 'cancelled' | 'failed';

  let phase = $state<Phase>('intro');
  let lit = $state(false);
  let feedback = $state('');
  let elapsedMs = $state(0);
  let cancelReason = $state('');
  let result = $state<PvtResult | null>(null);
  let error = $state<AppError | null>(null);
  let target = $state<HTMLButtonElement>();

  let trials: PvtTrial[] = [];
  let date: IsoDate = '';
  let startedAt = 0;
  let stimulusAt = 0;
  let timer = 0;
  let frame = 0;

  const shown = $derived(phase === 'done' ? result : (app.day?.pvt ?? null));

  const rows = (r: PvtResult): { indicator: Indicator; value: string; help: string }[] => [
    {
      indicator: 'pvt_mean_rt_ms',
      value: r.mean_rt_ms === null ? 'No valid response' : `${Math.round(r.mean_rt_ms)} ms`,
      help: 'The mean time of your valid responses. A lower value is better.',
    },
    {
      indicator: 'pvt_lapses',
      value: String(r.lapses),
      help: `Responses at or above ${PVT_LAPSE_MS} ms. No response for ${PVT_TIMEOUT_MS / 1000} seconds is also a lapse.`,
    },
    {
      indicator: 'pvt_false_starts',
      value: String(r.false_starts),
      help: `Inputs before the signal, and responses below ${PVT_FALSE_START_MS} ms.`,
    },
  ];

  const stateOf = (indicator: Indicator) =>
    app.assessment?.indicators.find((s) => s.indicator === indicator)?.state;

  function clear() {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
  }

  function start() {
    if (!app.day) return;
    date = app.day.mission.today;
    trials = [];
    result = null;
    error = null;
    feedback = '';
    phase = 'running';
    startedAt = performance.now();
    next();
  }

  function next() {
    clear();
    lit = false;
    elapsedMs = performance.now() - startedAt;
    const left = PVT_DURATION_MS - elapsedMs;
    if (left <= 0) {
      finish();
      return;
    }
    const wait = PVT_INTERVAL_MIN_MS + Math.random() * (PVT_INTERVAL_MAX_MS - PVT_INTERVAL_MIN_MS);
    timer = wait < left ? setTimeout(show, wait) : setTimeout(finish, left);
  }

  function show() {
    frame = requestAnimationFrame(() => {
      lit = true;
      feedback = '';
      stimulusAt = performance.now();
      timer = setTimeout(() => {
        trials.push({ kind: 'timeout' });
        feedback = 'No input';
        next();
      }, PVT_TIMEOUT_MS);
    });
  }

  function input() {
    if (phase !== 'running') return;
    const now = performance.now();
    if (lit) {
      trials.push({ kind: 'response', rt_ms: now - stimulusAt });
      feedback = `${Math.round(now - stimulusAt)} ms`;
    } else {
      trials.push({ kind: 'premature' });
      feedback = 'Too early';
    }
    next();
  }

  function cancel(reason: string) {
    if (phase !== 'running') return;
    clear();
    lit = false;
    trials = [];
    cancelReason = reason;
    phase = 'cancelled';
  }

  async function finish() {
    clear();
    lit = false;
    phase = 'saving';
    error = null;
    try {
      result = await savePvt({ date, trials });
      await refresh();
      phase = 'done';
    } catch (e) {
      error = toAppError(e);
      phase = 'failed';
    }
  }

  function discard() {
    trials = [];
    error = null;
    phase = 'intro';
  }

  function key(e: KeyboardEvent) {
    if (phase !== 'running') return;
    if (e.key === 'Escape') {
      cancel('You cancelled the test.');
      return;
    }
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (!e.repeat) input();
  }

  $effect(() => {
    if (phase === 'running') target?.focus();
  });

  onDestroy(clear);
</script>

<svelte:window onkeydown={key} onblur={() => cancel('The window lost focus.')} />
<svelte:document
  onvisibilitychange={() => {
    if (document.hidden) cancel('The window lost focus.');
  }}
/>

<section>
  <h1>PVT-B reaction test</h1>

  {#if phase === 'running'}
    <progress max={PVT_DURATION_MS} value={elapsedMs} aria-label="Test progress"></progress>
    <button class="target" class:lit bind:this={target} onpointerdown={input}>
      {lit ? 'Press now' : feedback || 'Wait for the signal'}
    </button>
    <p class="muted">
      Press the Space key or click the box when the signal shows. Press Escape to cancel the test.
    </p>
  {:else if phase === 'saving'}
    <p class="muted" role="status">The test is complete. Saving the result...</p>
  {:else}
    {#if phase === 'cancelled'}
      <p class="banner warn" role="alert">{cancelReason} The test stopped. No data was saved.</p>
    {:else if phase === 'failed' && error}
      <div class="banner error" role="alert">
        <span>The result was not saved. {errorText(error)}</span>
        <span class="row">
          <button class="btn primary" onclick={finish}>Save again</button>
          <button class="btn" onclick={discard}>Discard the test</button>
        </span>
      </div>
    {/if}

    {#if shown}
      <div class="card result">
        <h2>{phase === 'done' ? 'Your result' : 'Result of today'}</h2>
        <dl class="grid">
          {#each rows(shown) as row (row.indicator)}
            {@const state = stateOf(row.indicator)}
            <div class="stat">
              <dt>{INDICATOR_INFO[row.indicator].label}</dt>
              <dd class="value">{row.value}</dd>
              {#if state}
                <dd><LevelBadge {state} /></dd>
              {/if}
              <dd class="muted">{row.help}</dd>
            </div>
          {/each}
        </dl>
        <p class="muted">The test showed {shown.stimuli} signals.</p>
        {#if phase === 'done'}
          <div class="row">
            <button class="btn primary" onclick={() => navigate('home')}>
              Go to the home screen
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if phase !== 'failed'}
      <div class="card intro">
        <h2>How the test works</h2>
        <p>
          This test measures how fast you react. Slow reactions and missed signals are signs of
          tiredness.
        </p>
        <ol>
          <li>The test continues for {PVT_DURATION_MS / 60000} minutes.</li>
          <li>
            Look at the box and wait. The signal shows after a random time of
            {PVT_INTERVAL_MIN_MS / 1000} to {PVT_INTERVAL_MAX_MS / 1000} seconds.
          </li>
          <li>
            When the box changes and shows "Press now", press the Space key or click the box
            immediately.
          </li>
          <li>Do not press before the signal. An early input is a false start.</li>
          <li>
            Keep this window in front. If the window loses focus, the test stops and saves no data.
          </li>
        </ol>
        {#if shown}
          <p class="muted">A new test replaces the result of today.</p>
        {/if}
        {#if !app.day}
          <p class="muted" role="status">
            {app.loading ? 'Loading the data of today...' : 'The data of today is not available.'}
          </p>
        {/if}
        <div class="row">
          <button class="btn primary" onclick={start} disabled={!app.day}>
            {shown || phase === 'cancelled' ? 'Start the test again' : 'Start the test'}
          </button>
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  progress {
    width: 100%;
    accent-color: var(--accent);
  }
  .target {
    display: grid;
    place-items: center;
    width: 100%;
    height: 55vh;
    min-height: 14rem;
    border: 3px dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--muted);
    font: inherit;
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
  }
  .target.lit {
    border: 3px solid var(--accent);
    background: var(--accent);
    color: #fff;
    font-size: 3rem;
    font-weight: 700;
  }
  .result,
  .intro {
    display: grid;
    gap: 0.75rem;
  }
  ol {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.3rem;
  }
  dl,
  dd {
    margin: 0;
  }
  .stat {
    display: grid;
    gap: 0.3rem;
    align-content: start;
    justify-items: start;
  }
  dt {
    font-weight: 600;
  }
  .value {
    font-size: 1.6rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
