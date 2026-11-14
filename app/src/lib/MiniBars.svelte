<script lang="ts">
  import type { IndicatorState } from './types';

  let {
    values,
    baseline = null,
    state = 'ok',
    label,
    width = 200,
    height = 96,
  }: {
    values: (number | null)[];
    baseline?: number | null;
    state?: IndicatorState;
    label: string;
    width?: number;
    height?: number;
  } = $props();

  const FLAGGED = ['self_care', 'tell_cmo', 'flight_surgeon'];

  const top = $derived(
    Math.max(...values.filter((v): v is number => v != null), baseline ?? 0, 1e-9) * 1.08,
  );
  const last = $derived(values.reduce<number>((acc, v, k) => (v != null ? k : acc), -1));
  const step = $derived(width / Math.max(values.length, 1));
  const barW = $derived(Math.min(22, step * 0.62));
  const lit = $derived(FLAGGED.includes(state) ? `url(#g-${state})` : 'url(#g-ui)');
  const baseY = $derived(baseline == null ? null : height - (baseline / top) * height);
</script>

<svg class="bars" viewBox="0 0 {width} {height}" role="img" aria-label={label}>
  {#each values as v, k (k)}
    {@const x = k * step + step / 2 - barW / 2}
    {#if v == null}
      <rect {x} y={height - 3} width={barW} height="3" rx="1.5" fill="var(--well-2)" />
    {:else}
      {@const h = Math.max(4, (v / top) * height)}
      <rect
        class="bar"
        class:lit={k === last}
        {x}
        y={height - h}
        width={barW}
        height={h}
        rx={Math.min(5, barW / 2)}
        fill={k === last ? lit : 'url(#g-bar)'}
        style:--i={k}
      />
    {/if}
  {/each}
  {#if baseY != null}
    <line
      class="base"
      x1="0"
      x2={width}
      y1={baseY}
      y2={baseY}
      stroke="var(--muted)"
      stroke-width="1"
      stroke-dasharray="3 4"
      opacity=".75"
    />
  {/if}
</svg>

<style>
  .bars {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .bar {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: grow 420ms var(--ease-out) both;
    animation-delay: calc(var(--i) * 28ms);
  }
  .bar.lit {
    animation-duration: 520ms;
    animation-timing-function: var(--ease-spring);
  }
  .base {
    animation: fade-in 400ms var(--ease-out) 200ms both;
  }
  @keyframes grow {
    from {
      transform: scaleY(0);
    }
    to {
      transform: scaleY(1);
    }
  }
</style>
