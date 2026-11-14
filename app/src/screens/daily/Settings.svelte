<script lang="ts">
  import { getSettings, loadScenario, setSettings } from '../../lib/api';
  import { errorText, fieldMessage, toAppError } from '../../lib/errors';
  import { missionDayLabel } from '../../lib/format';
  import { SCENARIO_LABEL } from '../../lib/labels';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { app, refresh } from '../../lib/state.svelte';
  import {
    SCENARIO_IDS,
    type AppError,
    type FieldError,
    type ScenarioId,
    type ScenarioInfo,
    type Settings,
  } from '../../lib/types';

  import { minutesError } from './num';

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

<section>
  <h1>Settings</h1>

  {#if error}
    <p class="banner error" role="alert">{errorText(error)}</p>
  {/if}

  {#if settings}
    <form class="card" novalidate onsubmit={save}>
      <h2>Mission</h2>
      <label class="field">
        <span>Launch date</span>
        <input
          type="date"
          bind:value={launchDate}
          aria-invalid={fieldMessage(error, 'launch_date') ? 'true' : undefined}
        />
        <span class="help">
          The launch date is mission day 0. The days before it are pre-flight days. They give your
          baseline.
        </span>
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
        <span class="help">
          The sum of resistive and aerobic exercise that you must do each day. The exercise rule
          compares your 7-day total with this value.
        </span>
        {@render fieldError('exercise_prescription_min')}
      </label>
      <div class="row">
        <button type="submit" class="btn primary" disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save the settings'}
        </button>
        {#if saved}
          <span role="status">The settings are saved.</span>
        {/if}
      </div>
    </form>
  {:else if loading}
    <p class="muted" role="status">Loading...</p>
  {:else}
    <div>
      <button class="btn" onclick={load}>Try again</button>
    </div>
  {/if}

  <div class="card scenario">
    <h2>Load a scenario</h2>
    <p class="muted">
      A scenario is a prepared mission for a demonstration. It replaces all stored data and sets the
      mission day.
    </p>
    <div class="row">
      {#each SCENARIO_IDS as id (id)}
        <button class="btn" disabled={scenarioBusy} onclick={() => (pending = id)}>
          {SCENARIO_LABEL[id]}
        </button>
      {/each}
    </div>
    {#if pending}
      {@const id = pending}
      <div class="banner warn" role="alert">
        <span>
          The scenario "{SCENARIO_LABEL[id]}" replaces all stored data. You cannot get the data
          back. Continue?
        </span>
        <span class="row">
          <button class="btn primary" onclick={() => replaceData(id)}>Replace the data</button>
          <button class="btn" onclick={() => (pending = null)}>Cancel</button>
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
      <div class="info" role="status">
        <h3>Scenario loaded: {SCENARIO_LABEL[info.id]}</h3>
        <p>{info.description}</p>
        <p>Today is: {missionDayLabel(info.mission_day)}.</p>
        {#if info.expected.length > 0}
          <p>First mission day of each expected level:</p>
          <ul>
            {#each info.expected as expected (expected.level)}
              <li class="row">
                <LevelBadge state={expected.level} />
                <span>{missionDayLabel(expected.first_mission_day)}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  form,
  .scenario,
  .info {
    display: grid;
    gap: 0.9rem;
  }
  form .field {
    justify-items: start;
  }
  .info {
    gap: 0.5rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--border);
  }
  ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
