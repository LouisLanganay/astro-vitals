<script lang="ts">
  import { onDestroy } from 'svelte';

  import { savePvt, series } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import Icon from '../../lib/Icon.svelte';
  import { INDICATOR_INFO } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import MiniBars from '../../lib/MiniBars.svelte';
  import { addDays } from '../../lib/mission';
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
    type Series,
  } from '../../lib/types';

  type Phase = 'intro' | 'running' | 'saving' | 'done' | 'cancelled' | 'failed';

  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
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
    const rt = performance.now() - stimulusAt;
    if (lit && rt >= PVT_TIMEOUT_MS) {
      trials.push({ kind: 'timeout' });
      feedback = 'No input';
    } else if (lit) {
      trials.push({ kind: 'response', rt_ms: rt });
      feedback = `${Math.round(rt)} ms`;
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
    const root = document.documentElement;
    root.toggleAttribute('data-test-running', phase === 'running');
    return () => root.removeAttribute('data-test-running');
  });

  $effect(() => {
    if (phase === 'running') target?.focus();
  });

  onDestroy(clear);

  const BAR_DAYS = 10;
  let live = $state(0);
  let history = $state.raw<Series | null>(null);

  $effect(() => {
    if (!lit) return;
    let raf = 0;
    const tick = () => {
      live = Math.max(0, performance.now() - stimulusAt);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  });

  const lastRt = $derived(/^(\d+) ms$/.exec(feedback)?.[1] ?? null);
  const count = $derived(
    lit ? String(Math.round(live)) : lastRt ?? (feedback === 'Too early' ? 'FS' : ''),
  );
  const message = $derived(
    lit ? (touch ? 'Tap now' : 'Press now') : feedback === 'Too early' ? 'False start. Wait for the signal.' : feedback === 'No input' ? 'No input: a lapse.' : 'Wait for the signal.',
  );

  $effect(() => {
    void app.revision;
    let stale = false;
    series('pvt_mean_rt_ms').then(
      (s) => !stale && (history = s),
      () => !stale && (history = null),
    );
    return () => (stale = true);
  });
  const lastDays = $derived.by(() => {
    const today = app.day?.mission.today;
    if (!history || !today) return [];
    const byDate = new Map(history.points.map((p) => [p.date, p.value]));
    return Array.from({ length: BAR_DAYS }, (_, k) => byDate.get(addDays(today, k - BAR_DAYS + 1)) ?? null);
  });
  const rtState = $derived(stateOf('pvt_mean_rt_ms') ?? 'not_enough_data');
  const secondsLeft = $derived(Math.max(0, Math.ceil((PVT_DURATION_MS - elapsedMs) / 1000)));
</script>

<svelte:window onkeydown={key} onblur={() => cancel('The window lost focus.')} />
<svelte:document
  onvisibilitychange={() => {
    if (document.hidden) cancel('The window lost focus.');
  }}
/>

<div class="grid g-7-5">
  <section class="card" aria-labelledby="p-t">
    <header>
      <div class="ttl">
        <span class="ic"><Icon name="bolt" /></span>
        <h2 id="p-t">Reaction test</h2>
      </div>
      <span class="eyebrow">Optional, one each day</span>
    </header>
    <p>
      The signal is a counter. It shows after a random wait of {PVT_INTERVAL_MIN_MS / 1000} to
      {PVT_INTERVAL_MAX_MS / 1000} seconds. {touch ? 'Tap the box' : 'Click the box or press the Space key'} as soon as
      you see it. The test runs for {PVT_DURATION_MS / 60000} minutes.
    </p>

    {#if phase === 'running'}
      <button class="stage live" class:lit bind:this={target} onpointerdown={input}>
        <span class="count num" class:on={lit}>{count || ' '}</span>
        <span class="msg" class:go={lit}>{message}</span>
      </button>
      <div class="run">
        <progress max={PVT_DURATION_MS} value={elapsedMs} aria-label="Test progress"></progress>
        <span class="small muted num">{secondsLeft} s left</span>
      </div>
      <div class="btns">
        <button class="btn" onclick={() => cancel('You cancelled the test.')}>Cancel the test</button>
        <span class="small muted">Escape also cancels.</span>
      </div>
    {:else}
      <div class="stage">
        {#if phase === 'saving'}
          <p class="muted" role="status">The test is complete. Saving the result...</p>
        {:else if phase === 'done'}
          <p class="pop">Test complete.</p>
        {:else if !app.day}
          <p class="muted" role="status">
            {app.loading ? 'Loading the data of today...' : 'The data of today is not available.'}
          </p>
        {:else}
          <p class="muted">Start the test when you are ready.</p>
        {/if}
      </div>

      {#if phase === 'cancelled'}
        <p class="banner warn rise" role="alert">
          {cancelReason} The test stopped. No data was saved.
        </p>
      {:else if phase === 'failed' && error}
        <div class="banner error rise" role="alert">
          <span>The result was not saved. {errorText(error)}</span>
          <span class="btns">
            <button class="btn sm primary" onclick={finish}>Save again</button>
            <button class="btn sm" onclick={discard}>Discard the test</button>
          </span>
        </div>
      {/if}

      {#if phase !== 'failed' && phase !== 'saving'}
        <div class="btns">
          <button class="btn primary" onclick={start} disabled={!app.day}>
            {shown || phase === 'cancelled' ? 'Start the test again' : 'Start the test'}
          </button>
          {#if phase === 'done'}
            <button class="btn" onclick={() => navigate('home')}>Go to Today</button>
          {/if}
          {#if shown && phase !== 'done'}
            <span class="small muted">A new test replaces the result of today.</span>
          {/if}
        </div>
      {/if}
    {/if}

    {#if shown && phase !== 'running'}
      <div aria-live="polite">
        <span class="lbl">
          {phase === 'done' ? 'Your result, saved for today' : 'Result of today'} ·
          {shown.stimuli} signals
        </span>
        <dl class="res">
          {#each rows(shown) as row, i (row.indicator)}
            {@const state = stateOf(row.indicator)}
            <div class="tile rise" style:--i={i}>
              <dt>{INDICATOR_INFO[row.indicator].label}</dt>
              <dd class="v num">{row.value}</dd>
              {#if state}
                <dd class="st"><LevelBadge {state} /></dd>
              {/if}
              <dd class="help">{row.help}</dd>
            </div>
          {/each}
        </dl>
      </div>
    {/if}

    <p class="small muted">
      Lapse: a response of {PVT_LAPSE_MS} ms or more. False start: an input before the signal, or a
      response under {PVT_FALSE_START_MS} ms. No input for {PVT_TIMEOUT_MS / 1000} seconds counts as
      a lapse. If this window loses focus, the test stops and saves nothing.
    </p>
  </section>

  <div class="stack">
    <section class="card" aria-labelledby="p-h">
      <header>
        <h2 id="p-h">Last {BAR_DAYS} days</h2>
        {#if rtState !== 'ok' && rtState !== 'not_enough_data'}
          <LevelBadge state={rtState} />
        {:else}
          <span class="eyebrow">Dashed line: your baseline</span>
        {/if}
      </header>
      <span class="eyebrow">Mean reaction time</span>
      {#if lastDays.some((v) => v != null)}
        <MiniBars
          values={lastDays}
          baseline={history?.baseline?.median ?? null}
          state={rtState}
          label="Mean reaction time of the last {BAR_DAYS} days"
          width={420}
          height={96}
        />
      {:else}
        <p class="muted">No result in the last {BAR_DAYS} days.</p>
      {/if}
    </section>

    <section class="card" aria-labelledby="p-w">
      <header><h2 id="p-w">How the test works</h2></header>
      <p class="muted">
        This test measures how fast you react. Slow reactions and missed signals are signs of
        tiredness.
      </p>
      <ol class="steps">
        <li>Look at the box and wait for the signal.</li>
        <li>When the counter shows, {touch ? 'tap the box' : 'press the Space key or click the box'} at once.</li>
        <li>Do not press before the signal. An early input is a false start.</li>
        <li>Keep this window in front for the {PVT_DURATION_MS / 60000} minutes.</li>
      </ol>
    </section>
  </div>
</div>

<style>
  .stage {
    position: relative;
    overflow: hidden;
    min-height: 280px;
    width: 100%;
    border: 0;
    border-radius: 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    text-align: center;
    color: var(--fg);
    font: inherit;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    background: radial-gradient(120% 90% at 50% 0%, var(--well-2), var(--bg) 75%);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .stage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.6;
    background-image: radial-gradient(var(--line-2) 1px, transparent 1.2px);
    background-size: 20px 20px;
  }
  .stage > :global(*) {
    position: relative;
  }
  .stage.live {
    min-height: max(280px, 50vh);
    cursor: pointer;
  }
  .stage.live.lit {
    box-shadow: inset 0 0 0 2px var(--ui);
  }
  .count {
    font-size: 104px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.055em;
    font-variant-numeric: tabular-nums;
  }
  .count.on {
    animation: stim-pop var(--t-fast) var(--ease-out);
  }
  .msg {
    font-size: 15px;
    color: var(--muted);
  }
  .msg.go {
    color: var(--fg);
    font-weight: 500;
  }
  .run {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  progress {
    flex: 1;
    height: 6px;
    border: 0;
    border-radius: 3px;
    background: var(--well-2);
    overflow: hidden;
    appearance: none;
  }
  progress::-webkit-progress-bar {
    background: var(--well-2);
  }
  progress::-webkit-progress-value {
    background: linear-gradient(90deg, var(--ui-2), var(--ui));
    border-radius: 3px;
  }
  progress::-moz-progress-bar {
    background: linear-gradient(90deg, var(--ui-2), var(--ui));
    border-radius: 3px;
  }
  .res {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    padding: 14px 16px;
    border-radius: 16px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .tile dt {
    font-size: 12.5px;
    color: var(--muted);
    order: 2;
  }
  .tile .v {
    font-family: var(--font-body);
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 1.15;
    order: 1;
  }
  .tile .st {
    order: 3;
    margin-top: 4px;
  }
  .tile .help {
    order: 4;
    font-size: 12px;
    color: var(--faint);
  }
  .steps {
    list-style: decimal;
    padding-left: 1.2rem;
    display: grid;
    gap: 6px;
  }
  .steps li::marker {
    color: var(--muted);
  }
  @keyframes stim-pop {
    from {
      transform: scale(0.94);
    }
    to {
      transform: none;
    }
  }
</style>
