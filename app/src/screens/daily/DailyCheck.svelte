<script lang="ts">
  import { getDay, saveDailyCheck } from '../../lib/api';
  import { errorText, fieldMessage, toAppError } from '../../lib/errors';
  import { minToTime, missionDayLabel, timeToMin } from '../../lib/format';
  import { RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import {
    BODY_REGIONS,
    MINUTES_PER_DAY,
    RED_FLAG_KINDS,
    SCALE_MAX,
    SYMPTOM_KINDS,
    type AppError,
    type BodyRegion,
    type DayView,
    type FieldError,
    type IsoDate,
    type RedFlagKind,
    type Symptom,
    type SymptomKind,
  } from '../../lib/types';
  import { minutesError, num } from './num';

  type ScaleKey = 'sleep_quality' | 'mood' | 'stress' | 'tiredness' | 'workload';
  type NumberKey = 'fluid_l' | 'exercise_resistive_min' | 'exercise_aerobic_min';
  type ScaleDef = { key: ScaleKey; label: string; help: string };

  const SLEEP_QUALITY: ScaleDef = {
    key: 'sleep_quality',
    label: 'Sleep quality',
    help: '0 = very bad sleep. 10 = very good sleep.',
  };

  const SCALES: ScaleDef[] = [
    { key: 'mood', label: 'Mood', help: '0 = very bad mood. 10 = very good mood.' },
    { key: 'stress', label: 'Stress', help: '0 = no stress. 10 = the highest stress.' },
    { key: 'tiredness', label: 'Tiredness', help: '0 = fully awake. 10 = too tired to work.' },
    { key: 'workload', label: 'Workload', help: '0 = no work. 10 = more work than you can do.' },
  ];

  const NUMBERS: { key: NumberKey; label: string; help: string; step: string }[] = [
    {
      key: 'fluid_l',
      label: 'Fluid intake (litres)',
      help: 'The sum of all drinks of the day.',
      step: '0.1',
    },
    {
      key: 'exercise_resistive_min',
      label: 'Resistive exercise (minutes)',
      help: 'Exercise against a load. It keeps muscle and bone.',
      step: '1',
    },
    {
      key: 'exercise_aerobic_min',
      label: 'Aerobic exercise (minutes)',
      help: 'Treadmill or cycle exercise. It keeps the heart and the lungs fit.',
      step: '1',
    },
  ];

  const SEVERITY_LABEL = ['1 = mild', '2 = moderate', '3 = severe'];

  const DEFAULT_REGION: Partial<Record<SymptomKind, BodyRegion>> = {
    headache: 'head',
    congestion: 'head',
    back_pain: 'back',
    nausea: 'abdomen',
    dizziness: 'head',
    vision_change: 'eyes',
  };

  const SYMPTOM_FIELDS = ['kind', 'severity', 'region', 'treated', 'improved'];
  const REQUIRED = 'Enter a value.';

  let view = $state.raw<DayView | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<AppError | null>(null);

  let sleepStart = $state('');
  let sleepEnd = $state('');
  let sleepAid = $state(false);
  let scales = $state<Record<ScaleKey, number>>({
    sleep_quality: 5,
    mood: 5,
    stress: 5,
    tiredness: 5,
    workload: 5,
  });
  let numbers = $state<Record<NumberKey, number | null>>({
    fluid_l: null,
    exercise_resistive_min: null,
    exercise_aerobic_min: null,
  });
  let symptoms = $state<Symptom[]>([]);
  let redFlags = $state<RedFlagKind[]>([]);

  const sleepHours = $derived(
    sleepStart && sleepEnd
      ? ((timeToMin(sleepEnd) - timeToMin(sleepStart) + MINUTES_PER_DAY) % MINUTES_PER_DAY) / 60
      : null,
  );

  let token = 0;

  async function load(date: IsoDate | null) {
    const t = ++token;
    view = null;
    error = null;
    loading = true;
    try {
      const v = await getDay(date);
      if (t !== token) return;
      const a = v.check.answers;
      sleepStart = minToTime(a?.sleep_start_min ?? 23 * 60);
      sleepEnd = minToTime(a?.sleep_end_min ?? 7 * 60);
      sleepAid = a?.sleep_aid ?? false;
      scales = {
        sleep_quality: a?.sleep_quality ?? 5,
        mood: a?.mood ?? 5,
        stress: a?.stress ?? 5,
        tiredness: a?.tiredness ?? 5,
        workload: a?.workload ?? 5,
      };
      numbers = {
        fluid_l: a?.fluid_l ?? null,
        exercise_resistive_min: a?.exercise_resistive_min ?? null,
        exercise_aerobic_min: a?.exercise_aerobic_min ?? null,
      };
      symptoms = v.check.symptoms.map((s) => ({ ...s }));
      redFlags = [...v.check.red_flags];
      view = v;
    } catch (e) {
      if (t === token) error = toAppError(e);
    } finally {
      if (t === token) loading = false;
    }
  }

  $effect(() => {
    load(app.route.date);
  });

  function invalid(field: string) {
    return fieldMessage(error, field) ? 'true' : undefined;
  }

  function addSymptom() {
    symptoms.push({ kind: 'headache', severity: 1, region: 'head', treated: false, improved: null });
  }

  function setKind(symptom: Symptom, kind: SymptomKind) {
    symptom.kind = kind;
    symptom.region = DEFAULT_REGION[kind] ?? symptom.region;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!view) return;
    const fluid = numbers.fluid_l;
    const resistive = numbers.exercise_resistive_min;
    const aerobic = numbers.exercise_aerobic_min;
    const missing: FieldError[] = [];
    if (!sleepStart) missing.push({ field: 'answers.sleep_start_min', message: REQUIRED });
    if (!sleepEnd) missing.push({ field: 'answers.sleep_end_min', message: REQUIRED });
    if (fluid == null) missing.push({ field: 'answers.fluid_l', message: REQUIRED });
    for (const key of ['exercise_resistive_min', 'exercise_aerobic_min'] as const) {
      const message = minutesError(numbers[key]);
      if (message) missing.push({ field: `answers.${key}`, message });
    }
    if (missing.length > 0 || fluid == null || resistive == null || aerobic == null) {
      error = { kind: 'validation', errors: missing };
      return;
    }
    saving = true;
    error = null;
    try {
      await saveDailyCheck({
        date: view.date,
        answers: {
          sleep_start_min: timeToMin(sleepStart),
          sleep_end_min: timeToMin(sleepEnd),
          sleep_aid: sleepAid,
          ...scales,
          fluid_l: fluid,
          exercise_resistive_min: resistive,
          exercise_aerobic_min: aerobic,
        },
        symptoms: symptoms.map((s) => ({ ...s, improved: s.treated ? s.improved : null })),
        red_flags: [...redFlags],
      });
      await refresh();
      navigate('home');
    } catch (e) {
      error = toAppError(e);
    } finally {
      saving = false;
    }
  }
