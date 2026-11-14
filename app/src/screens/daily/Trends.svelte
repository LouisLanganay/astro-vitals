<script lang="ts">
  import { series } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import { INDICATOR_INFO } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app, navigate } from '../../lib/state.svelte';
  import {
    BASELINE_DAYS,
    INDICATORS,
    MEAN_WINDOW_DAYS,
    type AppError,
    type Indicator,
    type Series,
  } from '../../lib/types';
  import LineChart from './LineChart.svelte';
  import { num } from './num';

  let results = $state.raw<Partial<Record<Indicator, Series | AppError>>>({});
  const shown = $derived<readonly Indicator[]>(
    app.route.indicator ? [app.route.indicator] : INDICATORS,
  );

  let token = 0;

  $effect(() => {
    void app.revision;
    const t = ++token;
    results = {};
    for (const id of shown) {
      series(id)
        .then((s) => s, toAppError)
        .then((r) => {
          if (t === token) results = { ...results, [id]: r };
        });
    }
  });
</script>

<section>
  <h1>Trends</h1>
  <p class="muted">
    The thin line shows the value of each day. The thick line shows the mean of the last
    {MEAN_WINDOW_DAYS} days. The dashed line shows your baseline median, from the
    {BASELINE_DAYS} pre-flight days. A gap shows days with no data.
  </p>

  <label class="field select">
    <span>Indicator</span>
    <select
      value={app.route.indicator ?? ''}
      onchange={(e) =>
        navigate('trends', { indicator: (e.currentTarget.value || null) as Indicator | null })}
    >
      <option value="">All indicators</option>
      {#each INDICATORS as id (id)}
        <option value={id}>{INDICATOR_INFO[id].label}</option>
      {/each}
    </select>
  </label>

  <div class="charts" class:single={shown.length === 1}>
    {#each shown as id (id)}
      {@const info = INDICATOR_INFO[id]}
      {@const result = results[id]}
      {@const status = app.assessment?.indicators.find((s) => s.indicator === id)}
      <article class="card">
        <header class="row">
          <h2>{info.label}</h2>
          {#if status}
            <LevelBadge state={status.state} />
          {/if}
        </header>
        <p class="muted">
          Unit: {info.unit}. A {info.bad} value is bad.
          {#if status?.mean_7d != null}
            7-day mean: {num(status.mean_7d)}.
          {/if}
          {#if status?.drift_score != null}
            Drift score: {num(status.drift_score)}.
          {/if}
        </p>
        {#if !result}
          <p class="muted" role="status">Loading...</p>
        {:else if 'points' in result}
          <LineChart
            points={result.points}
            baseline={result.baseline?.median ?? null}
            label={info.label}
          />
        {:else}
          <p class="banner error" role="alert">{errorText(result)}</p>
        {/if}
        {#if shown.length > 1}
          <div>
            <button class="btn" onclick={() => navigate('trends', { indicator: id })}>
              Show only this indicator
            </button>
          </div>
        {/if}
      </article>
    {/each}
  </div>
</section>

<style>
  .select {
    justify-items: start;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
    gap: 1rem;
  }
  .charts.single {
    grid-template-columns: 1fr;
  }
  article {
    display: grid;
    gap: 0.5rem;
    align-content: start;
    min-width: 0;
  }
  header {
    justify-content: space-between;
  }
</style>
