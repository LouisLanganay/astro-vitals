<script lang="ts">
  import { AMSLER_GRID_SIZE, VIEWING_DISTANCE_CM, type AmslerCell } from '../../lib/types';

  let {
    eye,
    pxPerMm,
    ondone,
  }: {
    eye: 'left' | 'right';
    pxPerMm: number;
    ondone: (distortion: boolean, cells: AmslerCell[]) => void;
  } = $props();

  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const CELL_MM = 5;
  const N = AMSLER_GRID_SIZE;
  const MOVES: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };

  let distortion = $state(false);
  let marked = $state<boolean[]>(Array(N * N).fill(false));
  let cursor = $state(0);

  const count = $derived(marked.filter(Boolean).length);

  function move(e: KeyboardEvent, index: number) {
    const step = MOVES[e.key];
    if (!step) return;
    e.preventDefault();
    const row = Math.min(N - 1, Math.max(0, Math.floor(index / N) + step[0]));
    const col = Math.min(N - 1, Math.max(0, (index % N) + step[1]));
    cursor = row * N + col;
    const cells = (e.currentTarget as HTMLElement).parentElement?.children;
    (cells?.[cursor] as HTMLElement | undefined)?.focus();
  }

  function finish() {
    const cells: AmslerCell[] = [];
    marked.forEach((on, i) => {
      if (on) cells.push({ row: Math.floor(i / N), col: i % N });
    });
    ondone(true, cells);
  }
</script>

<section class="card" aria-labelledby="m-t">
  <header>
    <h2 id="m-t">Amsler grid, {eye} eye</h2>
    <span class="eyebrow">Cover your {eye === 'left' ? 'right' : 'left'} eye</span>
  </header>
  <p>
    Keep your {eye} eye {VIEWING_DISTANCE_CM} cm from the screen. Look only at the dot in the center
    of the grid.
  </p>
  {#if distortion}
    <p class="muted">
      Select each cell where the lines are wavy, broken or absent.{touch
        ? ''
        : ' You can also use the arrow keys and the Space key.'}
    </p>
  {:else}
    <p class="muted">Are lines of the grid wavy, broken or absent in an area?</p>
  {/if}
  <div class="area">
    <div class="frame">
      <div
        class="cells"
        role="group"
        aria-label="Amsler grid"
        style:grid-template-columns="repeat({N}, {CELL_MM * pxPerMm}px)"
        style:grid-auto-rows="{CELL_MM * pxPerMm}px"
      >
        {#each marked as on, i (i)}
          <button
            class="cell"
            class:on
            disabled={!distortion}
            tabindex={i === cursor ? 0 : -1}
            aria-pressed={on}
            aria-label="Row {Math.floor(i / N) + 1}, column {(i % N) + 1}"
            onclick={() => {
              cursor = i;
              marked[i] = !on;
            }}
            onkeydown={(e) => move(e, i)}
          ></button>
        {/each}
      </div>
      <span class="dot"></span>
    </div>
  </div>
  {#if distortion}
    <p class="small muted num" role="status">Marked cells: {count}</p>
    <div class="btns">
      <button class="btn primary" onclick={finish} disabled={count === 0}>Continue</button>
      <button class="btn" onclick={() => ondone(false, [])}>No distortion</button>
    </div>
  {:else}
    <div class="btns">
      <button class="btn" onclick={() => ondone(false, [])}>No, all lines are straight</button>
      <button class="btn" onclick={() => (distortion = true)}>Yes, I see a distortion</button>
    </div>
  {/if}
</section>

<style>
  .area {
    overflow: auto;
    max-width: 100%;
  }
  .frame {
    position: relative;
    width: max-content;
    padding: 14px;
    border-radius: 18px;
    background: var(--bg);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .cells {
    display: grid;
    border-top: 1px solid var(--fg);
    border-left: 1px solid var(--fg);
  }
  .cell {
    position: relative;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--fg);
    border-bottom: 1px solid var(--fg);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
  }
  .cell:disabled {
    cursor: default;
  }
  .cell::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--orange) 60%, transparent);
    opacity: 0;
    transform: scale(0.4);
    transition:
      opacity var(--t-fast) var(--ease-out),
      transform var(--t-fast) var(--ease-spring);
  }
  .cell.on::after {
    opacity: 1;
    transform: none;
  }
  @media (hover: hover) {
    .cell:not(:disabled):hover::after {
      opacity: 0.35;
      transform: scale(0.7);
    }
  }
  @media (hover: hover) {
    .cell.on:not(:disabled):hover::after {
      opacity: 1;
      transform: none;
    }
  }
  .cell:focus-visible {
    outline: 2px solid var(--ui);
    outline-offset: -2px;
    border-radius: 0;
  }
  .dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: var(--fg);
    box-shadow: 0 0 0 2px var(--bg);
    pointer-events: none;
  }
</style>
