<script lang="ts" module>
  type Cell = [number, number];
  type Mouth = 'grin' | 'smile' | 'soft' | 'flat' | 'low' | 'frown' | 'sad';
  type Eyes = 'wide' | 'open' | 'half' | 'shut';
  type Brows = 'none' | 'flat' | 'tense' | 'sad';

  const GRID = 13;
  const MID = 6;
  const RADIUS = 6.4;
  const STEP = 10;
  const BLINK_MS = 150;

  const MOUTH: Record<Mouth, Cell[]> = {
    grin: [[3, 8], [4, 9], [5, 10], [6, 10], [7, 10], [8, 9], [9, 8]],
    smile: [[3, 8], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 8]],
    soft: [[4, 8], [5, 9], [6, 9], [7, 9], [8, 8]],
    flat: [[4, 9], [5, 9], [6, 9], [7, 9], [8, 9]],
    low: [[4, 10], [5, 9], [6, 9], [7, 9], [8, 10]],
    frown: [[3, 10], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 10]],
    sad: [[3, 10], [4, 9], [5, 8], [6, 8], [7, 8], [8, 9], [9, 10]],
  };
  const MOUTH_BY_MOOD: Mouth[] = [
    'sad', 'sad', 'frown', 'frown', 'low', 'flat', 'soft', 'smile', 'smile', 'grin', 'grin',
  ];

  const EYES: Record<Eyes, Cell[]> = {
    wide: [[3, 3], [4, 3], [3, 4], [4, 4], [3, 5], [4, 5]],
    open: [[3, 4], [4, 4], [3, 5], [4, 5]],
    half: [[3, 5], [4, 5]],
    shut: [[2, 5], [3, 5], [4, 5]],
  };

  const BROWS: Record<Brows, Cell[]> = {
    none: [],
    flat: [[2, 2], [3, 2], [4, 2]],
    tense: [[2, 2], [3, 2], [4, 3]],
    sad: [[2, 3], [3, 2], [4, 2]],
  };

  const DROPS: Cell[][] = [
    [[11, 3], [11, 4]],
    [[1, 3], [1, 4]],
  ];

  const HEAD = Array.from({ length: GRID * GRID }, (_, i) => {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    return { col, row, d: Math.hypot(col - MID, row - MID) };
  }).filter((p) => p.d <= RADIUS);

  const key = (col: number, row: number) => row * GRID + col;
  const level = (v: number) => Math.max(0, Math.min(10, Math.round(v)));
</script>

<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion';

  let {
    mood,
    stress,
    tiredness,
    workload,
  }: { mood: number; stress: number; tiredness: number; workload: number } = $props();

  let blink = $state(false);

  const brows = $derived<Brows>(
    level(stress) >= 7 ? 'tense' : level(stress) >= 4 ? 'flat' : level(mood) <= 2 ? 'sad' : 'none',
  );
  const eyes = $derived.by<Eyes>(() => {
    const t = level(tiredness);
    if (t >= 8 || blink) return 'shut';
    if (t >= 5) return 'half';
    return t <= 1 && brows === 'none' ? 'wide' : 'open';
  });
  const drops = $derived(level(workload) >= 9 ? 2 : level(workload) >= 6 ? 1 : 0);
  const on = $derived.by(() => {
    const cells = new Set<number>();
    for (const [c, r] of MOUTH[MOUTH_BY_MOOD[level(mood)]]) cells.add(key(c, r));
    for (const [c, r] of [...EYES[eyes], ...BROWS[brows]]) {
      cells.add(key(c, r));
      cells.add(key(GRID - 1 - c, r));
    }
    return cells;
  });

  $effect(() => {
    if (prefersReducedMotion.current) return;
    let open: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    const plan = () => {
      next = setTimeout(() => {
        blink = true;
        open = setTimeout(() => {
          blink = false;
          plan();
        }, BLINK_MS);
      }, 2600 + Math.random() * 2800);
    };
    plan();
    return () => {
      clearTimeout(open);
      clearTimeout(next);
    };
  });
</script>

<svg class="face" viewBox="0 0 {GRID * STEP} {GRID * STEP}" aria-hidden="true">
  {#each HEAD as p (key(p.col, p.row))}
    <circle
      class:on={on.has(key(p.col, p.row))}
      cx={p.col * STEP + STEP / 2}
      cy={p.row * STEP + STEP / 2}
      r="3"
      style:--o={(1 - 0.55 * (p.d / RADIUS) ** 3).toFixed(2)}
      style:--d="{Math.round(p.d * 7)}ms"
    />
  {/each}
  {#each DROPS as drop, i (i)}
    {#each drop as [col, row], k (k)}
      <circle
        class="drop"
        class:on={drops > i}
        cx={col * STEP + STEP / 2}
        cy={row * STEP + STEP / 2}
        r={k === 0 ? 3 : 4.3}
      />
    {/each}
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
  circle.drop {
    --d: 0ms;
    fill: var(--ui);
    opacity: 0;
    transform: translateY(-5px) scale(0.4);
  }
  circle.drop.on {
    fill: var(--ui);
    opacity: 1;
    transform: none;
    animation: drip 2.6s var(--ease-in-out) 600ms infinite;
  }
  @keyframes drip {
    0%,
    58% {
      transform: none;
      opacity: 1;
    }
    84% {
      transform: translateY(8px);
      opacity: 0;
    }
    85% {
      transform: translateY(-5px);
      opacity: 0;
    }
    100% {
      transform: none;
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    circle {
      transition: none;
    }
    circle.drop.on {
      animation: none;
    }
  }
</style>
