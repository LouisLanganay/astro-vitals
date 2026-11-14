<script lang="ts">
  import { STATE_LABEL } from './labels';
  import { LEVELS, type IndicatorState } from './types';

  let { state: level, width = 168 }: { state: IndicatorState; width?: number } = $props();

  const R = 54;
  const C = 70;
  const START = 135;
  const GAP = 8;
  const SEG = (270 - GAP * 3) / 4;

  const point = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(C + R * Math.cos(a)).toFixed(2)} ${(C + R * Math.sin(a)).toFixed(2)}`;
  };
  const arcs = LEVELS.map((_, k) => {
    const s = START + k * (SEG + GAP);
    return `M${point(s)} A${R} ${R} 0 0 1 ${point(s + SEG)}`;
  });

  const index = $derived(level === 'not_enough_data' ? -1 : LEVELS.indexOf(level));

  let mounted = $state(false);
  $effect(() => {
    const id = requestAnimationFrame(() => (mounted = true));
    return () => cancelAnimationFrame(id);
  });
</script>

<div class="gauge" data-lv={level} style:width="{width}px">
  <svg viewBox="0 0 140 124" role="img" aria-label="Level {index + 1} of 4: {STATE_LABEL[level]}">
    {#each arcs as d, k (k)}
      <path class="track" {d} />
      <path
        class="fill"
        class:past={k < index}
        class:now={k === index}
        {d}
        pathLength="1"
        style:--d="{k * 60}ms"
        style:stroke-dashoffset={mounted && k <= index ? 0 : 1}
        filter={k === index ? 'url(#glow)' : undefined}
      />
    {/each}
    {#key level}
      <text class="g1" x="70" y="70" text-anchor="middle">
        {index >= 0 ? STATE_LABEL[level] : 'No data'}
      </text>
    {/key}
    <text class="g2" x="70" y="88" text-anchor="middle">
      {index >= 0 ? `level ${index + 1} of 4` : 'no level yet'}
    </text>
  </svg>
</div>

<style>
  .gauge {
    flex: none;
    max-width: 100%;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  path {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
  }
  .track {
    stroke: var(--well-2);
  }
  .fill {
    stroke-dasharray: 1 1;
    stroke: transparent;
    transition:
      stroke-dashoffset 420ms var(--ease-out) var(--d),
      stroke 300ms var(--ease-out);
  }
  .fill.past {
    stroke: color-mix(in srgb, var(--lc) 34%, var(--well-2));
  }
  .fill.now {
    stroke: var(--lc);
  }
  .g1 {
    font-family: var(--font-body);
    font-size: 14.5px;
    font-weight: 500;
    fill: var(--lc);
    letter-spacing: -0.01em;
    animation: fade-in 300ms var(--ease-out) both;
  }
  .g2 {
    font-family: var(--font-body);
    font-size: 11px;
    fill: var(--muted);
  }
</style>
