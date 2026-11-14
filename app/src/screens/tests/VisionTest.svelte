<script lang="ts">
  import { getSettings, saveVisionTest, setSettings } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import Icon from '../../lib/Icon.svelte';
  import LevelBadge from '../../lib/LevelBadge.svelte';
  import { calibrationFits, calibrationSaved } from '../../lib/scale';
  import { app, navigate, refresh } from '../../lib/state.svelte';
  import {
    VIEWING_DISTANCE_CM,
    type AmslerCell,
    type AppError,
    type EyeResult,
    type Indicator,
    type Settings,
    type VisionResult,
  } from '../../lib/types';
  import Acuity from './Acuity.svelte';
  import Amsler from './Amsler.svelte';
  import Calibration from './Calibration.svelte';

  type Step = 'intro' | 'calibrate' | 'acuity' | 'amsler' | 'saving' | 'done' | 'failed';

  const EYES = ['right', 'left'] as const;

  let settings = $state<Settings | null>(null);
  let loadError = $state<AppError | null>(null);
  let step = $state<Step>('intro');

  $effect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-test-running', step === 'acuity' || step === 'amsler');
    return () => root.removeAttribute('data-test-running');
  });
  let eyeIndex = $state(0);
  let busy = $state(false);
  let error = $state<AppError | null>(null);
  let saved = $state<VisionResult | null>(null);

  let acuity = 0;
  let results: EyeResult[] = [];

  let fits = $state(calibrationFits());
  const calibration = $derived(fits ? (settings?.calibration ?? null) : null);
  const shown = $derived(step === 'done' ? saved : (app.day?.vision ?? null));
  const due = $derived(app.day?.mission.due.some((t) => t.kind === 'vision_test') ?? false);

  const stateOf = (indicator: Indicator) =>
    app.assessment?.indicators.find((s) => s.indicator === indicator)?.state;

  $effect(() => {
    void app.revision;
    getSettings().then(
      (s) => {
        settings = s;
        loadError = null;
      },
      (e) => {
        loadError = toAppError(e);
      },
    );
  });

  async function saveCalibration(px_per_mm: number) {
    if (!settings) return;
    busy = true;
    error = null;
    try {
      const next = { ...settings, calibration: { px_per_mm } };
      await setSettings(next);
      calibrationSaved();
      fits = true;
      settings = next;
      await refresh();
      step = 'intro';
    } catch (e) {
      error = toAppError(e);
    } finally {
      busy = false;
    }
  }

  function start() {
    if (!calibration || !app.day) return;
    results = [];
    eyeIndex = 0;
    error = null;
    step = 'acuity';
  }

  function acuityDone(logmar: number) {
    acuity = logmar;
    step = 'amsler';
  }

  function amslerDone(amsler_distortion: boolean, amsler_cells: AmslerCell[]) {
    results.push({ acuity_logmar: acuity, amsler_distortion, amsler_cells });
    if (results.length < EYES.length) {
      eyeIndex = results.length;
      step = 'acuity';
    } else {
      save();
    }
  }

  const steps = $derived.by(() => {
    const flow = step === 'acuity' || step === 'amsler';
    const eyeText = `${EYES[eyeIndex]} eye`;
    return [
      {
        title: 'Calibrate the screen',
        sub: calibration
          ? `${calibration.px_per_mm.toFixed(2)} px for each mm.`
          : 'With a bank card, once for each screen.',
        done: calibration != null,
        now: step === 'calibrate' || !calibration,
      },
      {
        title: 'Near acuity, each eye',
        sub: flow && step === 'acuity' ? `Now: ${eyeText}.` : 'A tumbling E, 5 trials for each size.',
        done: flow ? eyeIndex === EYES.length - 1 && step === 'amsler' : shown != null,
        now: flow && step === 'acuity',
      },
      {
        title: 'Amsler grid, each eye',
        sub: flow && step === 'amsler' ? `Now: ${eyeText}.` : 'Mark each area where the lines look wavy.',
        done: flow ? false : shown != null,
        now: flow && step === 'amsler',
      },
    ];
  });

  async function save() {
    if (!app.day) return;
    step = 'saving';
    error = null;
    try {
      const result = { date: app.day.mission.today, right: results[0], left: results[1] };
      await saveVisionTest(result);
      saved = result;
      await refresh();
      step = 'done';
    } catch (e) {
      error = toAppError(e);
      step = 'failed';
    }
  }
</script>

