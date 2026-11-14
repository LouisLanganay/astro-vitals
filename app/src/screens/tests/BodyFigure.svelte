<script lang="ts">
  import { getDay, saveDailyCheck } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import FiredRuleCard from '../../lib/FiredRuleCard.svelte';
  import { missionDayLabel } from '../../lib/format';
  import { INDICATOR_INFO, REGION_LABEL, STATE_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import {
    LEVELS,
    SEVERITY_MAX,
    SEVERITY_MIN,
    SYMPTOM_KINDS,
    type AppError,
    type BodyRegion,
    type Symptom,
    type SymptomKind,
  } from '../../lib/types';

  const SHAPES: Record<BodyRegion, [number, number, number, number, number][]> = {
    head: [[80, 15, 60, 60, 30]],
    eyes: [
      [87, 33, 20, 14, 10],
      [113, 33, 20, 14, 10],
    ],
    neck: [[98, 77, 24, 14, 3]],
    chest: [[70, 93, 80, 68, 10]],
    abdomen: [[74, 163, 72, 62, 10]],
    back: [[225, 93, 70, 132, 10]],
    arms: [
      [44, 95, 22, 108, 10],
      [154, 95, 22, 108, 10],
    ],
    hands: [
      [42, 206, 26, 26, 13],
      [152, 206, 26, 26, 13],
    ],
    legs: [
      [76, 228, 30, 140, 10],
      [114, 228, 30, 140, 10],
    ],
    feet: [
      [62, 371, 44, 22, 22],
      [114, 371, 44, 22, 22],
    ],
  };

  const SEVERITY_LABEL = ['Mild', 'Moderate', 'Severe'];
  const SEVERITIES = Array.from(
    { length: SEVERITY_MAX - SEVERITY_MIN + 1 },
    (_, i) => SEVERITY_MIN + i,
  );

  let kind = $state<SymptomKind>(SYMPTOM_KINDS[0]);
  let severity = $state(SEVERITY_MIN);
  let treated = $state(false);
  let improved = $state<boolean | null>(null);
  let saving = $state(false);
  let error = $state<AppError | null>(null);

  const regions = $derived(app.assessment?.regions ?? []);
  const selected = $derived(regions.find((r) => r.region === app.route.region) ?? null);

  const severityText = (value: number) => SEVERITY_LABEL[value - SEVERITY_MIN] ?? String(value);

  const number = (value: number | null) =>
    value === null ? 'no data' : String(Math.round(value * 100) / 100);

  function treatmentText(s: Symptom): string {
    if (!s.treated) return 'not treated';
    if (s.improved === null) return 'treated';
    return s.improved ? 'treated and improved' : 'treated and not improved';
  }

  function select(region: BodyRegion) {
    error = null;
    navigate('body', { region });
  }

  function key(e: KeyboardEvent, region: BodyRegion) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    select(region);
  }

  async function logSymptom(e: SubmitEvent) {
    e.preventDefault();
    if (!selected) return;
    const symptom: Symptom = {
      kind,
      severity,
      region: selected.region,
      treated,
      improved: treated ? improved : null,
    };
    saving = true;
    error = null;
    try {
      const d = await getDay();
      await saveDailyCheck({ ...d.check, symptoms: [...d.check.symptoms, symptom] });
      await refresh();
    } catch (err) {
      error = toAppError(err);
    } finally {
      saving = false;
    }
  }
</script>

