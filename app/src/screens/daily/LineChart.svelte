<script lang="ts">
  import type { SeriesPoint } from '../../lib/types';
  import { num } from './num';

  let {
    points,
    baseline,
    label,
  }: { points: SeriesPoint[]; baseline: number | null; label: string } = $props();

  const W = 600;
  const H = 220;
  const LEFT = 48;
  const RIGHT = 12;
  const TOP = 12;
  const BOTTOM = 28;

  const chart = $derived.by(() => {
    const ys = points.flatMap((p) => [p.value, p.mean_7d]).filter((v) => v !== null);
    if (ys.length === 0) return null;
    if (baseline !== null) ys.push(baseline);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const first = points[0].mission_day;
    const last = points[points.length - 1].mission_day;
    const span = Math.max(1, last - first);
    const x = (day: number) => LEFT + ((day - first) / span) * (W - LEFT - RIGHT);
    const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (H - TOP - BOTTOM);
    const trace = (key: 'value' | 'mean_7d') => {
      let d = '';
      let pen = false;
      const dots: { cx: number; cy: number }[] = [];
      points.forEach((p, i) => {
        const v = p[key];
        if (v === null) {
          pen = false;
          return;
        }
        const cx = x(p.mission_day);
        const cy = y(v);
        d += `${pen ? 'L' : 'M'}${cx.toFixed(1)} ${cy.toFixed(1)}`;
        pen = true;
        if (points[i - 1]?.[key] == null && points[i + 1]?.[key] == null) dots.push({ cx, cy });
      });
      return { d, dots };
    };
    return {
      lo,
      hi,
      first,
      last,
      value: trace('value'),
      mean: trace('mean_7d'),
      baselineY: baseline === null ? null : y(baseline),
      launchX: first < 0 && last >= 0 ? x(0) : null,
    };
  });
</script>

{#if chart}
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="{label}: line chart across the mission">
    <rect class="frame" x={LEFT} y={TOP} width={W - LEFT - RIGHT} height={H - TOP - BOTTOM} />
    {#if chart.launchX !== null}
      <line class="launch" x1={chart.launchX} x2={chart.launchX} y1={TOP} y2={H - BOTTOM} />
      <text x={chart.launchX} y={H - 8} text-anchor="middle">Launch</text>
    {/if}
    {#if chart.baselineY !== null}
      <line class="baseline" x1={LEFT} x2={W - RIGHT} y1={chart.baselineY} y2={chart.baselineY} />
    {/if}
    <path class="value" d={chart.value.d} />
    {#each chart.value.dots as dot, i (i)}
      <circle class="value-dot" cx={dot.cx} cy={dot.cy} r="2.5" />
    {/each}
    <path class="mean" d={chart.mean.d} />
    {#each chart.mean.dots as dot, i (i)}
      <circle class="mean-dot" cx={dot.cx} cy={dot.cy} r="3" />
    {/each}
    <text x={LEFT - 6} y={TOP + 4} text-anchor="end">{num(chart.hi)}</text>
    <text x={LEFT - 6} y={H - BOTTOM} text-anchor="end">{num(chart.lo)}</text>
    <text x={LEFT} y={H - 8}>Day {chart.first}</text>
    <text x={W - RIGHT} y={H - 8} text-anchor="end">Day {chart.last}</text>
  </svg>
  <ul class="legend">
    <li>
      <svg viewBox="0 0 28 8" width="28" height="8" aria-hidden="true">
        <path class="value" d="M0 4H28" />
      </svg>
      Daily value
    </li>
    <li>
      <svg viewBox="0 0 28 8" width="28" height="8" aria-hidden="true">
        <path class="mean" d="M0 4H28" />
      </svg>
      7-day mean
    </li>
    <li>
      <svg viewBox="0 0 28 8" width="28" height="8" aria-hidden="true">
        <path class="baseline" d="M0 4H28" />
      </svg>
      {baseline === null ? 'Baseline median: not available' : `Baseline median: ${num(baseline)}`}
    </li>
  </ul>
{:else}
  <p class="muted">No data.</p>
{/if}

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    fill: none;
  }
  .frame {
    stroke: var(--border);
  }
  .value {
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .value-dot {
    fill: var(--accent);
  }
  .mean {
    stroke: var(--text);
    stroke-width: 2.75;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .mean-dot {
    fill: var(--text);
  }
  .baseline {
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 6 4;
  }
  .launch {
    stroke: var(--border);
    stroke-dasharray: 2 3;
  }
  text {
    fill: var(--muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin: 0.4rem 0 0;
    padding: 0;
    list-style: none;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend svg {
    width: 28px;
  }
</style>