{#snippet eyeResult(eye: 'left' | 'right', r: EyeResult, i: number)}
  {@const acuityState = stateOf(`acuity_${eye}`)}
  {@const amslerState = stateOf(`amsler_${eye}`)}
  <div class="eye rise" style:--i={i}>
    <h3>{eye === 'left' ? 'Left eye' : 'Right eye'}</h3>
    <div class="kv">
      <span>Near acuity <span class="num">logMAR {r.acuity_logmar.toFixed(1)}</span></span>
      {#if acuityState}<LevelBadge state={acuityState} />{/if}
    </div>
    <div class="kv">
      <span>
        Amsler grid:
        {r.amsler_distortion
          ? `distortion, ${r.amsler_cells.length} marked cells`
          : 'no distortion'}
      </span>
      {#if amslerState}<LevelBadge state={amslerState} />{/if}
    </div>
  </div>
{/snippet}

{#snippet stepList()}
  <ol class="vsteps">
    {#each steps as s, k (k)}
      <li class="vstep" class:now={s.now}>
        <span class="n" class:ok={s.done}>
          {#if s.done}
            <span class="tick pop"><Icon name="check" size={15} /></span>
          {:else}
            {k + 1}
          {/if}
        </span>
        <span>
          <b>{s.title}</b>
          <span class="s">{s.sub}</span>
        </span>
        {#if s.done}
          <span class="okd pop">Done</span>
        {:else if s.now}
          <span class="nowd">Now</span>
        {:else}
          <span></span>
        {/if}
      </li>
    {/each}
  </ol>
{/snippet}

{#if loadError}
  <p class="banner error" role="alert">
    The settings are not available. {errorText(loadError)}
  </p>
{:else if !settings || !app.day}
  <p class="muted" role="status">
    {!settings || app.loading ? 'Loading...' : 'The data of today is not available.'}
  </p>
{:else if step === 'calibrate' || !calibration}
  <div class="grid g-7-5">
    <div class="stack">
      {#if !calibration}
        <p class="banner warn" role="alert">
          Calibrate the screen first. The letter size depends on it.
        </p>
      {/if}
      {#if error}
        <p class="banner error" role="alert">The calibration was not saved. {errorText(error)}</p>
      {/if}
      <Calibration
        pxPerMm={calibration?.px_per_mm ?? null}
        {busy}
        onsave={saveCalibration}
        oncancel={calibration ? () => (step = 'intro') : null}
      />
    </div>
    <section class="card" aria-labelledby="v-s">
      <header><h2 id="v-s">Steps</h2></header>
      {@render stepList()}
    </section>
  </div>
{:else if step === 'acuity' || step === 'amsler'}
  <div class="grid g-7-5">
    {#key `${step}-${eyeIndex}`}
      <div class="flow">
        {#if step === 'acuity'}
          <Acuity eye={EYES[eyeIndex]} pxPerMm={calibration.px_per_mm} ondone={acuityDone} />
        {:else}
          <Amsler eye={EYES[eyeIndex]} pxPerMm={calibration.px_per_mm} ondone={amslerDone} />
        {/if}
      </div>
    {/key}
    <section class="card" aria-labelledby="v-s">
      <header>
        <h2 id="v-s">Eye {eyeIndex + 1} of {EYES.length}</h2>
        <button class="btn ghost sm" onclick={() => (step = 'intro')}>Stop</button>
      </header>
      {@render stepList()}
    </section>
  </div>
{:else if step === 'saving'}
  <p class="muted" role="status">The test is complete. Saving the result...</p>
{:else if step === 'failed' && error}
  <div class="banner error" role="alert">
    <span>The result was not saved. {errorText(error)}</span>
    <span class="btns">
      <button class="btn sm primary" onclick={save}>Save again</button>
      <button class="btn sm" onclick={() => (step = 'intro')}>Discard the test</button>
    </span>
  </div>
{:else}
  <div class="grid g-7-5">
    <section class="card" aria-labelledby="v-t">
      <header>
        <div class="ttl">
          <span class="ic"><Icon name="eye" /></span>
          <h2 id="v-t">Weekly vision test</h2>
        </div>
        <span class="eyebrow">{due ? 'Due now' : 'Not due today'}</span>
      </header>
      <p>One eye at a time. Hold the screen at {VIEWING_DISTANCE_CM} cm.</p>
      {@render stepList()}
      <div class="btns">
        <button class="btn primary" onclick={start}>
          {shown ? 'Start again' : 'Start'}
        </button>
        <button class="btn" onclick={() => (step = 'calibrate')}>Calibrate again</button>
      </div>
      {#if shown}
        <p class="small muted">A new test replaces the result of today.</p>
      {/if}
    </section>

    <div class="stack">
      {#if shown}
        <section class="card" aria-labelledby="v-r">
          <header>
            <h2 id="v-r">{step === 'done' ? 'Your result' : 'Result of today'}</h2>
          </header>
          {@render eyeResult('right', shown.right, 0)}
          {@render eyeResult('left', shown.left, 1)}
          <p class="small muted">
            Near acuity: logMAR 0.0 is normal vision. A lower value is better. Amsler grid: a
            distortion can be a sign of a change in the retina.
          </p>
          {#if step === 'done'}
            <div class="btns">
              <button class="btn primary" onclick={() => navigate('home')}>
                Go to Today
              </button>
            </div>
          {/if}
        </section>
      {/if}
      <section class="card" aria-labelledby="v-h">
        <header><h2 id="v-h">Before you start</h2></header>
        <ol class="tips">
          <li>Put your eyes {VIEWING_DISTANCE_CM} cm from the screen. Measure the distance.</li>
          <li>Use the same light and the same glasses each week.</li>
          <li>Cover the other eye with your hand.</li>
        </ol>
      </section>
    </div>
  </div>
{/if}

<style>
  .flow {
    min-width: 0;
    animation: flow-in var(--t-slow) var(--ease-out) backwards;
  }
  .vsteps {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .vstep {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 16px;
    background: var(--well);
    box-shadow: inset 0 0 0 1px var(--line);
    transition: box-shadow var(--t-mid) var(--ease-out);
  }
  .vstep.now {
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--ui) 55%, transparent);
  }
  .n {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 500;
    background: linear-gradient(180deg, var(--raise-a), var(--raise-b));
    box-shadow: inset 0 1px 0 var(--hi), 0 0 0 1px var(--line);
  }
  .n.ok {
    color: var(--green);
  }
  .tick {
    display: grid;
    place-items: center;
  }
  .vstep b {
    display: block;
    font-weight: 500;
  }
  .s {
    display: block;
    font-size: 12.5px;
    color: var(--muted);
  }
  .okd {
    font-size: 12.5px;
    color: var(--green);
  }
  .nowd {
    font-size: 12.5px;
    color: var(--ui);
  }
  .eye {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .kv {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px 12px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }
  .tips {
    list-style: decimal;
    padding-left: 1.2rem;
    display: grid;
    gap: 6px;
    color: var(--muted);
  }
  @keyframes flow-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
