<script lang="ts">
  import {
    ACUITY_MIN_CORRECT,
    ACUITY_TRIALS_PER_SIZE,
    LOGMAR_STEP,
    VIEWING_DISTANCE_CM,
  } from '../../lib/types';

  let {
    eye,
    pxPerMm,
    ondone,
  }: {
    eye: 'left' | 'right';
    pxPerMm: number;
    ondone: (logmar: number) => void;
  } = $props();

  const DIRECTIONS = ['right', 'down', 'left', 'up'] as const;
  type Direction = (typeof DIRECTIONS)[number];

  const KEYS: Record<string, Direction> = {
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowUp: 'up',
  };
  const START_LOGMAR = 1;
  const BEST_LOGMAR = -0.3;
  const E_UNITS = 5;

  const logmarAt = (index: number) => Math.round((START_LOGMAR - index * LOGMAR_STEP) * 10) / 10;

  function sizePx(logmar: number): number {
    const angle = ((E_UNITS * 10 ** logmar) / 60) * (Math.PI / 180);
    return 2 * VIEWING_DISTANCE_CM * 10 * Math.tan(angle / 2) * pxPerMm;
  }

  const canShow = (index: number) =>
    logmarAt(index) >= BEST_LOGMAR &&
    sizePx(logmarAt(index)) * window.devicePixelRatio >= E_UNITS;

  const PAD: Direction[] = ['up', 'left', 'right', 'down'];

  const randomDirection = () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

  let started = $state(false);
  let index = $state(0);
  let trial = $state(0);
  let direction = $state(randomDirection());
  let correct = 0;

  const size = $derived(sizePx(logmarAt(index)));
  const box = $derived(Math.max(160, sizePx(START_LOGMAR) * 2));

  function answer(given: Direction) {
    if (given === direction) correct += 1;
    if (trial + 1 < ACUITY_TRIALS_PER_SIZE) {
      trial += 1;
      direction = randomDirection();
      return;
    }
    if (correct < ACUITY_MIN_CORRECT) {
      ondone(logmarAt(index - 1));
      return;
    }
    if (!canShow(index + 1)) {
      ondone(logmarAt(index));
      return;
    }
    index += 1;
    trial = 0;
    correct = 0;
    direction = randomDirection();
  }

  function key(e: KeyboardEvent) {
    const given = KEYS[e.key];
    if (!started || !given) return;
    e.preventDefault();
    if (!e.repeat) answer(given);
  }
</script>

<svelte:window onkeydown={key} />

<div class="card acuity">
  <h2>Near acuity, {eye} eye</h2>
  <p>
    Cover your {eye === 'left' ? 'right' : 'left'} eye. Keep your {eye} eye
    {VIEWING_DISTANCE_CM} cm from the screen.
  </p>
  <p>
    The screen shows the letter E. The open side of the E points up, down, left or right. Press the
    arrow key for that direction, or use the buttons. If you cannot see the direction, select one
    direction.
  </p>
  {#if started}
    <div class="chart" style:width="{box}px" style:height="{box}px">
      <svg
        viewBox="0 0 5 5"
        width={size}
        height={size}
        role="img"
        aria-label="Letter E"
        shape-rendering="crispEdges"
      >
        <path
          d="M0 0h5v1H1v1h4v1H1v1h4v1H0z"
          transform="rotate({DIRECTIONS.indexOf(direction) * 90} 2.5 2.5)"
        />
      </svg>
    </div>
    <p class="muted" role="status">
      Size: logMAR {logmarAt(index).toFixed(1)}. Trial {trial + 1} of {ACUITY_TRIALS_PER_SIZE}.
    </p>
    <div class="pad">
      {#each PAD as d (d)}
        <button class="btn {d}" onclick={() => answer(d)}>{d[0].toUpperCase() + d.slice(1)}</button>
      {/each}
    </div>
  {:else}
    <div class="row">
      <button class="btn primary" onclick={() => (started = true)}>
        Start with the {eye} eye
      </button>
    </div>
  {/if}
</div>

<style>
  .acuity {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }
  .chart {
    display: grid;
    place-items: center;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  path {
    fill: #000;
  }
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 5.5rem);
    grid-template-areas:
      '. up .'
      'left . right'
      '. down .';
    gap: 0.4rem;
  }
  .up {
    grid-area: up;
  }
  .down {
    grid-area: down;
  }
  .left {
    grid-area: left;
  }
  .right {
    grid-area: right;
  }
</style>
