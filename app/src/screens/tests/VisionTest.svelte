<script lang="ts">
  import { getSettings, saveVisionTest, setSettings } from '../../lib/api';
  import { errorText, toAppError } from '../../lib/errors';
  import LevelBadge from '../../lib/LevelBadge.svelte';
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
  let eyeIndex = $state(0);
  let busy = $state(false);
  let error = $state<AppError | null>(null);
  let saved = $state<VisionResult | null>(null);

  let acuity = 0;
  let results: EyeResult[] = [];

  const calibration = $derived(settings?.calibration ?? null);
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

{#snippet eyeResult(eye: 'left' | 'right', r: EyeResult)}
  {@const acuityState = stateOf(`acuity_${eye}`)}
  {@const amslerState = stateOf(`amsler_${eye}`)}
  <div class="eye">
    <h3>{eye === 'left' ? 'Left eye' : 'Right eye'}</h3>
    <p class="row">
      <span>Near acuity: logMAR {r.acuity_logmar.toFixed(1)}</span>
      {#if acuityState}<LevelBadge state={acuityState} />{/if}
    </p>
    <p class="row">
      <span>
        Amsler grid:
        {r.amsler_distortion
          ? `distortion, ${r.amsler_cells.length} marked cells`
          : 'no distortion'}
      </span>
      {#if amslerState}<LevelBadge state={amslerState} />{/if}
    </p>
  </div>
{/snippet}

<section>
  <h1>Vision test</h1>

  {#if loadError}
    <p class="banner error" role="alert">
      The settings are not available. {errorText(loadError)}
    </p>
  {:else if !settings || !app.day}
    <p class="muted" role="status">
      {!settings || app.loading ? 'Loading...' : 'The data of today is not available.'}
    </p>
  {:else if step === 'calibrate' || !calibration}
    {#if !calibration}
      <p class="banner warn" role="alert">
        The vision test cannot start without a calibration. Do the calibration first.
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
  {:else if step === 'acuity' || step === 'amsler'}
    <p class="row">
      <span class="muted">Eye {eyeIndex + 1} of {EYES.length}</span>
      <button class="btn" onclick={() => (step = 'intro')}>Stop the test</button>
    </p>
    {#if step === 'acuity'}
      <Acuity eye={EYES[eyeIndex]} pxPerMm={calibration.px_per_mm} ondone={acuityDone} />
    {:else}
      <Amsler eye={EYES[eyeIndex]} pxPerMm={calibration.px_per_mm} ondone={amslerDone} />
    {/if}
  {:else if step === 'saving'}
    <p class="muted" role="status">The test is complete. Saving the result...</p>
  {:else if step === 'failed' && error}
    <div class="banner error" role="alert">
      <span>The result was not saved. {errorText(error)}</span>
      <span class="row">
        <button class="btn primary" onclick={save}>Save again</button>
        <button class="btn" onclick={() => (step = 'intro')}>Discard the test</button>
      </span>
    </div>
  {:else}
    {#if shown}
      <div class="card block">
        <h2>{step === 'done' ? 'Your result' : 'Result of today'}</h2>
        <div class="grid">
          {@render eyeResult('right', shown.right)}
          {@render eyeResult('left', shown.left)}
        </div>
        <p class="muted">
          Near acuity: logMAR 0.0 is normal vision. A lower value is better. Amsler grid: a
          distortion can be a sign of a change in the retina.
        </p>
        {#if step === 'done'}
          <div class="row">
            <button class="btn primary" onclick={() => navigate('home')}>
              Go to the home screen
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <div class="card block">
      <h2>How the test works</h2>
      <p>
        Do this test one time each week. It finds changes in your near vision. Long spaceflight can
        change the eyes.
      </p>
      <ol>
        <li>Put your eyes {VIEWING_DISTANCE_CM} cm from the screen. Measure the distance.</li>
        <li>Use the same light and the same glasses each week.</li>
        <li>You test one eye at a time. Cover the other eye with your hand.</li>
        <li>Near acuity: tell the direction of the letter E. The letter becomes smaller.</li>
        <li>Amsler grid: look at the center dot and tell if the lines are straight.</li>
      </ol>
      {#if due}
        <p class="banner info">The weekly vision test is due.</p>
      {/if}
      {#if shown}
        <p class="muted">A new test replaces the result of today.</p>
      {/if}
      <p class="muted">
        Calibration: {calibration.px_per_mm.toFixed(2)} px for each mm of the display.
      </p>
      <div class="row">
        <button class="btn primary" onclick={start}>
          {shown ? 'Start the test again' : 'Start the test'}
        </button>
        <button class="btn" onclick={() => (step = 'calibrate')}>Do the calibration again</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .block,
  .eye {
    display: grid;
    gap: 0.75rem;
    align-content: start;
  }
  .eye {
    gap: 0.4rem;
  }
  ol {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.3rem;
  }
</style>
