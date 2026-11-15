<script lang="ts">
  import { catalog, loadCatalog, thresholdLines } from '../../lib/catalog.svelte';
  import { getSettings, series } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import Icon from '../../lib/Icon.svelte';
  import type { IconName } from '../../lib/icons';
  import { INDICATOR_INFO } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { MISSION_DAYS } from '../../lib/mission';
  import { formatValue } from '../../lib/rules';
  import { app, navigate } from '../../lib/state.svelte';
  import Ticker from '../../lib/Ticker.svelte';
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

  type Range = 'all' | 30 | 14;
  const RANGES: [Range, string][] = [
    ['all', 'Mission'],
    [30, '30 days'],
    [14, '14 days'],
  ];

  const ICON: Record<Indicator, IconName> = {
    sleep_hours: 'moon',
    sleep_quality: 'moon',
    mood: 'smile',
    stress: 'wave',
    tiredness: 'battery',
    workload: 'brief',
    fluid_l: 'drop',
    exercise_min: 'dumbbell',
    pvt_mean_rt_ms: 'bolt',
    pvt_lapses: 'bolt',
    pvt_false_starts: 'bolt',
    acuity_left: 'eye',
    acuity_right: 'eye',
    amsler_left: 'eye',
    amsler_right: 'eye',
  };

  const MIN_SPAN: Record<string, number> = { h: 2, '0-10': 3, L: 1, min: 30, ms: 40, count: 3, logMAR: 0.3, '0-1': 1 };

  let range = $state<Range>('all');
  let results = $state.raw<Partial<Record<Indicator, Series | AppError>>>({});
  let prescription = $state<number | null>(null);
  const WEEKLY: readonly Indicator[] = ['acuity_left', 'acuity_right', 'amsler_left', 'amsler_right'];
  const drift = $derived(catalog.value?.drift ?? null);
  loadCatalog();
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

  $effect(() => {
    void app.revision;
    getSettings().then(
      (s) => (prescription = s.exercise_prescription_min),
      () => (prescription = null),
    );
  });

  function inRange(s: Series) {
    if (range === 'all') return s.points;
    return s.points.slice(-range);
  }

  function thresholdsOf(id: Indicator) {
    return thresholdLines(id, prescription);
  }


  function lastValue(s: Series) {
    for (let k = s.points.length - 1; k >= 0; k--) if (s.points[k].value !== null) return s.points[k];
    return null;
  }

  const decimalsOf = (id: Indicator) => {
    const unit = INDICATOR_INFO[id].unit;
    return unit === 'h' || unit === 'L' || unit === 'logMAR' ? 1 : 0;
  };
  const unitText = (unit: string) => (unit === '0-10' ? '/ 10' : unit === 'count' || unit === '0-1' ? '' : unit);
</script>