</script>

{#snippet fieldError(field: string)}
  {@const message = fieldMessage(error, field)}
  {#if message}
    <span class="error" role="alert">{message}</span>
  {/if}
{/snippet}

{#snippet scale(def: ScaleDef)}
  {@const field = `answers.${def.key}`}
  <label class="field">
    <span>{def.label}: {scales[def.key]}</span>
    <input
      type="range"
      min="0"
      max={SCALE_MAX}
      step="1"
      bind:value={scales[def.key]}
      aria-invalid={invalid(field)}
    />
    <span class="help">{def.help}</span>
    {@render fieldError(field)}
  </label>
{/snippet}

<section>
  <h1>Daily check</h1>

  <label class="field date">
    <span>Day</span>
    <input
      type="date"
      value={app.route.date ?? app.day?.mission.today ?? ''}
      max={app.day?.mission.today}
      aria-invalid={invalid('date')}
      onchange={(e) => {
        if (e.currentTarget.value) navigate('daily_check', { date: e.currentTarget.value });
      }}
    />
    <span class="help">
      {view ? `${missionDayLabel(view.mission_day)}. ` : ''}Select a past day to correct its check.
    </span>
    {@render fieldError('date')}
  </label>

  {#if error}
    <p class="banner error" role="alert">{errorText(error)}</p>
  {/if}

  {#if loading}
    <p class="muted" role="status">Loading...</p>
  {:else if !view}
    <div>
      <button class="btn" onclick={() => load(app.route.date)}>Try again</button>
    </div>
  {:else}
    <form novalidate onsubmit={save}>
      <fieldset class="card">
        <legend>Sleep</legend>
        <div class="fields">
          <label class="field">
            <span>Sleep start</span>
            <input
              type="time"
              bind:value={sleepStart}
              aria-invalid={invalid('answers.sleep_start_min')}
            />
            <span class="help">The time when you fell asleep.</span>
            {@render fieldError('answers.sleep_start_min')}
          </label>
          <label class="field">
            <span>Sleep end</span>
            <input
              type="time"
              bind:value={sleepEnd}
              aria-invalid={invalid('answers.sleep_end_min')}
            />
            <span class="help">
              The time when you woke up.
              {sleepHours === null ? '' : `Sleep duration: ${num(sleepHours)} h.`}
            </span>
            {@render fieldError('answers.sleep_end_min')}
          </label>
          {@render scale(SLEEP_QUALITY)}
          <div class="field">
            <label class="check">
              <input type="checkbox" bind:checked={sleepAid} />
              Sleep aid taken
            </label>
            <span class="help">Set this if you took a medication to sleep.</span>
            {@render fieldError('answers.sleep_aid')}
          </div>
        </div>
      </fieldset>

      <fieldset class="card">
        <legend>How you feel</legend>
        <div class="fields">
          {#each SCALES as def (def.key)}
            {@render scale(def)}
          {/each}
        </div>
      </fieldset>

      <fieldset class="card">
        <legend>Fluid and exercise</legend>
        <div class="fields">
          {#each NUMBERS as def (def.key)}
            {@const field = `answers.${def.key}`}
            <label class="field">
              <span>{def.label}</span>
              <input
                type="number"
                min="0"
                step={def.step}
                inputmode="decimal"
                bind:value={numbers[def.key]}
                aria-invalid={invalid(field)}
              />
              <span class="help">{def.help}</span>
              {@render fieldError(field)}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="card">
        <legend>Symptoms</legend>
        <p class="help">
          Record each symptom that you have on this day. Set "Treated" if you took a treatment. Then
          tell if the symptom improved.
        </p>
        {#each symptoms as symptom, i}
          <div class="symptom">
            <label class="field">
              <span>Kind</span>
              <select
                value={symptom.kind}
                aria-invalid={invalid(`symptoms[${i}].kind`)}
                onchange={(e) => setKind(symptom, e.currentTarget.value as SymptomKind)}
              >
                {#each SYMPTOM_KINDS as kind (kind)}
                  <option value={kind}>{SYMPTOM_LABEL[kind]}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Severity</span>
              <select
                bind:value={symptom.severity}
                aria-invalid={invalid(`symptoms[${i}].severity`)}
              >
                {#each SEVERITY_LABEL as label, n (label)}
                  <option value={n + 1}>{label}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Body region</span>
              <select bind:value={symptom.region} aria-invalid={invalid(`symptoms[${i}].region`)}>
                {#each BODY_REGIONS as region (region)}
                  <option value={region}>{REGION_LABEL[region]}</option>
                {/each}
              </select>
            </label>
            <label class="check">
              <input type="checkbox" bind:checked={symptom.treated} />
              Treated
            </label>
            {#if symptom.treated}
              <label class="field">
                <span>Improved after treatment</span>
                <select
                  value={String(symptom.improved)}
                  aria-invalid={invalid(`symptoms[${i}].improved`)}
                  onchange={(e) => (symptom.improved = JSON.parse(e.currentTarget.value))}
                >
                  <option value="null">Not known</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            {/if}
            <button type="button" class="btn" onclick={() => symptoms.splice(i, 1)}>Remove</button>
            <div class="field errors">
              {#each SYMPTOM_FIELDS as name (name)}
                {@render fieldError(`symptoms[${i}].${name}`)}
              {/each}
            </div>
          </div>
        {/each}
        <div>
          <button type="button" class="btn" onclick={addSymptom}>Add a symptom</button>
        </div>
      </fieldset>

      <fieldset class="card">
        <legend>Red flags</legend>
        <p class="help">
          Set each sign that you have on this day. One sign sets the level to "Flight surgeon"
          immediately.
        </p>
        <div class="fields">
          {#each RED_FLAG_KINDS as kind (kind)}
            <label class="check">
              <input type="checkbox" value={kind} bind:group={redFlags} />
              {RED_FLAG_LABEL[kind]}
            </label>
          {/each}
        </div>
        <div class="field">
          {@render fieldError('red_flags')}
        </div>
      </fieldset>

      <div class="row">
        <button type="submit" class="btn primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save the daily check'}
        </button>
        <span class="muted">A second save for the same day replaces the first.</span>
      </div>
    </form>
  {/if}
</section>

<style>
  form {
    display: grid;
    gap: 1rem;
  }
  fieldset {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    min-width: 0;
  }
  legend {
    padding: 0 0.4rem;
    font-weight: 700;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    align-items: start;
  }
  .date {
    justify-items: start;
  }
  .help {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }
  .symptom {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .symptom .check {
    padding-bottom: 0.5rem;
  }
  .errors {
    flex-basis: 100%;
  }
  .errors:empty {
    display: none;
  }
</style>
