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

<div class="card amsler">
  <h2>Amsler grid, {eye} eye</h2>
  <p>
    Cover your {eye === 'left' ? 'right' : 'left'} eye. Keep your {eye} eye
    {VIEWING_DISTANCE_CM} cm from the screen. Look only at the dot in the center of the grid.
  </p>
  {#if distortion}
    <p>
      Select each cell where the lines are wavy, broken or absent. Use the mouse, or use the arrow
      keys and the Space key. Then continue.
    </p>
  {:else}
    <p>Are lines of the grid wavy, broken or absent in an area?</p>
  {/if}
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
  {#if distortion}
    <p class="muted" role="status">Marked cells: {count}</p>
    <div class="row">
      <button class="btn primary" onclick={finish}>Continue</button>
      <button class="btn" onclick={() => ondone(false, [])}>No distortion</button>
    </div>
  {:else}
    <div class="row">
      <button class="btn" onclick={() => ondone(false, [])}>No, all lines are straight</button>
      <button class="btn" onclick={() => (distortion = true)}>Yes, I see a distortion</button>
    </div>
  {/if}
</div>

<style>
  .amsler {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }
  .frame {
    position: relative;
    padding: 0.75rem;
    background: #fff;
    border-radius: var(--radius);
  }
  .cells {
    display: grid;
    border-top: 1px solid #000;
    border-left: 1px solid #000;
  }
  .cell {
    padding: 0;
    border: 0;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    border-radius: 0;
    background: #fff;
    cursor: pointer;
  }
  .cell:disabled {
    cursor: default;
  }
  .cell.on {
    background: #1c6fb8;
  }
  .cell:focus-visible {
    outline: 3px solid #c9591a;
    outline-offset: -3px;
  }
  .dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: #000;
    box-shadow: 0 0 0 2px #fff;
    pointer-events: none;
  }
</style>