<div class="stack">
  <section class="card intro" aria-labelledby="tr-h">
    <header>
      <h2 id="tr-h">Against your baseline</h2>
      <div class="seg" role="group" aria-label="Time range">
        {#each RANGES as [value, text] (value)}
          <button type="button" aria-pressed={range === value} onclick={() => (range = value)}>
            {text}
          </button>
        {/each}
      </div>
    </header>
    <div class="legend">
      <span><i class="d"></i>Daily value</span>
      <span><i></i>{MEAN_WINDOW_DAYS}-day mean</span>
      <span><i class="m"></i>Baseline median</span>
      <span><i class="t"></i>Rule threshold</span>
      <span><i class="p"></i>Pre-flight days</span>
    </div>
    <details class="how">
      <summary>How to read the charts</summary>
    <p class="small muted formula">
      Baseline: median of the {BASELINE_DAYS} pre-flight days. Drift score = (7-day mean minus
      baseline median) / (1.4826 x MAD), counted in the bad direction only.
      {#if drift}
        A score of {drift.self_care} or more is self-care, {drift.tell_cmo} or more is tell the CMO.
      {/if}
      A gap shows days with no data.
      {#if catalog.failed}
        <span class="err">Rules unavailable: the chart shows no rule threshold.</span>
      {/if}
    </p>
    </details>
    <label class="pick">
      <select
        aria-label="Indicator"
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
  </section>

  <div class="charts" class:single={shown.length === 1}>
    {#each shown as id, k (id)}
      {@const info = INDICATOR_INFO[id]}
      {@const result = results[id]}
      {@const status = app.assessment?.indicators.find((s) => s.indicator === id)}
      {@const st = status?.state ?? 'not_enough_data'}
      {@const weekly = WEEKLY.includes(id)}
      <section class="card chart rise" style:--i={Math.min(k, 8)} data-lv={st} aria-labelledby="tr-{id}">
        <div class="ch">
          <div class="ttl">
            <span class="ic"><Icon name={ICON[id]} size={17} /></span>
            <h3 id="tr-{id}">{info.label}</h3>
          </div>
          <div class="end">
            <LevelBadge state={st} />
            {#if shown.length > 1}
              <button
                class="btn ghost sm icon"
                aria-label="Show only this indicator: {info.label}"
                onclick={() => navigate('trends', { indicator: id })}
              >
                <Icon name="focus" size={15} />
              </button>
            {:else}
              <button
                class="btn ghost sm icon"
                aria-label="Show all indicators"
                title="Show all indicators"
                onclick={() => navigate('trends')}
              >
                <Icon name="close" size={15} />
              </button>
            {/if}
          </div>
        </div>

        {#if !result}
          <p class="muted" role="status">Loading...</p>
        {:else if 'points' in result}
          {@const last = lastValue(result)}
          <div class="tnrow">
            <div>
              <div class="big">
                {#if last?.value != null}
                  <Ticker value={last.value} decimals={decimalsOf(id)} /><small>{unitText(info.unit)}</small>
                {:else}
                  <small class="none">no data</small>
                {/if}
              </div>
              <div class="small muted day">{last ? `Day ${last.mission_day}` : 'No value yet'}</div>
            </div>
            <div class="cv">
              {#if !weekly && status?.mean_7d != null}
                <span>7-day mean {formatValue(id, status.mean_7d)}</span>
              {/if}
              <span>
                Baseline {result.baseline ? formatValue(id, result.baseline.median) : 'none'}{status?.drift_score !=
                null
                  ? `, drift ${num(+status.drift_score.toFixed(1))}`
                  : ''}
              </span>
              <span>Bad when {info.bad}</span>
            </div>
          </div>
          {#key range}
            <LineChart
              points={inRange(result)}
              baseline={result.baseline?.median ?? null}
              label={info.label}
              state={st}
              {weekly}
              thresholds={thresholdsOf(id)}
              minSpan={MIN_SPAN[info.unit] ?? 1}
              until={range === 'all' ? MISSION_DAYS : null}
              format={(v) => formatValue(id, v)}
            />
          {/key}
        {:else}
          <p class="banner error" role="alert">{errorText(result)}</p>
        {/if}

      </section>
    {/each}
  </div>
</div>

<style>
  .how {
    display: grid;
    gap: 12px;
  }
  .how summary {
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    min-height: 32px;
    font-size: 13px;
    color: var(--muted);
    cursor: pointer;
    list-style: none;
    -webkit-tap-highlight-color: transparent;
  }
  .how summary::-webkit-details-marker {
    display: none;
  }
  .how summary::after {
    content: '';
    width: 7px;
    height: 7px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: translateY(-2px) rotate(45deg);
    transition: transform var(--t-fast) var(--ease-out);
  }
  .how[open] summary::after {
    transform: translateY(1px) rotate(-135deg);
  }
  .how[open] > :not(summary) {
    animation: rise-in 240ms var(--ease-out) backwards;
  }
  .intro .formula {
    max-width: 88ch;
  }
  .pick {
    display: grid;
    max-width: 320px;
  }
  .end {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .legend i {
    display: inline-block;
    width: 18px;
    height: 0;
    border-top: 2px solid var(--fg);
    margin-right: 7px;
    vertical-align: 4px;
  }
  .legend i.d {
    width: 6px;
    height: 12px;
    border: 0;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--bar-a), var(--bar-b));
    vertical-align: -1px;
  }
  .legend i.m {
    border-top: 1.5px dashed var(--muted);
  }
  .legend i.t {
    border-top: 2px dotted var(--orange);
  }
  .legend i.p {
    height: 12px;
    border: 0;
    border-radius: 3px;
    background: var(--well-2);
    vertical-align: -1px;
  }
  .charts {
    display: grid;
    gap: 0 56px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 900px) {
    .charts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .charts.single {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .chart {
    gap: 16px;
  }
  .tnrow {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 6px 16px;
    flex-wrap: wrap;
  }
  .tnrow .big {
    font-size: 42px;
  }
  .tnrow .none {
    margin: 0;
  }
  .day {
    margin-top: 8px;
  }
  .cv {
    display: flex;
    flex-direction: column;
    font-size: 12.5px;
    color: var(--muted);
    text-align: right;
  }
  @media (max-width: 480px) {
    .cv {
      text-align: left;
    }
  }
</style>