<section>
  <h1>Body figure</h1>

  {#if !app.assessment}
    <p class="muted" role="status">
      {app.loading ? 'Loading...' : 'The assessment of today is not available.'}
    </p>
  {:else}
    <p class="muted">
      The figure shows the data of today, {missionDayLabel(app.assessment.mission_day)}. Select a
      region to see its symptoms, its indicators and its level.
    </p>
    <div class="layout">
      <div class="card figure">
        <svg viewBox="30 5 280 412" role="group" aria-label="Body regions">
          <text x="110" y="411" text-anchor="middle">Front</text>
          <text x="260" y="84" text-anchor="middle">Back</text>
          {#each regions as r (r.region)}
            <g
              class="region {r.level}"
              class:selected={r.region === selected?.region}
              role="button"
              tabindex="0"
              aria-pressed={r.region === selected?.region}
              aria-label="{REGION_LABEL[r.region]}: {STATE_LABEL[r.level]}"
              onclick={() => select(r.region)}
              onkeydown={(e) => key(e, r.region)}
            >
              <title>{REGION_LABEL[r.region]}: {STATE_LABEL[r.level]}</title>
              {#each SHAPES[r.region] as [x, y, width, height, rx], i (i)}
                <rect {x} {y} {width} {height} {rx} />
              {/each}
            </g>
          {/each}
          <path class="spine" d="M260 101v116" />
        </svg>
        <div class="legend" aria-label="Levels">
          {#each LEVELS as level (level)}
            <LevelBadge state={level} />
          {/each}
        </div>
      </div>

      {#if selected}
        <div class="panel">
          <div class="row">
            <h2>{REGION_LABEL[selected.region]}</h2>
            <LevelBadge state={selected.level} />
          </div>

          <h3>Symptoms of today</h3>
          {#if selected.symptoms.length}
            <ul>
              {#each selected.symptoms as s, i (i)}
                <li>{SYMPTOM_LABEL[s.kind]}: {severityText(s.severity)}, {treatmentText(s)}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">No symptom in this region today.</p>
          {/if}

          <h3>Indicators</h3>
          {#if selected.indicators.length}
            <ul>
              {#each selected.indicators as s (s.indicator)}
                {@const info = INDICATOR_INFO[s.indicator]}
                <li class="indicator">
                  <span class="row">
                    <strong>{info.label} ({info.unit})</strong>
                    <LevelBadge state={s.state} />
                  </span>
                  <span class="muted">
                    Today: {number(s.value)}. 7-day mean: {number(s.mean_7d)}. Baseline:
                    {number(s.baseline?.median ?? null)}.
                  </span>
                  <button
                    class="btn"
                    onclick={() => navigate('trends', { indicator: s.indicator })}
                  >
                    Show the trend
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted">This region has no indicator.</p>
          {/if}

          <h3>Fired rules</h3>
          {#each selected.fired as rule, i (i)}
            <FiredRuleCard {rule} />
          {:else}
            <p class="muted">No rule fired for this region.</p>
          {/each}

          <form class="card form" onsubmit={logSymptom}>
            <h3>Log a symptom in this region</h3>
            <label class="field">
              <span>Symptom</span>
              <select bind:value={kind}>
                {#each SYMPTOM_KINDS as k (k)}
                  <option value={k}>{SYMPTOM_LABEL[k]}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Severity</span>
              <select bind:value={severity}>
                {#each SEVERITIES as n (n)}
                  <option value={n}>{n}: {severityText(n)}</option>
                {/each}
              </select>
            </label>
            <label class="row">
              <input type="checkbox" bind:checked={treated} />
              <span>You treated the symptom</span>
            </label>
            {#if treated}
              <label class="field">
                <span>Result of the treatment</span>
                <select bind:value={improved}>
                  <option value={null}>Not known</option>
                  <option value={true}>The symptom improved</option>
                  <option value={false}>The symptom did not improve</option>
                </select>
              </label>
            {/if}
            {#if error}
              <p class="banner error" role="alert">
                The symptom was not saved. {errorText(error)}
              </p>
            {/if}
            <div class="row">
              <button class="btn primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save the symptom'}
              </button>
            </div>
          </form>
        </div>
      {:else}
        <p class="card muted">Select a region of the figure. The Tab key moves between regions.</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(15rem, 21rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  .figure,
  .panel,
  .form {
    display: grid;
    gap: 0.75rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  svg {
    width: 100%;
    height: auto;
  }
  text {
    fill: var(--muted);
    font-size: 12px;
  }
  .region {
    cursor: pointer;
    outline: none;
  }
  .region rect {
    fill: color-mix(in srgb, var(--c) 30%, var(--surface));
    stroke: var(--c);
    stroke-width: 2;
  }
  .region:hover rect {
    fill: color-mix(in srgb, var(--c) 50%, var(--surface));
  }
  .region.selected rect {
    stroke: var(--text);
    stroke-width: 3.5;
  }
  .region:focus-visible rect {
    stroke: var(--accent);
    stroke-width: 4.5;
  }
  .spine {
    fill: none;
    stroke: var(--muted);
    stroke-dasharray: 3 4;
    pointer-events: none;
  }
  .ok {
    --c: var(--level-ok);
  }
  .self_care {
    --c: var(--level-self-care);
  }
  .tell_cmo {
    --c: var(--level-tell-cmo);
  }
  .flight_surgeon {
    --c: var(--level-flight-surgeon);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.6rem;
  }
  .indicator {
    display: grid;
    gap: 0.3rem;
    justify-items: start;
  }
</style>
