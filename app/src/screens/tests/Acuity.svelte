<script lang="ts">
  import {
    ACUITY_MIN_CORRECT,
    ACUITY_TRIALS_PER_SIZE,
    LOGMAR_STEP,
    VIEWING_DISTANCE_CM,
  } from '../../lib/types';
  import Icon from '../../lib/Icon.svelte';

  let {
    eye,
    pxPerMm,
    ondone,
  }: {
    eye: 'left' | 'right';
    pxPerMm: number;
    ondone: (logmar: number) => void;
  } = $props();

  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
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

  const TURN: Record<Direction, number> = { right: 0, down: 90, left: 180, up: 270 };

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

<section class="card" aria-labelledby="a-t">
  <header>
    <h2 id="a-t">Near acuity, {eye} eye</h2>
    <span class="eyebrow">Cover your {eye === 'left' ? 'right' : 'left'} eye</span>
  </header>
  <p>
    Keep your {eye} eye {VIEWING_DISTANCE_CM} cm from the screen. Select the direction of the open
    side of the E{touch ? '' : ' with an arrow key or a button'}. If you cannot see it, select one
    direction.
  </p>
  {#if started}
    <div class="stage">
      <div class="chart" style:width="{box}px" style:height="{box}px">
        {#key `${index}-${trial}`}
          <svg
            class="e"
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
        {/key}
      </div>
    </div>
    <p class="small muted num" role="status">
      logMAR {logmarAt(index).toFixed(1)} · trial {trial + 1}/{ACUITY_TRIALS_PER_SIZE}
    </p>
    <div class="pad">
      {#each PAD as d (d)}
        <button class="btn {d}" aria-label={d[0].toUpperCase() + d.slice(1)} onclick={() => answer(d)}>
          <span class="arrow" style:--turn="{TURN[d]}deg"><Icon name="chevron" size={18} /></span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="btns">
      <button class="btn primary" onclick={() => (started = true)}>Start</button>
    </div>
  {/if}
</section>

<style>
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    padding: 16px;
    border-radius: 22px;
    overflow: auto;
    background: radial-gradient(120% 90% at 50% 0%, var(--well-2), var(--bg) 75%);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .stage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.6;
    background-image: radial-gradient(var(--line-2) 1px, transparent 1.2px);
    background-size: 20px 20px;
  }
  .chart {
    position: relative;
    display: grid;
    place-items: center;
  }
  .e {
    animation: e-in var(--t-fast) var(--ease-out);
  }
  path {
    fill: var(--fg);
  }
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 58px);
    grid-template-rows: repeat(3, 50px);
    grid-template-areas:
      '. up .'
      'left . right'
      '. down .';
    gap: 6px;
    justify-content: center;
  }
  @media (pointer: coarse) {
    .pad {
      grid-template-columns: repeat(3, 76px);
      grid-template-rows: repeat(3, 64px);
      gap: 8px;
    }
  }
  .pad .btn {
    padding: 0;
    min-height: 0;
    border-radius: 14px;
  }
  .arrow {
    display: grid;
    place-items: center;
    transform: rotate(var(--turn));
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
  @keyframes e-in {
    from {
      opacity: 0;
    }
  }
</style>
