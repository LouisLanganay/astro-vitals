<script lang="ts">
  import { getSettings, loadScenario, setSettings } from '../../lib/api';
  import { errorText, fieldMessage, toAppError } from '../../lib/errors';
  import { missionDayLabel } from '../../lib/format';
  import { INDICATOR_INFO, SCENARIO_LABEL, STATE_LABEL } from '../../lib/labels';
  import Icon from '../../lib/Icon.svelte';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { catalog, loadCatalog } from '../../lib/catalog.svelte';
  import { catalogCondition, catalogTitle, formatValue, isUrl, ruleFact, sourceLabel } from '../../lib/rules';
  import { app, refresh } from '../../lib/state.svelte';
  import {
    BASELINE_DAYS,
    LEVELS,
    SCENARIO_IDS,
    type AppError,
    type FieldError,
    type Level,
    type ScenarioId,
    type ScenarioInfo,
    type Settings,
  } from '../../lib/types';

  import { minutesError, num } from './num';

  const REQUIRED = 'Enter a value.';

  let settings = $state.raw<Settings | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state<AppError | null>(null);
  let launchDate = $state('');
  let prescription = $state<number | null>(null);

  let pending = $state<ScenarioId | null>(null);
  let scenarioBusy = $state(false);
  let scenarioError = $state<AppError | null>(null);
  let info = $state.raw<ScenarioInfo | null>(null);

  let filter = $state<'all' | Level>('all');
  const NARROW = '(max-width: 699px)';
  let narrow = $state(typeof matchMedia === 'function' && matchMedia(NARROW).matches);
  let opened = $state<Record<string, boolean>>({});
  $effect(() => {
    const mq = matchMedia(NARROW);
    const on = () => (narrow = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
  const FILTERS: ['all' | Level, string][] = [
    ['all', 'All'],
    ...LEVELS.filter((l) => l !== 'ok').map((l): [Level, string] => [l, STATE_LABEL[l]]),
  ];
  const fired = $derived(app.assessment?.fired ?? []);
  const firedById = $derived(new Map(fired.map((r) => [r.rule_id, r])));
  const all = $derived(catalog.value?.rules ?? []);
  const ordered = $derived([...all.filter((r) => firedById.has(r.id)), ...all.filter((r) => !firedById.has(r.id))]);
  const rules = $derived(filter === 'all' ? ordered : ordered.filter((r) => r.level === filter));
  loadCatalog();
  const indicators = $derived(app.assessment?.indicators ?? []);

  async function load() {
    loading = true;
    try {
      const s = await getSettings();
      settings = s;
      launchDate = s.launch_date;
      prescription = s.exercise_prescription_min;
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

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!settings) return;
    saved = false;
    const missing: FieldError[] = [];
    if (!launchDate) missing.push({ field: 'launch_date', message: REQUIRED });
    const message = minutesError(prescription);
    if (message) missing.push({ field: 'exercise_prescription_min', message });
    if (missing.length > 0 || prescription == null) {
      error = { kind: 'validation', errors: missing };
      return;
    }
    saving = true;
    error = null;
    try {
      await setSettings({
        ...settings,
        launch_date: launchDate,
        exercise_prescription_min: prescription,
      });
      await refresh();
      saved = true;
    } catch (e) {
      error = toAppError(e);
    } finally {
      saving = false;
    }
  }

  async function replaceData(id: ScenarioId) {
    pending = null;
    scenarioBusy = true;
    scenarioError = null;
    info = null;
    saved = false;
    try {
      info = await loadScenario(id);
      await refresh();
    } catch (e) {
      scenarioError = toAppError(e);
    } finally {
      scenarioBusy = false;
    }
  }

</script>

{#snippet fieldError(field: string)}
  {@const message = fieldMessage(error, field)}
  {#if message}
    <span class="error" role="alert">{message}</span>
  {/if}
{/snippet}

<div class="stack">
  <section class="card rise" aria-labelledby="st-r">
    <header>
      <div>
        <h2 id="st-r">
          {all.length || ''} {all.length === 1 ? 'rule' : 'rules'}
        </h2>
        <p class="small muted sub">
          {fired.length} {fired.length === 1 ? 'rule fires' : 'rules fire'} today. A rule marked as a
          design selection needs a medical review.
        </p>
      </div>
      <div class="seg" role="group" aria-label="Filter by level">
        {#each FILTERS as [value, text] (value)}
          <button type="button" aria-pressed={filter === value} onclick={() => (filter = value)}>
            {text}
          </button>
        {/each}
      </div>
    </header>
    {#if !catalog.value}
      <p class="muted" role="status">{catalog.failed ? 'Rules unavailable: the rule catalog did not load.' : 'Loading...'}</p>
    {:else}
      {#key filter}
        <div class="rules">
          {#each rules as rule, k (rule.id)}
            {@const hit = firedById.get(rule.id)}
            {@const fact = hit ? ruleFact(hit) : null}
            {@const open = !narrow || (opened[rule.id] ?? !!hit)}
            <article class="rrow rise" class:hit={!!hit} class:shut={!open} style:--i={Math.min(k, 10)}>
              <div class="lv">
                <LevelBadge state={rule.level} />
                {#if hit}<span class="today">Fires today</span>{/if}
              </div>
              <div>
                <h3>
                  {#if narrow}
                    <button
                      type="button"
                      class="rtog"
                      aria-expanded={open}
                      onclick={() => (opened = { ...opened, [rule.id]: !open })}
                    >
                      <span>{catalogTitle(rule)}</span>
                      <i aria-hidden="true"></i>
                    </button>
                  {:else}
                    {catalogTitle(rule)}
                  {/if}
                </h3>
                <p class="meta">
                  <code>{rule.id}</code>
                  {catalogCondition(rule, prescription)}{fact ? `. Today: ${fact}` : ''}
                </p>
                {#if open}<p class="exp">{rule.explanation}</p>{/if}
              </div>
              {#if open}
              <p class="act">{rule.action}</p>
              <p class="src">
                <Icon name="link" size={13} />
                {#if isUrl(rule.source)}
                  <a
                    href={rule.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Source: {sourceLabel(rule.source)}"
                  >
                    {sourceLabel(rule.source)}
                  </a>
                {:else}
                  {rule.source}
                {/if}
              </p>
              {/if}
            </article>
          {:else}
            <p class="muted empty">No rule at this level.</p>
          {/each}
        </div>
      {/key}
    {/if}
  </section>

  <div class="grid g-7-5">
    <section class="card rise" style:--i={1} aria-labelledby="st-b">
      <header>
        <h2 id="st-b">Personal baseline</h2>
        <span class="eyebrow">{BASELINE_DAYS} pre-flight days</span>
      </header>
      {#if indicators.length}
        <div class="tw">
          <table>
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Days</th>
                <th>Median</th>
                <th>MAD</th>
                <th>Drift</th>
                <th>Bad when</th>
              </tr>
            </thead>
            <tbody>
              {#each indicators as s, k (s.indicator)}
                {@const i = INDICATOR_INFO[s.indicator]}
                <tr class="rise" style:--i={Math.min(k, 14)}>
                  <td>{i.label}</td>
                  <td class="num">{s.baseline?.days ?? 0}</td>
                  <td class="num">{s.baseline ? formatValue(s.indicator, s.baseline.median) : 'none'}</td>
                  <td class="num">{s.baseline ? num(s.baseline.mad) : 'none'}</td>
                  <td class="num">{s.drift_score == null ? 'none' : num(+s.drift_score.toFixed(1))}</td>
                  <td>{i.bad}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="muted">No baseline yet.</p>
      {/if}
    </section>

    <div class="stack">
      {#if error}
        <p class="banner error" role="alert">{errorText(error)}</p>
      {/if}

      {#if settings}
        <form class="card rise" style:--i={2} novalidate onsubmit={save} aria-labelledby="st-s">
          <header><h2 id="st-s">Mission</h2></header>
          <label class="field">
            <span>Launch date</span>
            <input
              type="date"
              bind:value={launchDate}
              aria-invalid={fieldMessage(error, 'launch_date') ? 'true' : undefined}
            />
            <span class="help">Mission day 0.</span>
            {@render fieldError('launch_date')}
          </label>
          <label class="field">
            <span>Exercise prescription (minutes each day)</span>
            <input
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              bind:value={prescription}
              aria-invalid={fieldMessage(error, 'exercise_prescription_min') ? 'true' : undefined}
            />
            <span class="help">The sum of resistive and aerobic exercise.</span>
            {@render fieldError('exercise_prescription_min')}
          </label>
          <div class="row">
            <button type="submit" class="btn primary" class:ok={saved} disabled={saving || loading}>
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </form>
      {:else if loading}
        <p class="muted" role="status">Loading...</p>
      {:else}
        <div>
          <button class="btn" onclick={load}>Try again</button>
        </div>
      {/if}

      <section class="card rise" style:--i={3} aria-labelledby="st-sc">
        <header><h2 id="st-sc">Load a scenario</h2></header>
        <div class="seg" role="group" aria-label="Scenario">
          {#each SCENARIO_IDS as id (id)}
            <button
              type="button"
              aria-pressed={pending === id}
              disabled={scenarioBusy}
              onclick={() => (pending = id)}
            >
              {SCENARIO_LABEL[id]}
            </button>
          {/each}
        </div>
        {#if pending}
          {@const id = pending}
          <div class="banner warn pop" role="alert">
            <span>
              The scenario "{SCENARIO_LABEL[id]}" replaces all stored data. You cannot get the data
              back. Continue?
            </span>
            <span class="btns">
              <button class="btn primary sm" onclick={() => replaceData(id)}>Replace the data</button>
              <button class="btn sm" onclick={() => (pending = null)}>Cancel</button>
            </span>
          </div>
        {/if}
        {#if scenarioBusy}
          <p class="muted" role="status">Loading the scenario...</p>
        {/if}
        {#if scenarioError}
          <p class="banner error" role="alert">{errorText(scenarioError)}</p>
        {/if}
        {#if info}
          <div class="info rise" role="status">
            <h3>Scenario loaded: {SCENARIO_LABEL[info.id]}</h3>
            <p class="small muted">{info.description}</p>
            <p class="small">Today is: {missionDayLabel(info.mission_day)}.</p>
            {#if info.expected.length > 0}
              <p class="small muted">First mission day of each expected level:</p>
              <ul>
                {#each info.expected as expected, k (expected.level)}
                  <li class="kv rise" style:--i={k}>
                    <LevelBadge state={expected.level} />
                    <span class="num small">{missionDayLabel(expected.first_mission_day)}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>

<style>
  .sub {
    margin-top: 4px;
  }
  .rules {
    display: flex;
    flex-direction: column;
  }
  .rrow {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px 22px;
    padding: 18px 0;
    border-top: 1px solid var(--line);
  }
  .rrow .lv {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
  }
  .today {
    font-size: 11.5px;
    color: var(--fg);
    padding: 3px 8px;
    border-radius: 8px;
    background: var(--well-2);
    box-shadow: inset 0 0 0 1px var(--line-2);
  }
  .rrow:not(.hit) h3 {
    color: var(--muted);
  }
  .rrow:first-child {
    border-top: 0;
    padding-top: 4px;
  }
  @media (min-width: 1100px) {
    .rrow {
      grid-template-columns: 140px minmax(0, 1.25fr) minmax(0, 1fr) 150px;
      align-items: start;
    }
  }
  .rtog {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .rtog i {
    flex: none;
    width: 8px;
    height: 8px;
    margin: 5px 4px 0 0;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(-135deg) translate(-2px, -2px);
    transition: transform var(--t-mid) var(--ease-spring);
  }
  .shut .rtog i {
    transform: rotate(45deg);
  }
  .rtog::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  .rrow {
    position: relative;
  }
  .rrow .src a {
    position: relative;
    z-index: 1;
  }
  .rrow:not(.shut) .exp,
  .rrow:not(.shut) .act,
  .rrow:not(.shut) .src {
    animation: rise-in 240ms var(--ease-out) backwards;
  }
  .rrow h3 {
    font-size: 15.5px;
    font-weight: 500;
    letter-spacing: -0.012em;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    font-size: 12.5px;
    color: var(--muted);
    margin-top: 4px;
  }
  .exp {
    font-size: 13px;
    color: var(--muted);
    margin-top: 6px;
  }
  .act {
    font-size: 14px;
  }
  .src {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .empty {
    padding: 8px 0;
  }
  .tw {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
  }
  th,
  td {
    text-align: left;
    padding: 11px 14px 11px 0;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }
  th {
    font-size: 12px;
    color: var(--muted);
    font-weight: 400;
    border-top: 0;
    white-space: nowrap;
  }
  td.num {
    white-space: nowrap;
  }
  .field .help {
    color: var(--faint);
    font-size: 12.5px;
  }
  .error {
    color: var(--red);
    font-size: 12.5px;
  }
  .btn.ok {
    background: var(--green);
    color: #04140b;
    animation: pop-in var(--t-slow) var(--ease-spring);
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  .kv {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--line);
  }
  @media (prefers-reduced-motion: reduce) {
    .btn.ok {
      animation: none;
    }
  }
</style>
