<script lang="ts" module>
  export type Feeling = 'mood' | 'stress' | 'tiredness' | 'workload';

  type Mouth = 'grin' | 'smile' | 'soft' | 'flat' | 'low' | 'frown' | 'sad' | 'wavy' | 'open';
  type Eyes = 'wide' | 'open' | 'half' | 'shut';
  type Brows = 'none' | 'tense' | 'sad';
  type Look = [Mouth, Eyes, Brows];

  const GRID = 13;
  const MID = 6;
  const RADIUS = 6.4;
  const STEP = 10;

  const MOUTH: Record<Mouth, [number, number][]> = {
    grin: [[3, 8], [4, 9], [5, 10], [6, 10], [7, 10], [8, 9], [9, 8]],
    smile: [[3, 8], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 8]],
    soft: [[4, 8], [5, 9], [6, 9], [7, 9], [8, 8]],
    flat: [[4, 9], [5, 9], [6, 9], [7, 9], [8, 9]],
    low: [[4, 10], [5, 9], [6, 9], [7, 9], [8, 10]],
    frown: [[3, 10], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 10]],
    sad: [[3, 10], [4, 9], [5, 8], [6, 8], [7, 8], [8, 9], [9, 10]],
    wavy: [[3, 9], [4, 8], [5, 9], [6, 8], [7, 9], [8, 8], [9, 9]],
    open: [[5, 8], [6, 8], [7, 8], [4, 9], [8, 9], [5, 10], [6, 10], [7, 10]],
  };

  const EYES: Record<Eyes, [number, number][]> = {
    wide: [[3, 3], [4, 3], [3, 4], [4, 4], [3, 5], [4, 5]],
    open: [[3, 4], [4, 4], [3, 5], [4, 5]],
    half: [[3, 5], [4, 5]],
    shut: [[2, 5], [3, 5], [4, 5]],
  };

  const BROWS: Record<Brows, [number, number][]> = {
    none: [],
    tense: [[2, 2], [3, 2], [4, 3]],
    sad: [[2, 3], [3, 2], [4, 2]],
  };

  const LOOKS: Record<Feeling, Look[]> = {
    mood: [
      ['sad', 'half', 'sad'],
      ['sad', 'open', 'sad'],
      ['frown', 'open', 'sad'],
      ['frown', 'open', 'none'],
      ['low', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['soft', 'open', 'none'],
      ['smile', 'open', 'none'],
      ['smile', 'wide', 'none'],
      ['grin', 'open', 'none'],
      ['grin', 'wide', 'none'],
    ],
    stress: [
      ['smile', 'open', 'none'],
      ['soft', 'open', 'none'],
      ['soft', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['low', 'open', 'none'],
      ['low', 'open', 'tense'],
      ['frown', 'open', 'tense'],
      ['wavy', 'open', 'tense'],
      ['wavy', 'half', 'tense'],
      ['open', 'open', 'tense'],
    ],
    tiredness: [
      ['soft', 'wide', 'none'],
      ['soft', 'wide', 'none'],
      ['soft', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['flat', 'half', 'none'],
      ['flat', 'half', 'none'],
      ['low', 'half', 'none'],
      ['low', 'shut', 'none'],
      ['low', 'shut', 'sad'],
      ['open', 'shut', 'sad'],
    ],
    workload: [
      ['soft', 'open', 'none'],
      ['soft', 'open', 'none'],
      ['soft', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['flat', 'open', 'none'],
      ['low', 'open', 'none'],
      ['low', 'open', 'tense'],
      ['frown', 'open', 'tense'],
      ['wavy', 'open', 'tense'],
      ['open', 'wide', 'sad'],
    ],
  };

  const DOTS = Array.from({ length: GRID * GRID }, (_, i) => {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    const d = Math.hypot(col - MID, row - MID);
    return { col, row, d };
  }).filter((p) => p.d <= RADIUS);

  const key = (col: number, row: number) => row * GRID + col;

  function lit(look: Look) {
    const [mouth, eyes, brows] = look;
    const on = new Set<number>();
    for (const [c, r] of MOUTH[mouth]) on.add(key(c, r));
    for (const [c, r] of [...EYES[eyes], ...BROWS[brows]]) {
      on.add(key(c, r));
      on.add(key(GRID - 1 - c, r));
    }
    return on;
  }
</script>

<script lang="ts">
  let { feeling, value }: { feeling: Feeling; value: number } = $props();

  const look = $derived(LOOKS[feeling][Math.max(0, Math.min(10, Math.round(value)))]);
  const on = $derived(lit(look));
</script>

<svg class="face" viewBox="0 0 {GRID * STEP} {GRID * STEP}" aria-hidden="true">
  {#each DOTS as p (key(p.col, p.row))}
    <circle
      class:on={on.has(key(p.col, p.row))}
      cx={p.col * STEP + STEP / 2}
      cy={p.row * STEP + STEP / 2}
      r="3"
      style:--o={(1 - 0.55 * (p.d / RADIUS) ** 3).toFixed(2)}
      style:--d="{Math.round(p.d * 9)}ms"
    />
  {/each}
</svg>

<style>
  .face {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  circle {
    fill: var(--dot);
    opacity: var(--o);
    transform-box: fill-box;
    transform-origin: center;
    transition:
      fill var(--t-mid) var(--ease-out) var(--d),
      opacity var(--t-mid) var(--ease-out) var(--d),
      transform var(--t-slow) var(--ease-spring) var(--d);
  }
  circle.on {
    fill: var(--fg);
    opacity: 1;
    transform: scale(1.32);
  }
  @media (prefers-reduced-motion: reduce) {
    circle {
      transition: none;
    }
  }
</style>
