<script lang="ts">
  import { tick } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';

  import { getDay, saveDailyCheck } from '../../lib/api';
  import { errorText, fieldMessage, toAppError } from '../../lib/errors';
  import { minToTime, missionDayLabel, timeToMin } from '../../lib/format';
  import Icon from '../../lib/Icon.svelte';
  import type { IconName } from '../../lib/icons';
  import { RED_FLAG_LABEL, REGION_LABEL, SYMPTOM_LABEL } from '../../lib/labels';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import { openSymptoms } from '../../lib/symptoms';
  import Ticker from '../../lib/Ticker.svelte';
  import {
    BODY_REGIONS,
    FLUID_MAX_L,
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
  import DotSlider from './DotSlider.svelte';
  import FeelFace from './FeelFace.svelte';
  import SleepBar from './SleepBar.svelte';

  type ScaleKey = 'sleep_quality' | 'mood' | 'stress' | 'tiredness' | 'workload';
  type NumberKey = 'fluid_l' | 'exercise_resistive_min' | 'exercise_aerobic_min';
  type ScaleDef = { key: ScaleKey; label: string; icon?: IconName; help: string };

  const SLEEP_QUALITY: ScaleDef = {
    key: 'sleep_quality',
    label: 'Sleep quality',
    help: '0 = very bad sleep. 10 = very good sleep.',
  };

  const SCALES: ScaleDef[] = [
    { key: 'mood', label: 'Mood', icon: 'smile', help: '0 = very bad mood. 10 = very good mood.' },
    { key: 'stress', label: 'Stress', icon: 'wave', help: '0 = no stress. 10 = the highest stress.' },
    { key: 'tiredness', label: 'Tiredness', icon: 'battery', help: '0 = fully awake. 10 = too tired to work.' },
    { key: 'workload', label: 'Workload', icon: 'brief', help: '0 = no work. 10 = more work than you can do.' },
  ];

  const NUMBERS: {
    key: NumberKey;
    label: string;
    short: string;
    icon: IconName;
    help: string;
    step: string;
    unit: string;
    inc: number;
    max: number;
    decimals: number;
  }[] = [
    {
      key: 'fluid_l',
      label: 'Fluid intake (litres)',
      short: 'Fluid intake',
      icon: 'drop',
      help: 'The sum of all drinks of the day.',
      step: '0.1',
      unit: 'L',
      inc: 0.1,
      max: FLUID_MAX_L,
      decimals: 1,
    },
    {
      key: 'exercise_resistive_min',
      label: 'Resistive exercise (minutes)',
      short: 'Resistive exercise',
      icon: 'dumbbell',
      help: 'Exercise against a load. It keeps muscle and bone.',
      step: '1',
      unit: 'min',
      inc: 5,
      max: MINUTES_PER_DAY,
      decimals: 0,
    },
    {
      key: 'exercise_aerobic_min',
      label: 'Aerobic exercise (minutes)',
      short: 'Aerobic exercise',
      icon: 'pulse',
      help: 'Treadmill or cycle exercise. It keeps the heart and the lungs fit.',
      step: '1',
      unit: 'min',
      inc: 5,
      max: MINUTES_PER_DAY,
      decimals: 0,
    },
  ];

  const SEVERITY_LABEL = ['1 = mild', '2 = moderate', '3 = severe'];
  const SEVERITY_SHORT = ['Mild', 'Moderate', 'Severe'];
  const IMPROVED: [boolean | null, string][] = [
    [null, 'Not known'],
    [true, 'Yes'],
    [false, 'No'],
  ];

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
  const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

  let view = $state.raw<DayView | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let savedOk = $state(false);
  let error = $state<AppError | null>(null);

  let startText = $state('');
  let endText = $state('');
  const sleepStart = $derived(clockText(startText));
  const sleepEnd = $derived(clockText(endText));
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

  let draft = $state<Symptom>(newSymptom());

  const sleepHours = $derived(
    sleepStart && sleepEnd
      ? ((timeToMin(sleepEnd) - timeToMin(sleepStart) + MINUTES_PER_DAY) % MINUTES_PER_DAY) / 60
      : null,
  );

  function clockText(text: string): string {
    const m = HHMM.exec(text.trim());
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  }

  function newSymptom(): Symptom {
    return { kind: 'headache', severity: 1, region: 'head', treated: false, improved: null };
  }

  let token = 0;
  let carried = $state(false);

  async function load(date: IsoDate | null) {
    const t = ++token;
    view = null;
    error = null;
    loading = true;
    savedOk = false;
    try {
      const v = await getDay(date);
      const open = await openSymptoms(v);
      if (t !== token) return;
      const a = v.check.answers;
      startText = minToTime(a?.sleep_start_min ?? 23 * 60);
      endText = minToTime(a?.sleep_end_min ?? 7 * 60);
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
      symptoms = open.symptoms.map((s) => ({ ...s }));
      carried = open.carried;
      redFlags = [...v.check.red_flags];
      draft = newSymptom();
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
    symptoms.push({ ...draft, improved: draft.treated ? draft.improved : null });
    draft = newSymptom();
  }

  function editSymptom(i: number) {
    draft = { ...symptoms[i] };
    symptoms.splice(i, 1);
  }

  function setKind(symptom: Symptom, kind: SymptomKind) {
    symptom.kind = kind;
    symptom.region = DEFAULT_REGION[kind] ?? symptom.region;
  }

  function symptomText(s: Symptom) {
    const treated = !s.treated
      ? 'not treated'
      : s.improved === null
        ? 'treated, result not known'
        : s.improved
          ? 'treated, improved'
          : 'treated, not improved';
    return `${SEVERITY_SHORT[s.severity - 1] ?? s.severity}, ${REGION_LABEL[s.region].toLowerCase()}, ${treated}`;
  }

  function step(def: (typeof NUMBERS)[number], dir: 1 | -1, el: HTMLElement | null) {
    const now = numbers[def.key] ?? 0;
    const next = Math.min(def.max, Math.max(0, now + dir * def.inc));
    numbers[def.key] = +next.toFixed(def.decimals);
    if (el && !prefersReducedMotion.current) {
      el.animate(
        [
          { transform: `translateY(${dir > 0 ? 6 : -6}px)`, opacity: 0.35 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
    }
  }

  async function focusFirstInvalid() {
    await tick();
    document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus({ preventScroll: false });
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
      focusFirstInvalid();
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
      savedOk = true;
      saving = false;
      await new Promise((r) => setTimeout(r, prefersReducedMotion.current ? 0 : 520));
      navigate('home');
    } catch (e) {
      error = toAppError(e);
      focusFirstInvalid();
    } finally {
      saving = false;
    }
  }

  const SECTION_ICON: Record<string, IconName> = {
    sleep: 'moon',
    feel: 'smile',
    fluid: 'drop',
    symptoms: 'pulse',
    flags: 'rules',
  };
</script>

{#snippet fieldError(field: string)}
  {@const message = fieldMessage(error, field)}
  {#if message}
    <span class="error" role="alert">{message}</span>
  {/if}
{/snippet}

{#snippet head(id: string, icon: IconName, title: string, note: string)}
  <header>
    <div class="ttl">
      <span class="ic"><Icon name={icon} size={17} /></span>
      <h2 id={id}>{title}</h2>
    </div>
    {#if note}<span class="eyebrow">{note}</span>{/if}
  </header>
{/snippet}

{#snippet scale(def: ScaleDef)}
  {@const field = `answers.${def.key}`}
  <div class="fld">
    <div class="fl">
      <span class="t" id="sc-{def.key}">
        {#if def.icon}<Icon name={def.icon} size={15} />{/if}
        {def.label}
      </span>
      <span class="val"><Ticker value={scales[def.key]} /><small>/ {SCALE_MAX}</small></span>
    </div>
    <DotSlider
      bind:value={scales[def.key]}
      max={SCALE_MAX}
      labelledby="sc-{def.key}"
      describedby="sch-{def.key}"
      invalid={!!invalid(field)}
    />
    <span class="sr" id="sch-{def.key}">{def.help}</span>
    {@render fieldError(field)}
  </div>
{/snippet}

{#snippet timeBox(field: string, label: string, help: string, start: boolean)}
  <div class="fld">
    <label class="tbox" class:bad={invalid(field)}>
      <span>{label}</span>
      {#if start}
        <input
          class="bare"
          type="text"
          inputmode="numeric"
          maxlength="5"
          placeholder="23:00"
          autocomplete="off"
          spellcheck="false"
          bind:value={startText}
          aria-invalid={invalid(field)}
          aria-describedby="h-{field}"
        />
      {:else}
        <input
          class="bare"
          type="text"
          inputmode="numeric"
          maxlength="5"
          placeholder="07:00"
          autocomplete="off"
          spellcheck="false"
          bind:value={endText}
          aria-invalid={invalid(field)}
          aria-describedby="h-{field}"
        />
      {/if}
    </label>
    <span class="sr" id="h-{field}">{help}</span>
    {@render fieldError(field)}
  </div>
{/snippet}

<div class="stack">
  <div class="card dayrow">
    <label class="dayfield">
      <span class="lbl">Day</span>
      <input
        type="date"
        value={app.route.date ?? app.day?.mission.today ?? ''}
        max={app.day?.mission.today}
        aria-invalid={invalid('date')}
        onchange={(e) => {
          if (e.currentTarget.value) navigate('daily_check', { date: e.currentTarget.value });
        }}
      />
    </label>
    {#if view}<p class="small muted">{missionDayLabel(view.mission_day)}</p>{/if}
    {@render fieldError('date')}
  </div>

  {#if error && !view}
    <p class="banner error" role="alert">{errorText(error)}</p>
  {/if}

  {#if loading}
    <p class="muted" role="status">Loading...</p>
  {:else if !view}
    <div>
      <button class="btn" onclick={() => load(app.route.date)}>Try again</button>
    </div>
  {:else}
    <form class="grid g-2" novalidate onsubmit={save}>
      <div class="stack">
        <section class="card rise" style:--i={0} aria-labelledby="dc-sleep">
          {@render head('dc-sleep', SECTION_ICON.sleep, 'Sleep last night', '')}
          <div class="times">
            {@render timeBox('answers.sleep_start_min', 'Sleep start', 'The time when you fell asleep.', true)}
            {@render timeBox('answers.sleep_end_min', 'Sleep end', 'The time when you woke up.', false)}
          </div>
          <div class="fld">
            <div class="dur">
              <span class="eyebrow">Sleep duration</span>
              <span class="big dur-n" aria-live="polite">
                {#if sleepHours === null}
                  <small class="none">enter two times</small>
                {:else}
                  <Ticker value={+num(sleepHours)} decimals={1} /><small>h</small>
                {/if}
              </span>
            </div>
            <SleepBar start={sleepStart} end={sleepEnd} />
          </div>
          {@render scale(SLEEP_QUALITY)}
          <div class="fld">
            <label class="tog">
              <input type="checkbox" bind:checked={sleepAid} />
              <span>Sleep aid taken</span>
            </label>
            {@render fieldError('answers.sleep_aid')}
          </div>
        </section>

        <section class="card rise" style:--i={1} aria-labelledby="dc-feel">
          {@render head('dc-feel', SECTION_ICON.feel, 'How you feel', '')}
          <div class="feel">
            <div class="feel-in">
            <div class="ff">
              <FeelFace
                mood={scales.mood}
                stress={scales.stress}
                tiredness={scales.tiredness}
                workload={scales.workload}
              />
            </div>
            <div class="scales">
              {#each SCALES as def (def.key)}
                {@render scale(def)}
              {/each}
            </div>
            </div>
          </div>
        </section>
      </div>

      <div class="stack">
        <section class="card rise" style:--i={2} aria-labelledby="dc-fluid">
          {@render head('dc-fluid', SECTION_ICON.fluid, 'Fluid and exercise', '')}
          <div class="steps3">
            {#each NUMBERS as def (def.key)}
              {@const field = `answers.${def.key}`}
              <div class="fld">
                <div class="step" class:bad={invalid(field)}>
                  <label for="dc-{def.key}">
                    <Icon name={def.icon} size={14} />
                    {def.short}<span class="sr"> {def.label.slice(def.short.length)}</span>
                  </label>
                  <div class="sv">
                    <input
                      class="bare"
                      id="dc-{def.key}"
                      type="number"
                      min="0"
                      max={def.max}
                      step={def.step}
                      inputmode="decimal"
                      placeholder="0"
                      bind:value={numbers[def.key]}
                      aria-invalid={invalid(field)}
                      aria-describedby="h-{def.key}"
                    />
                    <span class="u">{def.unit}</span>
                  </div>
                  <div class="pm">
                    <button
                      type="button"
                      aria-label="Less {def.label.toLowerCase()}"
                      onclick={(e) =>
                        step(def, -1, e.currentTarget.closest('.step')?.querySelector('input') ?? null)}
                    >
                      &minus;
                    </button>
                    <button
                      type="button"
                      aria-label="More {def.label.toLowerCase()}"
                      onclick={(e) =>
                        step(def, 1, e.currentTarget.closest('.step')?.querySelector('input') ?? null)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <span class="sr" id="h-{def.key}">{def.help}</span>
                {@render fieldError(field)}
              </div>
            {/each}
          </div>
        </section>

        <section class="card rise" style:--i={3} aria-labelledby="dc-sym">
          {@render head(
            'dc-sym',
            SECTION_ICON.symptoms,
            'Symptoms',
            symptoms.length ? `${symptoms.length} logged` : 'None logged',
          )}
          {#if carried && symptoms.length}
            <p class="small muted">From the previous day. Remove a symptom that stopped.</p>
          {/if}
          {#if symptoms.length}
            <ul class="syms">
              {#each symptoms as symptom, i (symptom)}
                <li class="sym pop">
                  <span class="ic"><Icon name="pulse" size={17} /></span>
                  <span>
                    <b>{SYMPTOM_LABEL[symptom.kind]}</b>
                    <span class="s">{symptomText(symptom)}</span>
                  </span>
                  <span class="btns">
                    <button
                      type="button"
                      class="btn ghost sm icon"
                      aria-label="Edit the symptom: {SYMPTOM_LABEL[symptom.kind]}"
                      onclick={() => editSymptom(i)}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      class="btn ghost sm icon"
                      aria-label="Remove the symptom: {SYMPTOM_LABEL[symptom.kind]}"
                      onclick={() => symptoms.splice(i, 1)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </span>
                  <span class="errs">
                    {#each SYMPTOM_FIELDS as name (name)}
                      {@render fieldError(`symptoms[${i}].${name}`)}
                    {/each}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
          <div class="symform">
            <label class="sf">
              <span>Kind</span>
              <select
                value={draft.kind}
                onchange={(e) => setKind(draft, e.currentTarget.value as SymptomKind)}
              >
                {#each SYMPTOM_KINDS as kind (kind)}
                  <option value={kind}>{SYMPTOM_LABEL[kind]}</option>
                {/each}
              </select>
            </label>
            <label class="sf">
              <span>Body region</span>
              <select bind:value={draft.region}>
                {#each BODY_REGIONS as region (region)}
                  <option value={region}>{REGION_LABEL[region]}</option>
                {/each}
              </select>
            </label>
            <div class="sf full">
              <span id="dc-sev">Severity</span>
              <div class="seg" role="group" aria-labelledby="dc-sev">
                {#each SEVERITY_LABEL as label, n (label)}
                  <button
                    type="button"
                    aria-pressed={draft.severity === n + 1}
                    title={label}
                    onclick={() => (draft.severity = n + 1)}
                  >
                    {SEVERITY_SHORT[n]}
                  </button>
                {/each}
              </div>
            </div>
            <label class="tog">
              <input type="checkbox" bind:checked={draft.treated} />
              <span>Treated</span>
            </label>
            {#if draft.treated}
              <div class="sf pop">
                <span id="dc-imp">Improved after treatment</span>
                <div class="seg" role="group" aria-labelledby="dc-imp">
                  {#each IMPROVED as [v, text] (text)}
                    <button
                      type="button"
                      aria-pressed={draft.improved === v}
                      onclick={() => (draft.improved = v)}
                    >
                      {text}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
            <div class="full">
              <button type="button" class="btn" onclick={addSymptom}>
                <Icon name="plus" size={15} />
                Add the symptom
              </button>
            </div>
          </div>
        </section>

        <section class="card rise" style:--i={4} aria-labelledby="dc-flags">
          {@render head('dc-flags', SECTION_ICON.flags, 'Red flags', '')}
          <div class="flags">
            {#each RED_FLAG_KINDS as kind (kind)}
              <label class="tog rf">
                <input type="checkbox" value={kind} bind:group={redFlags} />
                <span>{RED_FLAG_LABEL[kind]}</span>
              </label>
            {/each}
          </div>
          <p class="small muted">One sign sets the level to "Flight surgeon" immediately.</p>
          {@render fieldError('red_flags')}
        </section>

        <section class="card rise savecard" style:--i={5}>
          <div class="savebar">
            <div>
              <b>{view.check.answers || savedOk ? `Saved for ${missionDayLabel(view.mission_day).toLowerCase()}` : 'Not saved yet'}</b>
              {#if view.check.answers || savedOk}
                <div class="small muted hint">A new save replaces it.</div>
              {/if}
            </div>
            <button
              type="submit"
              class="btn primary big save"
              class:ok={savedOk}
              disabled={saving || savedOk}
            >
              {#if savedOk}
                <svg class="tickmark" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
                </svg>
                Saved
              {:else}
                {saving ? 'Saving...' : 'Save'}
              {/if}
            </button>
          </div>
          {#if error}
            <p class="banner error" role="alert">
              {error.kind === 'validation' && error.errors.length > 0
                ? `${error.errors.length === 1 ? '1 field has' : `${error.errors.length} fields have`} an error. Correct ${error.errors.length === 1 ? 'it' : 'them'}, then save again.`
                : errorText(error)}
            </p>
          {/if}
        </section>
      </div>
    </form>
  {/if}
</div>

<style>
  .dayrow {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: end;
    gap: 8px 20px;
    padding: 16px 20px;
  }
  .dayfield {
    display: grid;
    min-width: 190px;
  }
  .dayfield .lbl {
    margin-bottom: 6px;
  }
  .dayrow p {
    padding-bottom: 12px;
  }

  .fld {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .fl {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .fl .t {
    font-weight: 500;
    font-size: 14.5px;
  }
  .val {
    font-size: 24px;
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .val small {
    font-size: 13px;
    color: var(--muted);
    font-weight: 400;
    letter-spacing: 0;
    margin-left: 4px;
  }
  .error {
    color: var(--red);
    font-size: 12.5px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .scales {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .feel {
    container-type: inline-size;
  }
  .feel-in {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .ff {
    width: 124px;
    margin: 0 auto;
  }
  @container (min-width: 440px) {
    .feel-in {
      grid-template-columns: 168px minmax(0, 1fr);
      align-items: center;
      gap: 28px;
    }
    .ff {
      width: 168px;
    }
  }
  .fl .t {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .times {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .tbox {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    cursor: text;
    transition: box-shadow var(--t-fast) var(--ease-out);
  }
  .tbox > span {
    font-size: 12.5px;
    color: var(--muted);
  }
  .tbox:focus-within {
    box-shadow: inset 0 0 0 1.5px var(--ui);
  }
  .tbox.bad,
  .step.bad {
    box-shadow: inset 0 0 0 1.5px var(--red);
  }
  input.bare.bare.bare {
    all: unset;
    display: block;
    width: 100%;
    min-width: 0;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 1.15;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
    caret-color: var(--ui);
  }
  input.bare.bare.bare::placeholder {
    color: var(--faint);
  }
  input.bare.bare.bare[aria-invalid='true'] {
    box-shadow: none !important;
  }

  .dur {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .dur-n {
    font-size: 36px;
  }
  .dur-n .none {
    margin: 0;
  }

  .steps3 {
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 560px) {
    .steps3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .steps3 .step {
      flex: 1;
    }
    .steps3 .sv {
      margin-top: auto;
    }
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: 18px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    transition: box-shadow var(--t-fast) var(--ease-out);
  }
  .step:focus-within {
    box-shadow: inset 0 0 0 1.5px var(--ui);
  }
  .step label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .sv {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .sv input.bare.bare.bare {
    font-size: 30px;
    width: auto;
    field-sizing: content;
    min-width: 1ch;
    max-width: 100%;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .sv input::-webkit-inner-spin-button,
  .sv input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .u {
    font-size: 14px;
    color: var(--muted);
  }
  .pm {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .pm button {
    min-height: 38px;
    border: 0;
    border-radius: 11px;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    color: var(--fg);
    background: linear-gradient(180deg, var(--raise-a), var(--raise-b));
    box-shadow:
      inset 0 1px 0 var(--hi),
      0 0 0 1px var(--line);
    -webkit-tap-highlight-color: transparent;
    transition:
      filter var(--t-fast) var(--ease-out),
      transform var(--t-fast) var(--ease-out);
  }
  @media (hover: hover) { .pm button:hover {
    filter: brightness(1.12);
  } }
  .pm button:active {
    transform: scale(0.94);
  }

  .tog {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 46px;
    padding: 11px 14px;
    border-radius: 14px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    cursor: pointer;
    transition:
      background-color var(--t-fast) var(--ease-out),
      box-shadow var(--t-fast) var(--ease-out);
  }
  @media (hover: hover) { .tog:hover {
    background: var(--well-2);
  } }
  .tog input {
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    margin: 0;
    flex: none;
    border-radius: 6px;
    box-shadow: inset 0 0 0 1.5px var(--faint);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition:
      background-color var(--t-fast) var(--ease-out),
      box-shadow var(--t-fast) var(--ease-out);
  }
  .tog input:checked {
    background: var(--ui);
    box-shadow: none;
  }
  .tog input:checked::after {
    content: '';
    width: 10px;
    height: 5px;
    border: solid var(--on-ui);
    border-width: 0 0 2px 2px;
    transform: translateY(-1px) rotate(-45deg);
    animation: check-in var(--t-mid) var(--ease-spring);
  }
  @keyframes check-in {
    from {
      transform: translateY(-1px) rotate(-45deg) scale(0.4);
      opacity: 0;
    }
  }
  .tog.rf input:checked {
    background: var(--red);
  }
  .tog.rf:has(input:checked) {
    background: color-mix(in srgb, var(--red) 11%, var(--well));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 40%, transparent);
  }
  .flags {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  }

  .syms {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sym {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px 12px;
    padding: 10px 10px 10px 12px;
    border-radius: 16px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .sym b {
    display: block;
    font-weight: 500;
  }
  .sym .s {
    font-size: 12.5px;
    color: var(--muted);
  }
  .sym .btns {
    gap: 2px;
  }
  .errs {
    grid-column: 2 / -1;
    display: flex;
    flex-direction: column;
  }
  .errs:empty {
    display: none;
  }
  .symform {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    align-items: end;
    padding: 16px;
    border-radius: 20px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .symform select {
    background-color: var(--card-b);
  }
  .symform .seg {
    background: var(--card-b);
    display: flex;
  }
  .symform .seg button {
    flex: 1;
  }
  .symform .tog {
    background: var(--card-b);
  }
  .full {
    grid-column: 1 / -1;
  }
  .sf {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .sf > span:first-child {
    font-size: 12.5px;
    color: var(--muted);
  }

  .savebar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 16px;
  }
  .savebar b {
    font-weight: 500;
  }
  @media (max-width: 999px) {
    form {
      padding-bottom: 76px;
    }
    .savecard {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      z-index: 25;
      gap: 8px;
      padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
      border-radius: 0;
      background: color-mix(in srgb, var(--bg) 84%, transparent);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      box-shadow: 0 -1px 0 var(--line);
      animation: bar-up 320ms var(--ease-out) backwards;
    }
    .savecard .savebar {
      flex-wrap: nowrap;
    }
    .savecard .savebar > div {
      flex: 1;
      min-width: 0;
      font-size: 13px;
    }
    .savecard .hint {
      display: none;
    }
    .savecard .save {
      width: auto;
      min-width: 0;
      flex: none;
      min-height: 46px;
      padding: 10px 20px;
      font-size: 15px;
    }
  }
  @keyframes bar-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
  }
  .save {
    min-width: 230px;
    transition:
      background-color var(--t-mid) var(--ease-out),
      color var(--t-mid) var(--ease-out),
      transform var(--t-fast) var(--ease-out);
  }
  .save.ok,
  .save.ok[disabled] {
    opacity: 1;
    background: var(--green);
    color: #04140b;
    animation: pill-pop var(--t-slow) var(--ease-spring);
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
    animation: draw-tick 260ms var(--ease-out) 60ms forwards;
  }
  @keyframes draw-tick {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (max-width: 480px) {
    .times input.bare.bare.bare {
      font-size: 28px;
    }
    .save {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .save.ok {
      animation: none;
    }
    .tickmark path {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
